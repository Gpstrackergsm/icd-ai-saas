class Fuse {
  constructor(list, options = {}) {
    this.list = Array.isArray(list) ? list : [];
    this.options = {
      includeScore: options.includeScore === true,
      threshold: typeof options.threshold === 'number' ? options.threshold : 0.6,
      keys: Array.isArray(options.keys) ? options.keys : [],
    };
  }

  static levenshtein(a, b) {
    const lenA = a.length;
    const lenB = b.length;
    if (lenA === 0) return lenB;
    if (lenB === 0) return lenA;

    const matrix = Array.from({ length: lenB + 1 }, (_, i) => new Array(lenA + 1).fill(0));
    for (let i = 0; i <= lenB; i++) matrix[i][0] = i;
    for (let j = 0; j <= lenA; j++) matrix[0][j] = j;

    for (let i = 1; i <= lenB; i++) {
      for (let j = 1; j <= lenA; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }

    return matrix[lenB][lenA];
  }

  static scoreText(pattern, text) {
    const normalizedPattern = pattern.toLowerCase().trim();
    const normalizedText = text.toLowerCase();
    if (!normalizedPattern) return 1;
    if (normalizedText.includes(normalizedPattern)) return 0;

    const tokens = normalizedText.split(/\s+/).filter(Boolean);
    let bestScore = 1;

    for (const token of tokens) {
      const distance = Fuse.levenshtein(normalizedPattern, token);
      const tokenScore = distance / Math.max(normalizedPattern.length, token.length);
      if (tokenScore < bestScore) bestScore = tokenScore;
      if (bestScore === 0) break;
    }

    if (bestScore === 1 && normalizedText.length > 0) {
      const windowSize = normalizedPattern.length;
      for (let i = 0; i < normalizedText.length - windowSize; i++) {
        const segment = normalizedText.slice(i, i + windowSize);
        const distance = Fuse.levenshtein(normalizedPattern, segment);
        const segmentScore = distance / normalizedPattern.length;
        if (segmentScore < bestScore) bestScore = segmentScore;
      }
    }

    return bestScore;
  }

  search(pattern) {
    const results = [];
    const query = String(pattern || '').trim();
    if (!query) return results;

    for (const item of this.list) {
      const targets = this.options.keys.length
        ? this.options.keys.map((key) => (item && item[key] ? String(item[key]) : '')).filter(Boolean)
        : [String(item || '')];

      if (targets.length === 0) continue;

      let score = 1;
      for (const target of targets) {
        const targetScore = Fuse.scoreText(query, target);
        if (targetScore < score) score = targetScore;
      }

      if (score <= this.options.threshold) {
        results.push(this.options.includeScore ? { item, score } : { item });
      }
    }

    return results.sort((a, b) => (a.score || 0) - (b.score || 0));
  }
}

module.exports = Fuse;
