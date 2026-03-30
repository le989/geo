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
  provider: string;
  baseURL: string;
  apiKey: string;
  modelName: string;
};

export type VisibilityPlatformKey = "deepseek" | "doubao" | "kimi" | "qwen";

export type VisibilityQueryPayload = {
  taskId: string;
  keyword: string;
  platform: VisibilityPlatformKey;
};

export type VisibilityAnalysis = {
  mentioned: boolean;
  mentionCount: number;
  isFirstScreen: boolean;
  sentiment: "positive" | "neutral" | "negative";
};

export type VisibilityQueryResultShape = VisibilityAnalysis & {
  platform: VisibilityPlatformKey;
  prompt: string;
  responseText: string;
  cached: boolean;
};

const CACHE_WINDOW_MS = 24 * 60 * 60 * 1000;

export const VISIBILITY_PLATFORMS: Array<{
  key: VisibilityPlatformKey;
  label: string;
  provider: string;
  promptHint: string;
}> = [
  {
    key: "deepseek",
    label: "DeepSeek",
    provider: "deepseek",
    promptHint: "请用 DeepSeek 常见的分析回答风格，先给结论，再给原因和建议。",
  },
  {
    key: "doubao",
    label: "豆包",
    provider: "doubao",
    promptHint: "请用豆包常见的问答风格，回答简洁直接，先给核心建议。",
  },
  {
    key: "kimi",
    label: "Kimi",
    provider: "kimi",
    promptHint: "请用 Kimi 常见的中文助手风格，给出结构清晰、易读的回答。",
  },
  {
    key: "qwen",
    label: "通义千问",
    provider: "qwen",
    promptHint: "请用通义千问常见的专业问答风格，突出信息完整性和可执行建议。",
  },
];

const POSITIVE_TERMS = ["推荐", "适合", "可靠", "稳定", "值得", "优势", "表现不错", "可优先考虑"];
const NEGATIVE_TERMS = ["不推荐", "不适合", "不足", "问题", "风险", "谨慎", "不稳定", "劣势"];

