# ICD AI SaaS

This project is a lightweight SaaS demo that lets users upload the **ICD-10-CM 2025** PDF and chat with it using OpenAI. It includes a 24-hour free trial, a $9/month subscription tier, and Stripe integration hooks.

## Features
- Express backend with upload and chat endpoints
- PDF parsing and OpenAI embeddings (text-embedding-3-small)
- Simple RAG-style similarity search over document chunks
- In-memory 24h trial tracking with optional Stripe checkout
- Minimal HTML frontend for uploading and chatting

## Getting started
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create an `.env` file**
   ```bash
   OPENAI_API_KEY=your-openai-key
   PORT=3000
   STRIPE_SECRET_KEY=sk_test_your_key   # optional
   STRIPE_PRICE_ID=price_your_id        # required if using Stripe
   CHECKOUT_SUCCESS_URL=https://example.com/success
   CHECKOUT_CANCEL_URL=https://example.com/cancel
   ```
   If Stripe variables are missing, the server will still run and mark users as subscribed in demo mode when hitting the checkout endpoint.
3. **Start the server**
   ```bash
   npm start
   ```
4. **Use the app**
   - Visit `http://localhost:3000` to open the frontend.
   - Enter a user ID (used for trial tracking) and upload your ICD-10-CM 2025 PDF.
   - Ask questions in the chat box.

## API overview
- `POST /upload` – multipart/form-data with `file` (PDF). Requires `X-User-Id` header. Returns a `documentId`.
- `POST /chat` – JSON `{ documentId, message }`. Requires `X-User-Id` header. Returns model answer using document context.
- `GET /trial-status` – returns trial/subscription status for the provided user.
- `POST /create-checkout-session` – creates a Stripe checkout session when Stripe is configured (otherwise marks the user subscribed for demo purposes).
- `GET /health` – health check.

## Notes
- All storage is in-memory for simplicity; restart clears uploads/trials.
- The vector similarity uses cosine distance over OpenAI embeddings and keeps the top 4 chunks for context.
- Intended for demo and local experimentation; harden auth, persistence, and billing flows before production use.
