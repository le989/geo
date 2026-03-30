const fs = require('node:fs');
const text = fs.readFileSync('app/workbench/tasks/page.tsx', 'utf8');
if (!text.includes('lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,360px)]')) throw new Error('fixed two-column ratio missing');
if (!text.includes('min-w-[320px] max-w-[360px] self-start')) throw new Error('fixed sidebar width missing');
if (!text.includes('overflow-x-hidden overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-5')) throw new Error('content pane overflow fix missing');
console.log('tasks dialog unified layout checks passed');