function splitLines(value: string | null | undefined) {
  return String(value || "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickPlatform(platform: VisibilityPlatformKey) {
  return VISIBILITY_PLATFORMS.find((item) => item.key === platform) || VISIBILITY_PLATFORMS[0];
}

async function findPlatformModel(platform: VisibilityPlatformKey): Promise<ModelConfigLite | null> {
  await ensurePresetModels();
  const platformConfig = pickPlatform(platform);
  const selected = await (db as any).modelConfig.findFirst({
    where: { provider: platformConfig.provider, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, provider: true, baseURL: true, apiKey: true, modelName: true },
  });
  if (selected) return selected;
  return (db as any).modelConfig.findFirst({
    where: { isDefault: true, isActive: true },
    select: { id: true, provider: true, baseURL: true, apiKey: true, modelName: true },
  });
}

async function callModel(model: ModelConfigLite, systemPrompt: string, userPrompt: string) {
  const apiKey = decryptApiKey(model.apiKey);
  if (!apiKey) {
    throw new Error("API Key 未配置");
  }

  if (model.provider === "anthropic") {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: model.modelName,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    return res.content?.map((part) => ("text" in part ? part.text : "")).join("") || "";
  }

  const client = new OpenAI({ apiKey, baseURL: model.baseURL });
  const res = await client.chat.completions.create({
    model: model.modelName,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return res.choices?.[0]?.message?.content || "";
}

export function buildVisibilityPrompt(keyword: string, platform: VisibilityPlatformKey, brandProfile: BrandProfileLike) {
  const normalized = brandProfileUtils.normalizeBrandProfilePayload(brandProfile || {});
  const platformConfig = pickPlatform(platform);
  const productLines = splitLines(normalized.productLines).slice(0, 4).join("；");
  const scenes = splitLines(normalized.scenes).slice(0, 4).join("；");
  const sources = splitLines(normalized.sources).slice(0, 3).join("；");

  const systemPrompt = [
    `你正在模拟 ${platformConfig.label} 的中文问答回答场景。`,
    platformConfig.promptHint,
    "请直接输出一段完整中文回答，不要使用 Markdown，不要解释你在模拟平台。",
  ].join("\n");

  const userPrompt = [
    `查询关键词：${keyword}`,
    `目标品牌：${normalized.name || "品牌知识库"}`,
    normalized.intro ? `品牌简介：${normalized.intro}` : "",
    productLines ? `核心产品线：${productLines}` : "",
    scenes ? `典型场景：${scenes}` : "",
    sources ? `可引用来源：${sources}` : "",
    "请围绕这个关键词给出一段自然回答，包含你认为应该优先提及的品牌、方案、建议或判断。",
  ]
    .filter(Boolean)
    .join("\n");

  return { systemPrompt, userPrompt };
}

export function analyzeVisibilityResponse(responseText: string, brandProfile: BrandProfileLike): VisibilityAnalysis {
  const normalized = brandProfileUtils.normalizeBrandProfilePayload(brandProfile || {});
  const text = String(responseText || "");
  const analysis = brandGuard.analyzeBrandUsage(text, normalized);
  const brandTerms = [normalized.name, ...splitLines(normalized.productLines)]
    .map((item) => item?.trim())
    .filter(Boolean);

  const mentionCount = brandTerms.reduce((sum, term) => {
    const matches = text.match(new RegExp(escapeRegExp(term), "g"));
    return sum + (matches?.length || 0);
  }, 0);

  const leadingChunk = text.slice(0, Math.max(120, Math.floor(text.length * 0.3)));
  const isFirstScreen = brandTerms.some((term) => leadingChunk.includes(term));

  const positiveHits = POSITIVE_TERMS.filter((term) => text.includes(term)).length;
  const negativeHits = NEGATIVE_TERMS.filter((term) => text.includes(term)).length;
  const sentiment: VisibilityAnalysis["sentiment"] =
    positiveHits > negativeHits ? "positive" : negativeHits > positiveHits ? "negative" : "neutral";

  return {
    mentioned: analysis.referenceCount > 0 || mentionCount > 0,
    mentionCount,
    isFirstScreen,
    sentiment,
  };
}

export async function getCachedVisibilityResult(taskId: string, keyword: string, platform: VisibilityPlatformKey) {
  const threshold = new Date(Date.now() - CACHE_WINDOW_MS);
  return (db as any).visibilityQueryResult.findFirst({
    where: {
      taskId,
      keyword,
      platform,
      queriedAt: { gte: threshold },
    },
    orderBy: { queriedAt: "desc" },
  });
}

export async function runVisibilityQuery(payload: VisibilityQueryPayload): Promise<VisibilityQueryResultShape> {
  const task = await (db as any).contentTask.findUnique({
    where: { id: payload.taskId },
    select: { id: true, title: true, content: true, channel: true, scene: true },
  });
  if (!task) {
    throw new Error("文章不存在");
  }

  const cached = await getCachedVisibilityResult(payload.taskId, payload.keyword, payload.platform);
  if (cached) {
    return {
      platform: payload.platform,
      prompt: cached.prompt || "",
      responseText: cached.responseText || "",
      mentioned: Boolean(cached.mentioned),
      mentionCount: Number(cached.mentionCount || 0),
      isFirstScreen: Boolean(cached.isFirstScreen),
      sentiment: (cached.sentiment || "neutral") as VisibilityAnalysis["sentiment"],
      cached: true,
    };
  }

  const brandProfile = await (db as any).brandProfile.findFirst();
  const model = await findPlatformModel(payload.platform);
  if (!model) {
    throw new Error(`未找到可用于 ${pickPlatform(payload.platform).label} 的模型配置`);
  }

  const prompts = buildVisibilityPrompt(payload.keyword, payload.platform, brandProfile);
  const responseText = await callModel(model, prompts.systemPrompt, prompts.userPrompt);
  const analyzed = analyzeVisibilityResponse(responseText, brandProfile);

  return {
    platform: payload.platform,
    prompt: prompts.userPrompt,
    responseText,
    ...analyzed,
    cached: false,
  };
}

export default {
  CACHE_WINDOW_MS,
  VISIBILITY_PLATFORMS,
  buildVisibilityPrompt,
  analyzeVisibilityResponse,
  getCachedVisibilityResult,
  runVisibilityQuery,
};
