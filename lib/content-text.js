const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const INLINE_FORMAT_RE = /(\*\*|__|~~|`)/g;
const BULLET_RE = /^[-*+]\s+/;
const ORDERED_RE = /^\d+[.)]\s+/;
const BLOCKQUOTE_RE = /^>\s+/;
const HEADING_RE = /^#{1,6}\s*/;
const TABLE_DIVIDER_RE = /^\|?[\s:-]+(?:\|[\s:-]+)+\|?$/;
const TITLE_PREFIXES = ['\u6807\u9898\uff1a', '\u6807\u9898:', '\u5efa\u8bae\u6807\u9898\uff1a', '\u5efa\u8bae\u6807\u9898:', '\u751f\u6210\u6807\u9898\uff1a', '\u751f\u6210\u6807\u9898:', '\u8fd9\u662f\u6839\u636e\u6587\u7ae0\u751f\u6210\u7684\u6807\u9898\uff1a', '\u8fd9\u662f\u6839\u636e\u6587\u7ae0\u751f\u6210\u7684\u6807\u9898:'];
const AI_WRAPPERS = ['\u4e0b\u9762\u662f', '\u4ee5\u4e0b\u662f', '\u8fd9\u662f\u4e3a\u4f60', '\u4e3a\u4f60\u6574\u7406', '\u6211\u6765', '\u5f53\u7136\u53ef\u4ee5', '\u597d\u7684', '\u5148\u8bf4\u7ed3\u8bba', '\u603b\u7ed3\u4e00\u4e0b', '\u63a5\u4e0b\u6765'];
const BAD_TITLE_PREFIXES = ['\u8fd9\u662f', '\u4ee5\u4e0b', '\u4e0b\u9762', '\u5f53\u7136\u53ef\u4ee5', '\u597d\u7684'];
const SUBJECTS = ['\u5149\u7535\u5f00\u5173', '\u538b\u529b\u4f20\u611f\u5668', '\u63a5\u8fd1\u4f20\u611f\u5668', '\u6db2\u4f4d\u4f20\u611f\u5668', '\u6e29\u5ea6\u4f20\u611f\u5668', '\u7f16\u7801\u5668', '\u4f20\u611f\u5668'];

function normalizeWhitespace(text) {
  return text.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');
}

function startsWithAny(text, prefixes) {
  return prefixes.some((prefix) => text.startsWith(prefix));
}

function removePrefixedText(text, prefixes) {
  let next = text;
  for (const prefix of prefixes) {
    if (next.startsWith(prefix)) next = next.slice(prefix.length).trim();
  }
  return next;
}

function stripMarkdownLine(line) {
  let next = line.trim();
  if (!next) return '';
  if (TABLE_DIVIDER_RE.test(next)) return '';
  if (startsWithAny(next, AI_WRAPPERS)) return '';
  next = next.replace(HEADING_RE, '');
  next = next.replace(BULLET_RE, '');
  next = next.replace(ORDERED_RE, '');
  next = next.replace(BLOCKQUOTE_RE, '');
  next = next.replace(MARKDOWN_IMAGE_RE, '$1');
  next = next.replace(MARKDOWN_LINK_RE, '$1');
  if (next.includes('|')) {
    const cells = next.split('|').map((cell) => cell.trim()).filter(Boolean);
    if (cells.length > 0) next = cells.join('    ');
  }
  next = next.replace(INLINE_FORMAT_RE, '');
  next = next.replace(/<[^>]+>/g, '');
  next = next.replace(/[*_~]/g, '');
  next = next.replace(/\s+/g, ' ').trim();
  return next;
}

function cleanCopiedArticleText(text) {
  const normalized = normalizeWhitespace(text || '');
  const lines = normalized.split('\n');
  const cleaned = [];
  let inCodeBlock = false;
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) continue;
    const line = stripMarkdownLine(rawLine);
    if (!line) continue;
    if (cleaned[cleaned.length - 1] === line) continue;
    cleaned.push(line);
  }
  return cleaned.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

function shortenTitle(title, maxLength = 24) {
  const clean = title.trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).replace(/[\uFF0C\u3001\uFF1A:;,]+$/u, '').trim();
}

function extractSubject(text) {
  return SUBJECTS.find((item) => text.includes(item)) || '\u4f20\u611f\u5668';
}

function fallbackTitleFromContent(text) {
  const plain = cleanCopiedArticleText(text);
  const subject = extractSubject(plain);
  if (plain.includes('\u9009\u578b') || plain.includes('\u600e\u4e48\u9009')) return shortenTitle(`${subject}\u9009\u578b\u907f\u5751\u6307\u5357`);
  if (plain.includes('\u5b89\u88c5') || plain.includes('\u5b89\u88c5\u4f4d\u7f6e')) return shortenTitle(`${subject}\u5b89\u88c5\u907f\u5751\u6307\u5357`);
  if (plain.includes('\u8bef\u62a5\u8b66') || plain.includes('\u505c\u673a') || plain.includes('\u6545\u969c')) return shortenTitle(`${subject}\u5e38\u89c1\u6545\u969c\u4e0e\u907f\u5751\u6307\u5357`);
  if (plain.includes('\u8e29\u5751') || plain.includes('\u5751\u4e00') || plain.includes('\u907f\u5751')) return shortenTitle(`${subject}\u907f\u5751\u6307\u5357`);
  if (plain.includes('\u7ecf\u9a8c') || plain.includes('\u5b9e\u6218')) return shortenTitle(`${subject}\u5b9e\u6218\u7ecf\u9a8c\u603b\u7ed3`);
  const firstSentence = plain.split(/[\u3002\uff01\uff1f\n]/).map((item) => item.trim()).find(Boolean) || '';
  const normalizedSentence = firstSentence.replace(/[\uFF0C,].*$/u, '').trim();
  if (normalizedSentence) return shortenTitle(normalizedSentence);
  return '\u672a\u547d\u540d\u5185\u5bb9';
}

function sanitizeModelTitle(title) {
  if (!title) return '';
  const firstLine = normalizeWhitespace(title).split('\n').map((line) => line.trim()).find(Boolean) || '';
  return shortenTitle(removePrefixedText(firstLine.replace(HEADING_RE, "").replace(INLINE_FORMAT_RE, "").replace(/[\"\u201c\u201d\u2018\u2019]/g, "").trim(), TITLE_PREFIXES), 28);
}

function looksLikeExcerptTitle(title, content) {
  if (!title || title.length < 6) return true;
  if (title.length > 28) return true;
  if (startsWithAny(title, BAD_TITLE_PREFIXES)) return true;
  const plain = cleanCopiedArticleText(content).replace(/\s+/g, '');
  const compactTitle = title.replace(/\s+/g, '');
  if (plain.startsWith(compactTitle)) return true;
  if (compactTitle.includes('\u6839\u636e\u6587\u7ae0\u751f\u6210')) return true;
  return false;
}

function pickBestArticleTitle(content, modelTitle) {
  const sanitized = sanitizeModelTitle(modelTitle || '');
  if (!looksLikeExcerptTitle(sanitized, content)) return sanitized;
  return fallbackTitleFromContent(content);
}

module.exports = { cleanCopiedArticleText, fallbackTitleFromContent, pickBestArticleTitle, sanitizeModelTitle };