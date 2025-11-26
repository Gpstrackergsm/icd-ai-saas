const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const Stripe = require('stripe');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const DAY_MS = 24 * 60 * 60 * 1000;
const userStore = new Map();
const documents = new Map();

function ensureUser(req) {
  const userId = req.headers['x-user-id'] || req.body.userId || req.query.userId;
  if (!userId) return null;
  if (!userStore.has(userId)) {
    userStore.set(userId, { startedAt: Date.now(), subscribed: false });
  }
  return { id: userId, ...userStore.get(userId) };
}

function requireAccess(req, res, next) {
  const user = ensureUser(req);
  if (!user) {
    return res.status(400).json({ error: 'userId is required via X-User-Id header or request body' });
  }
  const expiresAt = user.startedAt + DAY_MS;
  if (!user.subscribed && Date.now() > expiresAt) {
    return res.status(402).json({ error: 'Trial expired. Please subscribe to continue.', expiresAt });
  }
  next();
}

async function embedText(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, idx) => sum + val * b[idx], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

function chunkText(text, chunkSize = 800, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

app.post('/upload', requireAccess, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF uploads are supported' });
    }

    const parsed = await pdfParse(req.file.buffer);
    const text = parsed.text || '';
    if (!text.trim()) {
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    const docId = uuidv4();
    const chunks = chunkText(text);
    const embeddings = [];

    for (const chunk of chunks) {
      const embedding = await embedText(chunk);
      embeddings.push({ id: uuidv4(), text: chunk, embedding });
    }

    documents.set(docId, { fileName: req.file.originalname, embeddings });

    res.json({
      documentId: docId,
      chunks: embeddings.length,
      fileName: req.file.originalname,
    });
  } catch (error) {
    console.error('Upload error', error);
    res.status(500).json({ error: 'Failed to process PDF upload', details: error.message });
  }
});

app.post('/chat', requireAccess, async (req, res) => {
  try {
    const { documentId, message } = req.body;
    if (!documentId || !message) {
      return res.status(400).json({ error: 'documentId and message are required' });
    }
    const doc = documents.get(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found. Upload a PDF first.' });
    }

    const queryEmbedding = await embedText(message);
    const ranked = doc.embeddings
      .map((item) => ({
        ...item,
        score: cosineSimilarity(queryEmbedding, item.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    const context = ranked.map((r) => r.text).join('\n---\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that answers questions using the provided ICD-10-CM 2025 context. If the answer is not in the context, say you do not have enough information.',
        },
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${message}` },
      ],
      temperature: 0.2,
    });

    res.json({ answer: completion.choices[0].message.content, references: ranked.map((r) => r.id) });
  } catch (error) {
    console.error('Chat error', error);
    res.status(500).json({ error: 'Failed to complete chat request', details: error.message });
  }
});

app.get('/trial-status', (req, res) => {
  const user = ensureUser(req) || { id: null, startedAt: null, subscribed: false };
  const expiresAt = user.startedAt ? user.startedAt + DAY_MS : null;
  res.json({
    userId: user.id,
    startedAt: user.startedAt,
    expiresAt,
    subscribed: user.subscribed,
    active: user.subscribed || (expiresAt && Date.now() < expiresAt),
  });
});

app.post('/create-checkout-session', async (req, res) => {
  const user = ensureUser(req);
  if (!user) return res.status(400).json({ error: 'userId is required' });

  if (!stripe || !process.env.STRIPE_PRICE_ID) {
    userStore.set(user.id, { ...userStore.get(user.id), subscribed: true });
    return res.json({
      message: 'Stripe not configured in this environment. Marking user as subscribed for demo.',
      subscribed: true,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: req.body.email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: process.env.CHECKOUT_SUCCESS_URL || 'https://example.com/success',
      cancel_url: process.env.CHECKOUT_CANCEL_URL || 'https://example.com/cancel',
      metadata: { userId: user.id },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error', error);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`icd-ai-saas server listening on port ${PORT}`);
});
