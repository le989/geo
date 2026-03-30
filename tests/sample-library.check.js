const fs = require('node:fs');
const assert = require('node:assert/strict');

const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
assert.equal(schema.includes('model ContentSample'), true, 'schema missing ContentSample model');
assert.equal(schema.includes('sampleEntry') || schema.includes('samples'), true, 'schema missing sample relation on content task');

const layout = fs.readFileSync('app/workbench/layout.tsx', 'utf8');
assert.equal(layout.includes('/workbench/samples'), true, 'workbench layout missing samples route');

const articles = fs.readFileSync('app/workbench/articles/page.tsx', 'utf8');
assert.equal(articles.includes('/api/samples'), true, 'articles page missing samples api usage');
assert.equal(articles.includes('加入样板库') || articles.includes('\\u52a0\\u5165\\u6837\\u677f\\u5e93'), true, 'articles page missing add-to-sample action');

const samplesPagePath = 'app/workbench/samples/page.tsx';
assert.equal(fs.existsSync(samplesPagePath), true, 'samples page missing');
const samplesPage = fs.readFileSync(samplesPagePath, 'utf8');
assert.equal(samplesPage.includes('/api/samples'), true, 'samples page missing samples fetch');

const samplesApiPath = 'app/api/samples/route.ts';
assert.equal(fs.existsSync(samplesApiPath), true, 'samples api route missing');
const samplesApi = fs.readFileSync(samplesApiPath, 'utf8');
assert.equal(samplesApi.includes('db.contentSample'), true, 'samples api missing contentSample queries');

const factory = fs.readFileSync('app/workbench/factory/page.tsx', 'utf8');
assert.equal(factory.includes('/api/samples'), true, 'factory page missing sample fetch');
assert.equal(factory.includes('可参考样板') || factory.includes('\\u53ef\\u53c2\\u8003\\u6837\\u677f'), true, 'factory page missing sample reference card');

console.log('sample library checks passed');
