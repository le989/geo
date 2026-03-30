const assert = require('node:assert/strict');
const fs = require('node:fs');
const store = require('../lib/article-store.js');

const {
  SOURCE_TYPES,
  createContentDraftPayload,
  buildContentListItem,
  mergeContentUpdatePayload,
} = store;

const base = createContentDraftPayload({
  title: '生成中的文章',
  channel: '知乎',
  scene: '自主创作',
  owner: 'AI助手',
  sourceType: SOURCE_TYPES.manual,
  sourceLabel: '手工输入',
});

assert.equal(base.sourceType, SOURCE_TYPES.manual);
assert.equal(base.sourceLabel, '手工输入');
assert.equal(base.owner, 'AI助手');
assert.equal(typeof base.aiReview, 'object');
assert.equal(typeof base.publishCheck, 'object');

const merged = mergeContentUpdatePayload(
  {
    title: '旧标题',
    content: '旧正文',
    aiReview: { status: 'revise' },
    publishCheck: { status: 'warning' },
  },
  {
    title: '新标题',
    content: '新正文',
  }
);

assert.equal(merged.title, '新标题');
assert.equal(merged.content, '新正文');
assert.deepEqual(merged.aiReview, { status: 'revise' });
assert.deepEqual(merged.publishCheck, { status: 'warning' });

const listItem = buildContentListItem({
  id: 'task-1',
  title: '文章标题',
  content: '文章正文',
  channel: '知乎',
  scene: '采购决策',
  owner: 'AI助手',
  status: 'PENDING_REVIEW',
  sourceType: SOURCE_TYPES.manual,
  sourceLabel: '手工输入',
  aiReview: { status: 'pass', summary: '可发布' },
  publishCheck: { status: 'warning' },
  createdAt: new Date('2026-03-26T10:00:00.000Z'),
  updatedAt: new Date('2026-03-26T10:10:00.000Z'),
});

assert.equal(listItem.id, 'task-1');
assert.equal(listItem.source.type, SOURCE_TYPES.manual);
assert.equal(listItem.review.status, 'pass');
assert.equal(listItem.check.status, 'warning');
assert.equal(typeof listItem.excerpt, 'string');

console.log('article store checks passed');

const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
assert.equal(schema.includes('sourceType'), true);
assert.equal(schema.includes('sourceLabel'), true);
assert.equal(schema.includes('aiReview'), true);
assert.equal(schema.includes('publishCheck'), true);
assert.equal(schema.includes('lastEditedAt'), true);
