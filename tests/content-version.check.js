const assert = require("node:assert/strict");
const fs = require("node:fs");
const store = require("../lib/article-store.js");

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
assert.equal(schema.includes("model ContentVersion"), true, "schema missing ContentVersion model");
assert.equal(schema.includes("versionNumber"), true, "schema missing versionNumber field");
assert.equal(schema.includes("snapshotTitle"), true, "schema missing snapshotTitle field");
assert.equal(schema.includes("snapshotContent"), true, "schema missing snapshotContent field");

assert.equal(typeof store.buildContentVersionPayload, "function", "article-store missing buildContentVersionPayload");
assert.equal(typeof store.buildVersionListItem, "function", "article-store missing buildVersionListItem");

const versionPayload = store.buildContentVersionPayload({
  taskId: "task-1",
  title: "????",
  content: "????",
  source: "manual_save",
  actor: "AI??",
  versionNumber: 2,
});

assert.equal(versionPayload.taskId, "task-1");
assert.equal(versionPayload.versionNumber, 2);
assert.equal(versionPayload.snapshotTitle, "????");
assert.equal(versionPayload.snapshotContent, "????");
assert.equal(versionPayload.source, "manual_save");

const detailRoute = fs.readFileSync("app/api/content/[id]/route.ts", "utf8");
assert.equal(detailRoute.includes("versions"), true, "content detail route missing versions support");

console.log("content version checks passed");
