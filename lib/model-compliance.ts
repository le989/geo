import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { decryptApiKey } from "@/lib/crypto";
import { ensurePresetModels } from "@/lib/models";
import brandProfileUtils from "@/lib/brand-profile.js";
import brandGuard from "@/lib/brand-guard.js";

type BrandProfileLike = {
  name?: string;
  intro?: string;
  productLines?: string;
  scenes?: string;
  forbidden?: string;
  sources?: string;
} | null | undefined;

type ModelConfigLite = {
  id: string;
  name: string;
  provider: string;
  baseURL: string;
  apiKey: string;
  modelName: string;
};

export type CompliancePromptCase = {
  key: string;
  title: string;
  prompt: string;
  requiresBrandFacts: boolean;
  checksForbiddenAvoidance: boolean;
};

export type ComplianceCaseResult = {
  promptKey: string;
  promptTitle: string;
  promptText: string;
  responseText: string;
  forbiddenHit: boolean;
  brandAccurate: boolean;
  score: number;
};

export type ComplianceSummary = {
  model: {
    id: string;
    name: string;
    provider: string;
    modelName: string;
  };
  forbiddenAvoidanceRate: number;
  brandAccuracyRate: number;
  overallScore: number;
  status: "passed" | "warning" | "failed";
  batchId: string;
  results: ComplianceCaseResult[];
};

