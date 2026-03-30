const assert = require('node:assert/strict');
const fs = require('node:fs');

const factory = fs.readFileSync('app/workbench/factory/page.tsx', 'utf8');
assert.equal(factory.includes('useState("\\u77e5\\u4e4e")'), true, 'factory page should use escaped default channel');
assert.equal(factory.includes('useState("\\u81ea\\u52a8\\u8bc6\\u522b")'), true, 'factory page should use escaped default content type');
assert.equal(factory.includes('\\u751f\\u6210\\u5b8c\\u6210'), true, 'factory page should keep escaped success copy');
assert.equal(factory.includes('\\u4efb\\u52a1\\u5f02\\u5e38'), true, 'factory page should keep escaped failed copy');

const modelsPage = fs.readFileSync('app/workbench/models/page.tsx', 'utf8');
for (const fragment of ['\\u5e73\\u5747\\u8017\\u65f6', '\\u672c\\u6708\\u8c03\\u7528', '\\u6210\\u529f\\u7387', '\\u9ed8\\u8ba4\\u6a21\\u578b', '\\u6d4b\\u8bd5', '\\u5220\\u9664']) {
  assert.equal(modelsPage.includes(fragment), true, 'models page should use escaped copy: ' + fragment);
}

const modelsRoute = fs.readFileSync('app/api/models/route.ts', 'utf8');
for (const fragment of ['\\u53ef\\u7528', '\\u4e0d\\u53ef\\u7528', '\\u65e0\\u6743\\u9650\\u6216\\u670d\\u52a1\\u5668\\u9519\\u8bef', '\\u53c2\\u6570\\u4e0d\\u5b8c\\u6574', '\\u7f3a\\u5c11 id', '\\u521b\\u5efa\\u6a21\\u578b', '\\u5220\\u9664\\u6a21\\u578b']) {
  assert.equal(modelsRoute.includes(fragment), true, 'models route should use escaped copy: ' + fragment);
}

const modelsKeyRoute = fs.readFileSync('app/api/models/key/route.ts', 'utf8');
for (const fragment of ['\\u7f3a\\u5c11 id', '\\u6a21\\u578b\\u4e0d\\u5b58\\u5728']) {
  assert.equal(modelsKeyRoute.includes(fragment), true, 'model key route should use escaped copy: ' + fragment);
}

console.log('factory and model copy checks passed');
