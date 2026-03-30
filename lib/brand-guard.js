const brandProfileUtils = require('./brand-profile.js');

function splitLines(value) {
  return String(value || '')
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniq(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function extractQuotedTerms(line) {
  const matches = [];
  const regex = /["“”'‘’]([^"“”'‘’]{2,20})["“”'‘’]/g;
  let match = regex.exec(line);
  while (match) {
    matches.push(match[1].trim());
    match = regex.exec(line);
  }
  return matches;
}

function lineKeywords(line) {
  return uniq(
    line
      .replace(/（[^）]*）/g, ' ')
      .replace(/\([^)]*\)/g, ' ')
      .split(/[\s,，、;；:：\-\/]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2 && !/^禁止|使用|系列|适用|代表|型号|品牌官网|产品页$/.test(item))
  );
}

function matchesLine(content, line) {
  if (!line) return false;
  if (content.includes(line)) return true;
  const keywords = lineKeywords(line);
  if (keywords.length === 0) return false;
  const hitCount = keywords.filter((keyword) => content.includes(keyword)).length;
  return hitCount >= Math.min(2, keywords.length);
}

function detectReferences(content, profile) {
  const references = [];
  const normalized = brandProfileUtils.normalizeBrandProfilePayload(profile || {});

  if (normalized.name && content.includes(normalized.name.replace(/（.*?）/g, '').trim())) {
    references.push({ type: 'brand', label: `品牌名称：${normalized.name}`, excerpt: normalized.name });
  }

  for (const line of splitLines(normalized.productLines)) {
    if (matchesLine(content, line)) {
      references.push({ type: 'product', label: `产品线：${line}`, excerpt: line });
    }
  }

  for (const line of splitLines(normalized.scenes)) {
    if (matchesLine(content, line)) {
      references.push({ type: 'scene', label: `应用场景：${line}`, excerpt: line });
    }
  }

  return references;
}

function detectRisks(content, profile) {
  const normalized = brandProfileUtils.normalizeBrandProfilePayload(profile || {});
  const risks = [];

  for (const line of splitLines(normalized.forbidden)) {
    const terms = uniq([...extractQuotedTerms(line), ...lineKeywords(line)]);
    for (const term of terms) {
      if (term && content.includes(term)) {
        risks.push({ term, reason: line });
      }
    }
  }

  return risks;
}

function analyzeBrandUsage(content, profile) {
  const text = String(content || '');
  const normalizedProfile = brandProfileUtils.normalizeBrandProfilePayload(profile || {});
  const references = detectReferences(text, normalizedProfile);
  const risks = detectRisks(text, normalizedProfile);

  return {
    references,
    risks,
    referenceCount: references.length,
    riskCount: risks.length,
    suggestedSources: splitLines(normalizedProfile.sources).slice(0, 5),
  };
}

module.exports = {
  analyzeBrandUsage,
};
