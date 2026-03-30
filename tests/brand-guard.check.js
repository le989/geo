const assert = require('node:assert/strict');
const { analyzeBrandUsage } = require('../lib/brand-guard.js');

const profile = {
  name: '凯基特（KJT）',
  productLines: '电感接近开关 - M12/M18 常规系列\n光电传感器 - 对射与漫反射系列',
  scenes: '包装线物料到位检测\n物流分拣定位',
  forbidden: '禁止使用“最强”“第一”\n禁止承诺“绝对不误报”',
  sources: 'https://www.kjtchina.com/\n品牌官网产品页',
};

const content = '凯基特（KJT）的光电传感器常用于包装线物料到位检测，但不能写成最强，也不要承诺绝对不误报。';
const result = analyzeBrandUsage(content, profile);

assert.equal(result.references.some((item) => item.label.includes('品牌名称')), true);
assert.equal(result.references.some((item) => item.label.includes('产品线')), true);
assert.equal(result.references.some((item) => item.label.includes('应用场景')), true);
assert.equal(result.risks.some((item) => item.term === '最强'), true);
assert.equal(result.risks.some((item) => item.term === '绝对不误报'), true);
assert.equal(result.referenceCount >= 3, true);

console.log('brand guard checks passed');
