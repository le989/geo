const assert = require('node:assert/strict');
const review = require('../lib/content-review.js');

const {
  REVIEW_STATUS,
  normalizeReviewResult,
  buildPublishChecks,
} = review;

const normalized = normalizeReviewResult({
  status: 'pass',
  score: 88,
  summary: '整体可发布',
  issues: ['无明显风险'],
  suggestions: ['可补充一个应用案例'],
  risks: [],
});

assert.equal(normalized.status, REVIEW_STATUS.pass);
assert.equal(normalized.score, 88);
assert.equal(Array.isArray(normalized.issues), true);
assert.equal(Array.isArray(normalized.suggestions), true);
assert.equal(Array.isArray(normalized.risks), true);

const fallback = normalizeReviewResult('not-json');
assert.equal(fallback.status, REVIEW_STATUS.revise);
assert.equal(typeof fallback.summary, 'string');
assert.equal(Array.isArray(fallback.issues), true);
assert.equal(Array.isArray(fallback.suggestions), true);
assert.equal(Array.isArray(fallback.risks), true);

const checks = buildPublishChecks({
  title: '太短',
  content: '这是一段没有品牌名的正文。',
  brandCheck: {
    referenceCount: 0,
    riskCount: 1,
    risks: [{ term: '最强', reason: '禁止使用“最强”' }],
  },
});

assert.equal(typeof checks.status, 'string');
assert.equal(Array.isArray(checks.items), true);
assert.equal(checks.items.some((item) => item.key === 'title_length'), true);
assert.equal(checks.items.some((item) => item.key === 'brand_reference'), true);
assert.equal(checks.items.some((item) => item.key === 'brand_risk'), true);
assert.equal(checks.items.some((item) => item.level === 'fail'), true);
assert.equal(typeof checks.recommendedAction, 'string');

console.log('content review checks passed');
