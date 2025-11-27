import { searchIcd } from "../icd-search";

export default function handler(req, res) {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "Missing query" });

  const terms = q
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);

  const seenCodes = new Set();
  const uniqueResults = [];

  terms.forEach((term) => {
    const entries = Array.isArray(searchIcd(term)) ? searchIcd(term) : [];

    entries.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;

      const code = (entry.code ?? "").toString().trim();
      const description = (entry.description ?? "").toString().trim();
      const chapter = (entry.chapter ?? "").toString().trim();
      const normalizedCode = code.toLowerCase();

      if (!code || !description || seenCodes.has(normalizedCode)) return;

      seenCodes.add(normalizedCode);
      uniqueResults.push({ code, description, chapter });
    });
  });

  res.json({
    results: uniqueResults,
    meta: {
      terms,
      totalUnique: uniqueResults.length,
    },
  });
}
