const fs = require('node:fs');

const tasksPage = fs.readFileSync('app/workbench/tasks/page.tsx', 'utf8');
const factoryPage = fs.readFileSync('app/workbench/factory/page.tsx', 'utf8');
const escaped = {
  aiReview: String.raw`AI\u5ba1\u6838\u6982\u89c8`,
  publishCheck: String.raw`\u53d1\u5e03\u524d\u68c0\u67e5`,
  source: String.raw`\u5185\u5bb9\u6765\u6e90`,
  recommendation: String.raw`\u5efa\u8bae\u52a8\u4f5c`,
  factoryAi: String.raw`AI\u5ba1\u6838`,
  pendingReview: String.raw`\u5f85\u5ba1\u6838`,
  allTasks: String.raw`\u5168\u90e8\u4efb\u52a1`,
};

const hasAny = (text, patterns) => patterns.some((pattern) => text.includes(pattern));

if (!hasAny(tasksPage, ['AI????', escaped.aiReview])) {
  throw new Error('tasks page missing AI review card');
}
if (!hasAny(tasksPage, ['?????', escaped.publishCheck])) {
  throw new Error('tasks page missing publish-check card');
}
if (!hasAny(tasksPage, ['????', escaped.source])) {
  throw new Error('tasks page missing source card');
}
if (!hasAny(tasksPage, ['????', escaped.recommendation])) {
  throw new Error('tasks page missing recommended action card');
}
if (!tasksPage.includes('getTaskActionGuard')) {
  throw new Error('tasks page missing publish-check action guard integration');
}
if (!hasAny(tasksPage, ['???', '\u9ad8\u98ce\u9669', 'high_risk'])) {
  throw new Error('tasks page missing high-risk filter or badge');
}
if (!hasAny(tasksPage, ['???', '\u5f85\u5ba1\u6838', escaped.pendingReview]) || !hasAny(tasksPage, ['????', '\u5168\u90e8\u4efb\u52a1', escaped.allTasks])) {
  throw new Error('tasks page missing quick filters');
}
if (!factoryPage.includes('/api/content/')) {
  throw new Error('factory page missing content save api integration');
}
if (!hasAny(factoryPage, ['AI??', escaped.factoryAi])) {
  throw new Error('factory page missing AI review section');
}
if (!hasAny(factoryPage, ['?????', escaped.publishCheck])) {
  throw new Error('factory page missing publish check section');
}

console.log('phase 1 ui checks passed');
