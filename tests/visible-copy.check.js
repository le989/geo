const fs = require('node:fs');

const criticalFiles = [
  'app/workbench/layout.tsx',
  'app/workbench/articles/page.tsx',
  'app/api/content/route.ts',
  'app/api/content/[id]/route.ts',
  'lib/task-workflow.js',
];

const forbiddenFragments = [
  'GEO??',
  '???',
  '??????',
  '?????? AI',
  '???????????? AI',
  '???????????????',
];

for (const file of criticalFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const fragment of forbiddenFragments) {
    if (text.includes(fragment)) {
      throw new Error(file + ' contains visible garbled copy fragment: ' + fragment);
    }
  }
}

const layout = fs.readFileSync('app/workbench/layout.tsx', 'utf8');
const articles = fs.readFileSync('app/workbench/articles/page.tsx', 'utf8');
const GEO_TITLE = String.raw`{"GEO\u5de5\u5382"}`;
const ARTICLES_LABEL = String.raw`\u6587\u7ae0\u5217\u8868`;

if (!layout.includes(GEO_TITLE) && !layout.includes(String.raw`GEO\u5de5\u5382`)) {
  throw new Error('layout missing GEO?? title');
}
if (!layout.includes(ARTICLES_LABEL)) {
  throw new Error('layout missing articles label');
}
if (!articles.includes(ARTICLES_LABEL)) {
  throw new Error('articles page missing title');
}

console.log('visible copy checks passed');
