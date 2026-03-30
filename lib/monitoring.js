const brandGuard = require('./brand-guard.js');
const brandProfileUtils = require('./brand-profile.js');

const LABELS = {
  zhihu: '\u77e5\u4e4e',
  toutiao: '\u4eca\u65e5\u5934\u6761',
  baijiahao: '\u767e\u5bb6\u53f7',
  mentioned: '\u5df2\u63d0\u53ca',
  notMentioned: '\u672a\u63d0\u53ca',
  noBrand: '\u76ee\u6807\u54c1\u724c',
  noProduct: '\u6838\u5fc3\u4ea7\u54c1',
  noScene: '\u5178\u578b\u5e94\u7528\u573a\u666f',
  promptPlatform: '\u76d1\u6d4b\u5e73\u53f0',
  promptQuestion: '\u76d1\u6d4b\u95ee\u9898',
  promptBrand: '\u76ee\u6807\u54c1\u724c',
  promptProducts: '\u54c1\u724c\u4ea7\u54c1\u7ebf',
  promptScenes: '\u5178\u578b\u573a\u666f',
  promptForbidden: '\u7981\u6b62\u8868\u8ff0',
  directAnswer: '\u8bf7\u76f4\u63a5\u8f93\u51fa\u4e00\u6bb5\u4e2d\u6587\u56de\u7b54\uff0c\u4e0d\u8981\u4f7f\u7528 Markdown\uff0c\u4e0d\u8981\u89e3\u91ca\u4f60\u5728\u6a21\u62df\u5e73\u53f0\u3002',
  q1: '\u9002\u5408\u54ea\u4e9b\u5de5\u4e1a\u573a\u666f\uff1f',
  q2: '\u5728\u91c7\u8d2d\u65f6\u5e94\u8be5\u91cd\u70b9\u770b\u4ec0\u4e48\uff1f',
  q3: '\u573a\u666f\u91cc\uff0c\u56fd\u4ea7\u65b9\u6848\u600e\u4e48\u9009\u66f4\u7a33\uff1f',
  reasonJoin: '\uff1b',
  reasonSep: '\uff1a',
  hintZhihu: '\u8bf7\u7528\u77e5\u4e4e\u9ad8\u8d5e\u56de\u7b54\u7684\u98ce\u683c\u56de\u7b54\uff0c\u91cd\u89c6\u7ecf\u9a8c\u3001\u5bf9\u6bd4\u548c\u53ef\u6267\u884c\u5efa\u8bae\u3002',
  hintToutiao: '\u8bf7\u7528\u5934\u6761\u8d44\u8baf\u89e3\u8bfb\u98ce\u683c\u56de\u7b54\uff0c\u7a81\u51fa\u7ed3\u8bba\u3001\u80cc\u666f\u548c\u5b9e\u7528\u5efa\u8bae\u3002',
  hintBaijiahao: '\u8bf7\u7528\u884c\u4e1a\u79d1\u666e\u6587\u7ae0\u98ce\u683c\u56de\u7b54\uff0c\u7ed3\u6784\u6e05\u6670\uff0c\u9002\u5408\u54c1\u724c\u5185\u5bb9\u5206\u53d1\u3002',
};

const MONITOR_PLATFORMS = [
  { key: 'zhihu', label: LABELS.zhihu, promptHint: LABELS.hintZhihu },
  { key: 'toutiao', label: LABELS.toutiao, promptHint: LABELS.hintToutiao },
  { key: 'baijiahao', label: LABELS.baijiahao, promptHint: LABELS.hintBaijiahao },
];

