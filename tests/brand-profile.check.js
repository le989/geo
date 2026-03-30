const assert = require('node:assert/strict');
const {
  normalizeBrandProfilePayload,
  buildBrandContext,
  sanitizeCrawledText,
} = require('../lib/brand-profile.js');

const payload = normalizeBrandProfilePayload({
  name: ' 凯基特 ',
  intro: '工业传感品牌',
  productLines: '电感接近开关\n\n光电传感器 ',
  scenes: '包装线\n物流分拣',
  forbidden: '最强\n第一',
  sources: 'https://a.com\nhttps://b.com\nhttps://a.com',
});

assert.equal(payload.name, '凯基特');
assert.equal(payload.productLines, '电感接近开关\n光电传感器');
assert.equal(payload.sources, 'https://a.com\nhttps://b.com');

const context = buildBrandContext(payload);
assert.equal(context.includes('品牌名称：凯基特'), true);
assert.equal(context.includes('禁止表述'), true);
assert.equal(context.includes('可引用来源'), true);

const noisy = sanitizeCrawledText('首页 首页 产品中心 联系我们 KJT 传感器 适用于包装线和物流分拣，IP67 防护。 版权所有');
assert.equal(noisy.includes('首页'), false);
assert.equal(noisy.includes('版权所有'), false);
assert.equal(noisy.includes('IP67'), true);

console.log('brand profile checks passed');
