const fs = require('node:fs');
const assert = require('node:assert/strict');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts || {};
assert.equal(typeof scripts['service:start'], 'string');
assert.equal(typeof scripts['service:stop'], 'string');
assert.equal(typeof scripts['service:restart'], 'string');
assert.equal(typeof scripts['service:status'], 'string');
assert.equal(typeof scripts['health:check'], 'string');
assert.equal(typeof scripts['prisma:generate'], 'string');
assert.equal(typeof scripts['prisma:db:push'], 'string');
assert.equal(typeof scripts['prisma:seed'], 'string');

const gitignore = fs.readFileSync('.gitignore', 'utf8');
assert.equal(gitignore.includes('.next-dev-3301.log'), true);
assert.equal(gitignore.includes('.next-dev-3301.err.log'), true);
assert.equal(gitignore.includes('.service-3301.pid'), true);
assert.equal(gitignore.includes('.service-3301.log'), true);
assert.equal(gitignore.includes('.service-3301.err.log'), true);

const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
assert.match(schema, /owner\s+String\s+@default\("AI.*"\)/);
assert.equal(schema.includes('@default("???")'), false);

console.log('runtime stability checks passed');
