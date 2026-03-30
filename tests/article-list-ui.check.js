const fs = require('node:fs');

const layout = fs.readFileSync('app/workbench/layout.tsx', 'utf8');
const factory = fs.readFileSync('app/workbench/factory/page.tsx', 'utf8');
const articles = fs.readFileSync('app/workbench/articles/page.tsx', 'utf8');

if (!layout.includes('/workbench/articles')) {
  throw new Error('workbench layout missing articles route');
}
if (!articles.includes('/api/content')) {
  throw new Error('articles page missing content list fetch');
}
if (!articles.includes('/workbench/factory?taskId=')) {
  throw new Error('articles page missing continue edit link');
}
if (!factory.includes('URLSearchParams(window.location.search)')) {
  throw new Error('factory page missing query param support');
}
if (!factory.includes('/api/content/${queryTaskId}')) {
  throw new Error('factory page missing content detail fetch');
}

console.log('article list ui checks passed');