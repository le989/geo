const assert = require('node:assert/strict');
const {
  LABELS,
  MONITOR_PLATFORMS,
  evaluateMonitorAnswer,
  buildMonitorStats,
  buildMonitorQuestions,
} = require('../lib/monitoring.js');

const profile = {
  name: '\u51ef\u57fa\u7279\uff08KJT\uff09',
  productLines: '\u7535\u611f\u5f0f\u63a5\u8fd1\u5f00\u5173 - M12/M18 \u7cfb\u5217\n\u5149\u7535\u4f20\u611f\u5668 - \u5bf9\u5c04\u7cfb\u5217',
  scenes: '\u5305\u88c5\u7ebf\u7269\u6599\u5230\u4f4d\u68c0\u6d4b\n\u7269\u6d41\u5206\u62e3\u5b9a\u4f4d',
  forbidden: '\u7981\u6b62\u4f7f\u7528\u201c\u6700\u5f3a\u201d\n\u7981\u6b62\u627f\u8bfa\u201c\u7edd\u4e0d\u8bef\u62a5\u201d',
  sources: '\u54c1\u724c\u5b98\u7f51\n\u4ea7\u54c1\u624b\u518c',
};

const evaluation = evaluateMonitorAnswer(
  '\u51ef\u57fa\u7279\uff08KJT\uff09\u7684\u7535\u611f\u5f0f\u63a5\u8fd1\u5f00\u5173\u5e38\u7528\u4e8e\u5305\u88c5\u7ebf\u7269\u6599\u5230\u4f4d\u68c0\u6d4b\uff0c\u4f46\u4e0d\u8981\u5199\u6210\u6700\u5f3a\u3002',
  profile
);

assert.equal(MONITOR_PLATFORMS.length >= 3, true);
assert.equal(evaluation.mentioned, true);
assert.equal(evaluation.productCorrect, true);
assert.equal(evaluation.hasFactError, true);
assert.equal((evaluation.factErrorNote || '').length > 0, true);
assert.equal(evaluation.position, LABELS.mentioned);

const stats = buildMonitorStats([
  {
    platform: LABELS.zhihu,
    mentioned: true,
    runAt: new Date('2026-03-20T08:00:00.000Z'),
    question: { question: '\u56fd\u4ea7\u7535\u611f\u5f0f\u63a5\u8fd1\u5f00\u5173\u5382\u5bb6\u600e\u4e48\u9009\uff1f' },
    rawAnswer: '\u63d0\u5230\u4e86\u51ef\u57fa\u7279',
    position: LABELS.mentioned,
    productCorrect: true,
    hasFactError: false,
    factErrorNote: null,
  },
  {
    platform: LABELS.zhihu,
    mentioned: false,
    runAt: new Date('2026-03-20T08:00:00.000Z'),
    question: { question: '\u5149\u7535\u4f20\u611f\u5668\u600e\u4e48\u9009\uff1f' },
    rawAnswer: '\u6ca1\u6709\u63d0\u5230\u54c1\u724c',
    position: LABELS.notMentioned,
    productCorrect: false,
    hasFactError: false,
    factErrorNote: null,
  },
  {
    platform: LABELS.toutiao,
    mentioned: true,
    runAt: new Date('2026-03-21T08:00:00.000Z'),
    question: { question: '\u56fd\u4ea7\u7535\u611f\u5f0f\u63a5\u8fd1\u5f00\u5173\u5382\u5bb6\u600e\u4e48\u9009\uff1f' },
    rawAnswer: '\u63d0\u5230\u4e86\u51ef\u57fa\u7279',
    position: LABELS.mentioned,
    productCorrect: true,
    hasFactError: true,
    factErrorNote: '\u51fa\u73b0\u7981\u7528\u8bcd',
  },
]);

assert.equal(stats.overallRate, 100);
assert.equal(stats.platforms.includes(LABELS.zhihu), true);
assert.equal(stats.latestResults.length, 1);
assert.equal(stats.latestResults[0].platform, LABELS.toutiao);
assert.equal(stats.latestResults[0].hasFactError, true);
assert.equal(stats.chartData.length >= 2, true);

const questions = buildMonitorQuestions(profile);
assert.equal(questions.length >= 3, true);
assert.equal(questions.some((item) => item.includes('\u51ef\u57fa\u7279')), true);

console.log('monitoring checks passed');
