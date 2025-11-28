# ICD Smart Search

ICD Smart Search is a browser-first, commercial-grade landing page and instant ICD-10-CM 2025 search experience. Type any diagnosis or code and get the official match immediately—no uploads, no training, and no manual lookups.

## What’s included
- Production-ready landing page tailored for ICD-10-CM 2025
- Instant client-side search backed by the official standard
- Clear pricing, trust signals, and testimonials for conversion

## Running locally
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the dev server**
   ```bash
   npm start
   ```
3. **Open the app**
   - Visit `http://localhost:3000`.
   - Start typing diagnoses or codes to see instant ICD-10-CM results.

## API overview
- `GET /api/router?action=search&q=term` – Returns ICD-10-CM code matches with descriptions and chapters.
- `GET /api/router?action=index` – Health/status check for deployments.
- `POST /api/router?action=webhook` – Stripe webhook endpoint for subscription lifecycle events.
- `GET /api/router?action=check-access&email=` – Server-side subscription validation used by the client.

## Notes
- Searches stay on the device; no file uploads or external APIs are used.
- Designed for Vercel serverless deployment with static frontend assets in `public/`.

## Environment variables
- `STRIPE_SECRET_KEY` – Required for server-side Stripe operations.
- `STRIPE_WEBHOOK_SECRET` – Used to verify webhook signatures from Stripe.
- `ADMIN_USER` (or `ADMIN_USERNAME`) – Username for the protected admin dashboard and stats endpoints.
- `ADMIN_PASS` (or `ADMIN_PASSWORD`) – Password for the protected admin dashboard and stats endpoints.
- `BASE_URL` – Public base URL used for redirects and webhook validation.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` – SMTP credentials for transactional emails.

## Subscription setup
1. Copy `.env.example` to `.env` and add your LIVE Stripe keys, webhook secret, SMTP credentials, and `BASE_URL`.
2. Configure your Stripe webhook endpoint to `https://<your-domain>/api/router?action=webhook` and subscribe to:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Use the live price ID `price_1SYBdVBJD92CE7dk5CUQbatL` for every checkout session.
4. Ensure SMTP is configured to send activation, failure, and cancellation emails.
