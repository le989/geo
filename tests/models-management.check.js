const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("app/workbench/models/page.tsx", "utf8");
assert.equal(page.includes("applyProviderDefaults"), true, "models page missing provider defaults helper");
assert.equal(page.includes("parseApiResponse"), true, "models page missing safe response parser");
assert.equal(page.includes("apiKey.trim()"), true, "models page missing apiKey validation");
assert.equal(page.includes('getCookieValue("gf_role") !== "admin"'), false, "models page should not block editor users");
assert.equal(page.includes('["admin", "editor"]'), true, "models page should allow admin and editor roles");
assert.equal(page.includes("revealId"), false, "models page should not expose reveal key state");
assert.equal(page.includes("查看 Key") || page.includes("\\u67e5\\u770b Key"), false, "models page should not render reveal key action");

const route = fs.readFileSync("app/api/models/test/route.ts", "utf8");
assert.equal(route.includes("模型配置不完整") || route.includes("\\u6a21\\u578b\\u914d\\u7f6e\\u4e0d\\u5b8c\\u6574"), true, "model test route missing clear 400 message");
assert.equal(route.includes("buildModelTestError"), true, "model test route missing upstream error formatter");
assert.equal(route.includes("new Anthropic({ apiKey, baseURL })"), true, "model test route missing anthropic baseURL support");
assert.equal(route.includes('role !== "admin" && role !== "editor"'), true, "model test route should allow editor access");

const modelsRoute = fs.readFileSync("app/api/models/route.ts", "utf8");
assert.equal(modelsRoute.includes('role !== "admin" && role !== "editor"'), true, "models route should allow editor access");

const middleware = fs.readFileSync("middleware.ts", "utf8");
assert.equal(middleware.includes("pathname.startsWith('/workbench/models') && isViewer"), true, "middleware should only block viewers from models page");
assert.equal(middleware.includes("pathname.startsWith('/api/models') && pathname !== '/api/models/public' && pathname !== '/api/models/key' && isViewer"), true, "middleware should only block viewers from model APIs while keeping key route restricted");

console.log("models management checks passed");