function splitLines(value) {
  return String(value || '')
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickBrandName(profile) {
  const normalized = brandProfileUtils.normalizeBrandProfilePayload(profile || {});
  return normalized.name || LABELS.noBrand;
}

function pickLeadingProduct(profile) {
  const normalized = brandProfileUtils.normalizeBrandProfilePayload(profile || {});
  return splitLines(normalized.productLines)[0] || LABELS.noProduct;
}

function pickLeadingScene(profile) {
  const normalized = brandProfileUtils.normalizeBrandProfilePayload(profile || {});
  return splitLines(normalized.scenes)[0] || LABELS.noScene;
}

function buildMonitorQuestions(profile) {
  const brandName = pickBrandName(profile);
  const product = pickLeadingProduct(profile);
  const scene = pickLeadingScene(profile);

  return [
    `${brandName}${LABELS.q1}`,
    `${product}${LABELS.q2}`,
    `${scene}${LABELS.q3}`,
  ];
}

function buildMonitorPrompt(question, platform, profile) {
  const normalized = brandProfileUtils.normalizeBrandProfilePayload(profile || {});
  const brandName = pickBrandName(normalized);
  const productLines = splitLines(normalized.productLines).slice(0, 4).join(LABELS.reasonJoin);
  const scenes = splitLines(normalized.scenes).slice(0, 4).join(LABELS.reasonJoin);
  const forbidden = splitLines(normalized.forbidden).slice(0, 4).join(LABELS.reasonJoin);

  return [
    `${LABELS.promptPlatform}${LABELS.reasonSep}${platform.label}`,
    platform.promptHint,
    `${LABELS.promptQuestion}${LABELS.reasonSep}${question}`,
    `${LABELS.promptBrand}${LABELS.reasonSep}${brandName}`,
    productLines ? `${LABELS.promptProducts}${LABELS.reasonSep}${productLines}` : '',
    scenes ? `${LABELS.promptScenes}${LABELS.reasonSep}${scenes}` : '',
    forbidden ? `${LABELS.promptForbidden}${LABELS.reasonSep}${forbidden}` : '',
    LABELS.directAnswer,
  ]
    .filter(Boolean)
    .join('\n');
}

function containsProfileSignal(answer, value) {
  const text = String(answer || '');
  return splitLines(value).some((line) => {
    if (!line) return false;
    if (text.includes(line)) return true;
    return line
      .split(/[\s,;:\-\/]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2)
      .some((token) => text.includes(token));
  });
}

function evaluateMonitorAnswer(answer, profile) {
  const normalizedProfile = brandProfileUtils.normalizeBrandProfilePayload(profile || {});
  const analysis = brandGuard.analyzeBrandUsage(String(answer || ''), normalizedProfile);
  const mentioned = analysis.referenceCount > 0;
  const productCorrect =
    analysis.references.some((item) => item.type === 'product' || item.type === 'scene') ||
    containsProfileSignal(answer, normalizedProfile.productLines) ||
    containsProfileSignal(answer, normalizedProfile.scenes);
  const hasFactError = analysis.riskCount > 0;
  const factErrorNote = hasFactError
    ? analysis.risks.map((item) => `${item.term}${LABELS.reasonSep}${item.reason}`).join(LABELS.reasonJoin)
    : null;

  return {
    mentioned,
    position: mentioned ? LABELS.mentioned : LABELS.notMentioned,
    productCorrect,
    hasFactError,
    factErrorNote,
    references: analysis.references,
    risks: analysis.risks,
  };
}

function toDateKey(date) {
  return new Date(date).toISOString().split('T')[0];
}

function buildMonitorStats(results) {
  const normalized = Array.isArray(results) ? results : [];
  const statsMap = {};
  const platforms = [];

  normalized.forEach((item) => {
    const dateKey = toDateKey(item.runAt);
    const platform = item.platform;
    if (!platforms.includes(platform)) platforms.push(platform);
    if (!statsMap[dateKey]) statsMap[dateKey] = {};
    if (!statsMap[dateKey][platform]) statsMap[dateKey][platform] = { total: 0, mentioned: 0 };
    statsMap[dateKey][platform].total += 1;
    if (item.mentioned) statsMap[dateKey][platform].mentioned += 1;
  });

  const chartData = Object.keys(statsMap)
    .sort()
    .map((date) => {
      const entry = { date };
      Object.entries(statsMap[date]).forEach(([platform, data]) => {
        entry[platform] = data.total ? Math.round((data.mentioned / data.total) * 100) : 0;
      });
      return entry;
    });

  const latestRunAt = normalized
    .map((item) => new Date(item.runAt))
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;

  const latestResults = latestRunAt
    ? normalized
        .filter((item) => new Date(item.runAt).getTime() === latestRunAt.getTime())
        .map((item) => ({
          id: item.id,
          platform: item.platform,
          question: item.question?.question || '',
          mentioned: item.mentioned,
          position: item.position || (item.mentioned ? LABELS.mentioned : LABELS.notMentioned),
          productCorrect: Boolean(item.productCorrect),
          hasFactError: Boolean(item.hasFactError),
          factErrorNote: item.factErrorNote || '',
          rawAnswer: item.rawAnswer || '',
          runAt: item.runAt,
        }))
    : [];

  const latestPlatformStats = latestResults.reduce((acc, item) => {
    if (!acc[item.platform]) acc[item.platform] = { total: 0, mentioned: 0 };
    acc[item.platform].total += 1;
    if (item.mentioned) acc[item.platform].mentioned += 1;
    return acc;
  }, {});

  const latestPlatformBreakdown = Object.entries(latestPlatformStats).map(([platform, data]) => ({
    platform,
    rate: data.total ? Math.round((data.mentioned / data.total) * 100) : 0,
    total: data.total,
    mentioned: data.mentioned,
  }));

  const overallRate = latestPlatformBreakdown.length
    ? Math.round(latestPlatformBreakdown.reduce((sum, item) => sum + item.rate, 0) / latestPlatformBreakdown.length)
    : 0;

  return {
    chartData,
    overallRate,
    platforms,
    latestRunAt,
    latestResults,
    latestPlatformBreakdown,
    totalQuestions: normalized.length ? new Set(normalized.map((item) => item.questionId || item.question?.question)).size : 0,
  };
}

module.exports = {
  LABELS,
  MONITOR_PLATFORMS,
  buildMonitorQuestions,
  buildMonitorPrompt,
  evaluateMonitorAnswer,
  buildMonitorStats,
};
