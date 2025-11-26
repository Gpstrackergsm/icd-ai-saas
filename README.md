# ICD Smart Search

Upload an ICD-10-CM 2025 PDF and use a smart local search engine to find diagnosis codes and descriptions. No external AI API required.

The app runs entirely in Node.js + Express with in-memory indexing per user, a minimal HTML frontend, and optional Stripe hooks for billing.

## Features
- Express backend with upload and search endpoints
- PDF parsing with simple keyword-based retrieval over indexed chunks
- In-memory 24h trial tracking with optional Stripe checkout
- Minimal HTML frontend for uploading and searching

## How to run locally
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Optional `.env` file**
   ```bash
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
4. **Open the app**
   - Visit `http://localhost:3000` to load the landing page and app widget.
   - Enter a user ID (used for trial tracking) and upload your ICD-10-CM 2025 PDF.
   - Ask questions in the search box and review the returned snippets.

## API overview
- `POST /upload-pdf` – multipart/form-data with `file` (PDF). Requires `X-User-Id` header. Indexes chunks for that user.
- `POST /chat` – JSON `{ userId, question }`. Requires `X-User-Id` header. Returns ranked snippets from the indexed PDF.
- `GET /trial-status` – returns trial/subscription status for the provided user.
- `POST /create-checkout-session` – creates a Stripe checkout session when Stripe is configured (otherwise marks the user subscribed for demo purposes).
- `GET /health` – health check.

## Notes
- All storage is in-memory for simplicity; restart clears uploads/trials.
- Chunking stays around 800–1200 characters and uses simple token overlap scoring for relevance.
- Intended for demo and local experimentation; harden auth, persistence, and billing flows before production use.
