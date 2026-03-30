const DEFAULT_BRAND_NAME = '品牌知识库';
const NOISE_PATTERNS = [
  /首页/g,
  /产品中心/g,
  /联系我们/g,
  /关于我们/g,
  /当前位置/g,
  /版权所有/g,
  /备案号/g,
  /技术支持/g,
];

function normalizeWhitespace(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');
}

function normalizeMultilineField(value) {
  const seen = new Set();
  return normalizeWhitespace(value)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .join('\n');
}

function normalizeBrandProfilePayload(values) {
  return {
    name: String(values?.name || '').trim() || DEFAULT_BRAND_NAME,
    intro: normalizeWhitespace(values?.intro || '').trim(),
    productLines: normalizeMultilineField(values?.productLines || ''),
    scenes: normalizeMultilineField(values?.scenes || ''),
    forbidden: normalizeMultilineField(values?.forbidden || ''),
    sources: normalizeMultilineField(values?.sources || ''),
  };
}

function buildBrandContext(profile) {
  const normalized = normalizeBrandProfilePayload(profile || {});
  return [
    `品牌名称：${normalized.name || DEFAULT_BRAND_NAME}`,
    `品牌简介：${normalized.intro || '暂未维护'}`,
    `产品线与代表型号：\n${normalized.productLines || '暂未维护'}`,
    `典型应用场景：\n${normalized.scenes || '暂未维护'}`,
    `禁止表述：\n${normalized.forbidden || '暂未维护'}`,
    `可引用来源：\n${normalized.sources || '暂未维护'}`,
  ].join('\n\n');
}

function sanitizeCrawledText(text) {
  let cleaned = normalizeWhitespace(text)
    .replace(/\s+/g, ' ')
    .replace(/[\t ]+/g, ' ')
    .trim();

  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  cleaned = cleaned
    .replace(/上一页|下一页|返回顶部/g, ' ')
    .replace(/欢迎访问[^。！!？?]+/g, ' ')
    .replace(/http[s]?:\/\/\S+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
}

module.exports = {
  DEFAULT_BRAND_NAME,
  normalizeBrandProfilePayload,
  buildBrandContext,
  sanitizeCrawledText,
};
