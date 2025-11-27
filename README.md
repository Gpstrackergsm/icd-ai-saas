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
- `GET /api/search?q=term` – Returns ICD-10-CM code matches with descriptions and chapters.
- `GET /api` – Health/status check for deployments.

## Notes
- Searches stay on the device; no file uploads or external APIs are used.
- Designed for Vercel serverless deployment with static frontend assets in `public/`.
