const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Stripe = require('stripe');
const path = require('path');
const Fuse = require('./local-fuse');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const DAY_MS = 24 * 60 * 60 * 1000;
const userStore = new Map();
// Map<userId, { chunks: Array<{ id, text }>, searchIndex?: Fuse }>
const userIndexes = new Map();

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

function normalizeTokens(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function splitIntoChunks(text, minSize = 800, maxSize = 1200) {
  const segments = text
    .replace(/\r/g, '')
    .split(/\n{2,}|\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';

  const pushChunk = (chunkText) => {
    const trimmed = chunkText.trim();
    if (trimmed) chunks.push(trimmed);
  };

  for (const segment of segments) {
    const candidate = (current ? `${current} ${segment}` : segment).trim();
    if (candidate.length <= maxSize) {
      current = candidate;
      continue;
    }

    if (current.length >= minSize) {
      pushChunk(current);
      current = segment;
    } else {
      current = candidate;
    }

    while (current.length > maxSize) {
      pushChunk(current.slice(0, maxSize));
      current = current.slice(maxSize);
    }
  }

  if (current) {
    pushChunk(current);
  }

  return chunks;
}

function buildLocalSearch(chunks) {
  return new Fuse(chunks, {
    includeScore: true,
    threshold: 0.45,
    keys: ['text'],
  });
}

app.post('/upload-pdf', requireAccess, upload.single('file'), async (req, res) => {
  try {
    const user = ensureUser(req);
    if (!user) {
      return res.status(400).json({ error: 'userId is required via X-User-Id header or request body' });
    }

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

    const chunks = splitIntoChunks(text)
      .filter(Boolean)
      .map((chunkText, idx) => ({
        id: idx,
        text: chunkText,
      }));

    const searchIndex = buildLocalSearch(chunks);
    userIndexes.set(user.id, { chunks, searchIndex });

    res.json({
      message: 'PDF processed successfully',
      chunks: chunks.length,
      fileName: req.file.originalname,
    });
  } catch (error) {
    console.error('Upload error', error);
    res.status(500).json({ error: 'Failed to process PDF upload', details: error.message });
  }
});

app.post('/chat', requireAccess, async (req, res) => {
  try {
    const { userId, question } = req.body;
    if (!userId || !question) {
      return res.status(400).json({ error: 'userId and question are required' });
    }

    const index = userIndexes.get(userId);
    if (!index || !index.chunks || index.chunks.length === 0) {
      return res.status(400).json({ error: 'No PDF uploaded for this user. Upload your ICD-10-CM PDF first.' });
    }

    const questionTokens = normalizeTokens(question);
    if (questionTokens.length === 0) {
      return res.status(400).json({ error: 'Question cannot be empty.' });
    }

    const fuseIndex = index.searchIndex || buildLocalSearch(index.chunks);
    if (!index.searchIndex) {
      userIndexes.set(userId, { ...index, searchIndex: fuseIndex });
    }

    const scored = fuseIndex
      .search(question)
      .slice(0, 3)
      .map((result, idx) => ({
        ...result.item,
        score: typeof result.score === 'number' ? Number((1 - result.score).toFixed(3)) : 0,
        rank: idx + 1,
      }));

    if (scored.length === 0) {
      return res.json({
        answer: "I couldn't find anything relevant. Try searching by diagnosis name or code.",
        snippets: [],
      });
    }

    const snippets = scored.map((item) => {
      let text = item.text.trim();
      if (text.length > 500) {
        text = `${text.slice(0, 500)}…`;
      }
      return {
        id: item.id,
        label: `Snippet #${item.rank}`,
        text,
        score: item.score,
      };
    });

    const answerLines = [
      'Here are the most relevant ICD-10-CM snippets I found:',
      ...snippets.map((s) => `${s.label}: ${s.text}`),
    ];

    res.json({ answer: answerLines.join('\n\n'), snippets });
  } catch (error) {
    console.error('Chat error', error);
    res.status(500).json({ error: 'Failed to complete chat request', details: error.message });
  }
});

app.get('/test-search', requireAccess, (req, res) => {
  const user = ensureUser(req);
  if (!user) {
    return res.status(400).json({ error: 'userId is required via X-User-Id header or request body' });
  }

  const query = (req.query.q || '').toString();
  if (!query.trim()) {
    return res.status(400).json({ error: 'q query parameter is required' });
  }

  const index = userIndexes.get(user.id);
  if (!index || !index.chunks || index.chunks.length === 0) {
    return res.status(400).json({ error: 'No PDF uploaded for this user. Upload your ICD-10-CM PDF first.' });
  }

  const fuseIndex = index.searchIndex || buildLocalSearch(index.chunks);
  if (!index.searchIndex) {
    userIndexes.set(user.id, { ...index, searchIndex: fuseIndex });
  }

  const results = fuseIndex
    .search(query)
    .slice(0, 10)
    .map((entry) => ({
      id: entry.item.id,
      text: entry.item.text,
      score: entry.score,
    }));

  res.json({ query, results });
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
