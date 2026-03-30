const fs = require("node:fs");

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const layoutPage = fs.readFileSync("app/workbench/layout.tsx", "utf8");
const factoryPage = fs.readFileSync("app/workbench/factory/page.tsx", "utf8");

if (!schema.includes("model KeywordAsset")) {
  throw new Error("schema missing KeywordAsset model");
}

const requiredFields = ["keyword", "scene", "groupName", "priority", "status", "usageCount"];

for (const field of requiredFields) {
  if (!schema.includes(field)) {
    throw new Error("schema missing KeywordAsset." + field);
  }
}

if (!fs.existsSync("app/workbench/keywords/page.tsx")) {
  throw new Error("keywords page missing");
}

if (!fs.existsSync("app/api/keywords/route.ts")) {
  throw new Error("keywords api missing");
}

if (!layoutPage.includes("/workbench/keywords")) {
  throw new Error("layout missing keywords navigation");
}

if (!factoryPage.includes("/api/keywords")) {
  throw new Error("factory page missing keywords integration");
}

console.log("keyword asset checks passed");