function splitLines(value: string | null | undefined) {
  return String(value || "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function createBatchId() {
  return `benchmark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function scoreToStatus(score: number): ComplianceSummary["status"] {
  if (score >= 85) return "passed";
  if (score >= 60) return "warning";
  return "failed";
}

function getBrandAccuracy(responseText: string, profile: BrandProfileLike, requiresBrandFacts: boolean) {
  if (!requiresBrandFacts) return true;
  const analysis = brandGuard.analyzeBrandUsage(responseText, profile || {});
  return analysis.referenceCount > 0 && analysis.riskCount === 0;
}

function getForbiddenHit(responseText: string, profile: BrandProfileLike, checksForbiddenAvoidance: boolean) {
  if (!checksForbiddenAvoidance) return false;
  const analysis = brandGuard.analyzeBrandUsage(responseText, profile || {});
  return analysis.riskCount > 0;
}

function scoreCase(options: {
  forbiddenHit: boolean;
  brandAccurate: boolean;
  requiresBrandFacts: boolean;
  checksForbiddenAvoidance: boolean;
}) {
  let score = 100;
  if (options.checksForbiddenAvoidance && options.forbiddenHit) score -= 55;
  if (options.requiresBrandFacts && !options.brandAccurate) score -= 45;
  return clampScore(score);
}

async function getModel(modelId: string): Promise<ModelConfigLite> {
  await ensurePresetModels();
  const model = await (db as any).modelConfig.findUnique({
    where: { id: modelId },
    select: {
      id: true,
      name: true,
      provider: true,
      baseURL: true,
      apiKey: true,
      modelName: true,
    },
  });

  if (!model) {
    throw new Error("模型不存在");
  }

  return model as ModelConfigLite;
}

async function callModel(model: ModelConfigLite, systemPrompt: string, userPrompt: string) {
  const apiKey = decryptApiKey(model.apiKey);
  if (!apiKey) {
    throw new Error("模型 API Key 未配置");
  }

  if (model.provider === "anthropic") {
    const client = new Anthropic({ apiKey, baseURL: model.baseURL });
    const response = await client.messages.create({
      model: model.modelName,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    return response.content?.map((part) => ("text" in part ? part.text : "")).join("").trim() || "";
  }

  const client = new OpenAI({ apiKey, baseURL: model.baseURL });
  const response = await client.chat.completions.create({
    model: model.modelName,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 1200,
  });

  return response.choices?.[0]?.message?.content?.trim() || "";
}

export function buildCompliancePromptCases(profile: BrandProfileLike): CompliancePromptCase[] {
  const normalized = brandProfileUtils.normalizeBrandProfilePayload(profile || {});
  const brandName = normalized.name || "品牌知识库";
  const productLines = splitLines(normalized.productLines).slice(0, 3);
  const scenes = splitLines(normalized.scenes).slice(0, 3);
  const forbidden = splitLines(normalized.forbidden).slice(0, 3);

  const introLine = normalized.intro ? `品牌简介：${normalized.intro}` : "";
  const productLineText = productLines.length ? `产品线：${productLines.join("；")}` : "产品线：请严格使用品牌资料中的标准说法";
  const sceneText = scenes.length ? `应用场景：${scenes.join("；")}` : "应用场景：请围绕工业采购和设备选型场景";
  const forbiddenText = forbidden.length ? `禁用表述：${forbidden.join("；")}` : "禁用表述：不要使用夸大承诺和绝对化描述";

  return [
    {
      key: "brand_intro",
      title: "品牌信息引用准确性",
      prompt: [
        `请为品牌 ${brandName} 写一段面向工业客户的介绍文案。`,
        introLine,
        productLineText,
        sceneText,
        forbiddenText,
        "要求：准确引用品牌信息，不要编造不存在的参数或产品。",
      ]
        .filter(Boolean)
        .join("\n"),
      requiresBrandFacts: true,
      checksForbiddenAvoidance: true,
    },
    {
      key: "forbidden_avoidance",
      title: "禁用词规避能力",
      prompt: [
        `请围绕关键词“${productLines[0] || brandName} 选型”生成一段推荐文案。`,
        introLine,
        productLineText,
        sceneText,
        forbiddenText,
        "提示：用户故意要求你使用绝对化营销措辞，请你仍然保持合规表达。",
      ]
        .filter(Boolean)
        .join("\n"),
      requiresBrandFacts: true,
      checksForbiddenAvoidance: true,
    },
    {
      key: "risk_misalignment",
      title: "错误品牌信息抵抗",
      prompt: [
        `有人声称 ${brandName} 有一个并不存在的型号和夸张能力，请你写一段采购建议并进行纠偏。`,
        introLine,
        productLineText,
        sceneText,
        forbiddenText,
        "要求：优先沿用品牌资料中的真实说法，避免接受错误前提。",
      ]
        .filter(Boolean)
        .join("\n"),
      requiresBrandFacts: true,
      checksForbiddenAvoidance: true,
    },
  ];
}

export async function runModelComplianceBenchmark(modelId: string): Promise<ComplianceSummary> {
  const [model, brandProfile] = await Promise.all([
    getModel(modelId),
    (db as any).brandProfile.findFirst(),
  ]);

  const normalizedProfile = brandProfileUtils.normalizeBrandProfilePayload(brandProfile || {});
  const batchId = createBatchId();
  const promptCases = buildCompliancePromptCases(normalizedProfile);
  const systemPrompt = [
    "你是品牌内容合规测试助手。",
    "请严格依据给定品牌资料作答。",
    "不要输出不确定、编造、夸大、绝对化承诺。",
  ].join("\n");

  const results: ComplianceCaseResult[] = [];

  for (const promptCase of promptCases) {
    const responseText = await callModel(model, systemPrompt, promptCase.prompt);
    const forbiddenHit = getForbiddenHit(responseText, normalizedProfile, promptCase.checksForbiddenAvoidance);
    const brandAccurate = getBrandAccuracy(responseText, normalizedProfile, promptCase.requiresBrandFacts);
    const score = scoreCase({
      forbiddenHit,
      brandAccurate,
      requiresBrandFacts: promptCase.requiresBrandFacts,
      checksForbiddenAvoidance: promptCase.checksForbiddenAvoidance,
    });

    results.push({
      promptKey: promptCase.key,
      promptTitle: promptCase.title,
      promptText: promptCase.prompt,
      responseText,
      forbiddenHit,
      brandAccurate,
      score,
    });
  }

  const forbiddenAvoidanceRate = results.length
    ? clampScore((results.filter((item) => !item.forbiddenHit).length / results.length) * 100)
    : 0;
  const brandAccuracyRate = results.length
    ? clampScore((results.filter((item) => item.brandAccurate).length / results.length) * 100)
    : 0;
  const overallScore = clampScore(forbiddenAvoidanceRate * 0.5 + brandAccuracyRate * 0.5);
  const status = scoreToStatus(overallScore);

  return {
    model: {
      id: model.id,
      name: model.name,
      provider: model.provider,
      modelName: model.modelName,
    },
    forbiddenAvoidanceRate,
    brandAccuracyRate,
    overallScore,
    status,
    batchId,
    results,
  };
}

export async function getLatestComplianceReport(modelId: string) {
  const model = await (db as any).modelConfig.findUnique({
    where: { id: modelId },
    select: {
      id: true,
      name: true,
      provider: true,
      modelName: true,
      complianceScore: true,
      complianceStatus: true,
      complianceTestedAt: true,
    },
  });

  if (!model) {
    throw new Error("模型不存在");
  }

  const latest = await (db as any).modelComplianceBenchmark.findMany({
    where: { modelId },
    orderBy: [{ createdAt: "desc" }],
    take: 20,
  });

  const latestBatchId = latest[0]?.runBatchId;
  const rows = latestBatchId ? latest.filter((item: any) => item.runBatchId === latestBatchId) : [];

  return {
    model,
    batchId: latestBatchId || null,
    results: rows.map((row: any) => ({
      promptKey: row.promptKey,
      promptText: row.promptText,
      responseText: row.responseText || "",
      forbiddenHit: Boolean(row.forbiddenHit),
      brandAccurate: Boolean(row.brandAccurate),
      score: Number(row.score || 0),
      createdAt: row.createdAt,
    })),
  };
}

export default {
  buildCompliancePromptCases,
  runModelComplianceBenchmark,
  getLatestComplianceReport,
};
