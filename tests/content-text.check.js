const assert = require('node:assert/strict');
const { cleanCopiedArticleText, fallbackTitleFromContent, pickBestArticleTitle } = require('../lib/content-text.js');

const markdownInput = [
  '# \u4f20\u611f\u5668\u9009\u578b\u907f\u5751\u6307\u5357',
  '',
  '\u4e0b\u9762\u662f\u4e3a\u4f60\u6574\u7406\u7684\u6b63\u6587\uff1a',
  '',
  '**\u5148\u8bf4\u7ed3\u8bba\uff1a** \u5149\u7535\u5f00\u5173\u4e0d\u662f\u90fd\u4e00\u6837\u3002',
  '',
  '- \u8bef\u533a\u4e00\uff1a\u53ea\u770b\u4ef7\u683c',
  '- \u8bef\u533a\u4e8c\uff1a\u5ffd\u7565\u5b89\u88c5\u73af\u5883',
  '',
  '| \u7c7b\u578b | \u68c0\u6d4b\u8ddd\u79bb |',
  '| --- | --- |',
  '| \u6f2b\u53cd\u5c04\u5f0f | 0-3\u7c73 |',
  '',
  '```ts',
  "console.log('debug');",
  '```',
].join('\n');

const cleaned = cleanCopiedArticleText(markdownInput);
assert.equal(cleaned.includes('#'), false);
assert.equal(cleaned.includes('**'), false);
assert.equal(cleaned.includes('\u4e0b\u9762\u662f\u4e3a\u4f60\u6574\u7406\u7684\u6b63\u6587'), false);
assert.equal(cleaned.includes('```'), false);
assert.equal(cleaned.includes('---'), false);
assert.equal(cleaned.includes('\u5149\u7535\u5f00\u5173\u4e0d\u662f\u90fd\u4e00\u6837'), true);
assert.equal(cleaned.includes('\u8bef\u533a\u4e00\uff1a\u53ea\u770b\u4ef7\u683c'), true);
assert.equal(cleaned.includes('\u6f2b\u53cd\u5c04\u5f0f'), true);
assert.equal(cleaned.includes('0-3\u7c73'), true);

const content = [
  '\u5e72\u4e86\u5341\u51e0\u5e74\u81ea\u52a8\u5316\uff0c\u4f20\u611f\u5668\u8fd9\u73a9\u610f\u513f\uff0c\u8bf4\u7b80\u5355\u4e5f\u7b80\u5355\uff0c\u8bf4\u5751\u4e5f\u591a\u3002',
  '\u4eca\u5929\u4e0d\u804a\u865a\u7684\uff0c\u5c31\u8bf4\u8bf4\u6211\u8fd9\u4e9b\u5e74\u8e29\u8fc7\u7684\u5751\uff0c\u5c24\u5176\u662f\u5149\u7535\u3001\u63a5\u8fd1\u3001\u538b\u529b\u8fd9\u51e0\u7c7b\u5e38\u7528\u4f20\u611f\u5668\u3002',
  '\u5751\u4e00\uff1a\u4ee5\u4e3a\u5149\u7535\u5f00\u5173\u90fd\u4e00\u6837\uff0c\u7ed3\u679c\u68c0\u6d4b\u8ddd\u79bb\u5dee\u4e00\u534a\u3002',
].join('');
const title = fallbackTitleFromContent(content);
assert.equal(title.includes('\u5e72\u4e86\u5341\u51e0\u5e74\u81ea\u52a8\u5316'), false);
assert.equal(title.length <= 24, true);
assert.equal(['\u4f20\u611f\u5668', '\u9009\u578b', '\u907f\u5751', '\u6307\u5357'].some((part) => title.includes(part)), true);

assert.equal(pickBestArticleTitle(content, '\u538b\u529b\u4f20\u611f\u5668\u9009\u578b\u6700\u5bb9\u6613\u8e29\u76843\u4e2a\u5751'), '\u538b\u529b\u4f20\u611f\u5668\u9009\u578b\u6700\u5bb9\u6613\u8e29\u76843\u4e2a\u5751');
const fallback = pickBestArticleTitle('\u538b\u529b\u4f20\u611f\u5668\u9009\u578b\u6700\u6015\u91cf\u7a0b\u7559\u592a\u6b7b\uff0c\u73b0\u573a\u4e00\u6ce2\u52a8\u5c31\u5f00\u59cb\u8bef\u62a5\u8b66\u3002', '\u8fd9\u662f\u6839\u636e\u6587\u7ae0\u751f\u6210\u7684\u6807\u9898\uff1a\u538b\u529b\u4f20\u611f\u5668\u91cf\u7a0b\u600e\u4e48\u9009\uff1f');
assert.equal(fallback.includes('\u8fd9\u662f\u6839\u636e\u6587\u7ae0\u751f\u6210\u7684\u6807\u9898'), false);
assert.equal(fallback.length <= 24, true);

console.log('content text checks passed');