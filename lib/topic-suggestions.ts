import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { decryptApiKey } from "@/lib/crypto";
import { ensurePresetModels } from "@/lib/models";

const DEFAULT_LIMIT = 5;
const CACHE_HOURS = 24;
const DISMISS_DAYS = 7;
const ALL_VALUE = "all";

const PRIORITY_WEIGHTS: Record<string, number> = {
  HIGH: 40,
  MEDIUM: 24,
  LOW: 12,
  high: 40,
  medium: 24,
  low: 12,
  normal: 20,
};

type ModelConfigLite = {
  id: string;
  provider: string;
  baseURL: string;
  apiKey: string;
  modelName: string;
};

type SuggestionFilters = {
  scene?: string;
  channel?: string;
  groupName?: string;
  limit?: number;
};

type KeywordCandidate = {
  id: string;
  keyword: string;
  scene: string;
  groupName: string;
  priority: string;
  status: string;
  usageCount: number;
  avgGeoScore: number | null;
  lastContentGeneratedAt: Date | null;
  active: boolean;
};

export type TopicSuggestionItem = {
  id: string;
  keywordAssetId: string;
  keyword: string;
  title: string;
  scene: string | null;
  channel: string | null;
  reason: string | null;
  score: number | null;
  status: string;
  dismissedUntil: Date | null;
  lastGeneratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeFilterValue(value?: string | null) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.toLowerCase() === ALL_VALUE) {
    return null;
  }
  return normalized;
}

function daysSince(date?: Date | null) {
  if (!date) return 999;
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function priorityScore(priority: string) {
  return PRIORITY_WEIGHTS[priority] ?? PRIORITY_WEIGHTS.MEDIUM;
}

function freshnessScore(lastContentGeneratedAt?: Date | null) {
  const days = daysSince(lastContentGeneratedAt);
  if (days >= 14) return 30;
  return Math.round((days / 14) * 30);
}

function geoScoreGap(avgGeoScore?: number | null) {
  if (avgGeoScore === null || avgGeoScore === undefined) return 18;
  if (avgGeoScore >= 80) return 0;
  return Math.round(((80 - avgGeoScore) / 80) * 18);
}

function usagePenalty(usageCount: number) {
  return Math.min(12, usageCount * 2);
}

function buildRecommendationReason(candidate: KeywordCandidate) {
  const reasonParts: string[] = [];
  const days = daysSince(candidate.lastContentGeneratedAt);

  if (priorityScore(candidate.priority) >= 40) {
    reasonParts.push("\u9ad8\u4f18\u5148\u7ea7\u5173\u952e\u8bcd");
  }

  if (!candidate.lastContentGeneratedAt) {
    reasonParts.push("\u5c1a\u672a\u56f4\u7ed5\u8be5\u8bcd\u751f\u6210\u8fc7\u5185\u5bb9");
  } else if (days >= 14) {
    reasonParts.push(`\u5df2 ${days} \u5929\u672a\u4ea7\u51fa\u65b0\u5185\u5bb9`);
  }

  if (candidate.avgGeoScore === null || candidate.avgGeoScore === undefined) {
    reasonParts.push("\u6682\u65e0 GEO \u8d28\u91cf\u79ef\u7d2f");
  } else if (candidate.avgGeoScore < 70) {
    reasonParts.push(`GEO \u5747\u5206 ${candidate.avgGeoScore.toFixed(0)} \u504f\u4f4e`);
  }

  if (reasonParts.length === 0) {
    reasonParts.push("\u9002\u5408\u7ee7\u7eed\u6269\u5c55\u8be5\u65b9\u5411\u5185\u5bb9");
  }

  return reasonParts.join("\uff0c");
}

function buildFallbackTitle(keyword: string, scene: string, channel: string) {
  const safeScene = scene && scene !== "general" ? scene : "\u81ea\u4e3b\u521b\u4f5c";
  const safeChannel = channel || "\u77e5\u4e4e";
  return `${keyword}\uff1a${safeScene}\u573a\u666f\u4e0b\u7684${safeChannel}\u5185\u5bb9\u9009\u9898`;
}

async function getDefaultModel(): Promise<ModelConfigLite | null> {
  await ensurePresetModels();
  return db.modelConfig.findFirst({
    where: { isDefault: true, isActive: true },
    select: { id: true, provider: true, baseURL: true, apiKey: true, modelName: true },
  });
}

async function callModel(model: ModelConfigLite, systemPrompt: string, userPrompt: string) {
  const apiKey = decryptApiKey(model.apiKey);
  if (!apiKey) {
    throw new Error("API key missing");
  }

  if (model.provider === "anthropic") {
    const client = new Anthropic({ apiKey, baseURL: model.baseURL });
    const response = await client.messages.create({
      model: model.modelName,
      max_tokens: 120,
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
    max_tokens: 120,
  });
  return response.choices?.[0]?.message?.content?.trim() || "";
}

function buildSuggestionPrompt(keyword: string, scene: string, channel: string) {
  return {
    systemPrompt: [
      "\u4f60\u662f B2B \u5de5\u4e1a\u5185\u5bb9\u9009\u9898\u52a9\u624b\u3002",
      "\u8bf7\u57fa\u4e8e\u5173\u952e\u8bcd\u3001\u573a\u666f\u548c\u6e20\u9053\u5199\u4e00\u4e2a\u53ef\u76f4\u63a5\u7528\u6765\u751f\u6210\u6587\u7ae0\u7684\u4e2d\u6587\u9898\u76ee\u3002",
      "\u9898\u76ee\u8981\u50cf\u771f\u5b9e\u4f1a\u53d1\u5e03\u7684\u6587\u7ae0\u6807\u9898\uff0c\u4e0d\u8981\u89e3\u91ca\uff0c\u4e0d\u8981 Markdown\uff0c\u53ea\u8fd4\u56de\u4e00\u884c\u6807\u9898\u3002",
      "\u6807\u9898\u5c3d\u91cf\u63a7\u5236\u5728 14 \u5230 28 \u4e2a\u6c49\u5b57\u5185\u3002",
    ].join(" "),
    userPrompt: `\u5173\u952e\u8bcd\uff1a${keyword}\n\u573a\u666f\uff1a${scene}\n\u6e20\u9053\uff1a${channel}\n\n\u8bf7\u8f93\u51fa\u4e00\u4e2a\u53ef\u76f4\u63a5\u4f7f\u7528\u7684\u9009\u9898\u6807\u9898\u3002`,
  };
}

function cleanSuggestedTitle(rawTitle: string, fallbackTitle: string) {
  const title = String(rawTitle || "")
    .replace(/^[\"“”'`]+|[\"“”'`]+$/g, "")
    .replace(/^#+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!title) return fallbackTitle;
  if (title.length < 6) return fallbackTitle;
  if (title.length > 40) return title.slice(0, 40).trim();
  return title;
}

function cacheExpired(lastGeneratedAt?: Date | null) {
  if (!lastGeneratedAt) return true;
  return Date.now() - lastGeneratedAt.getTime() > CACHE_HOURS * 60 * 60 * 1000;
}

function buildCandidateWhere(filters: SuggestionFilters) {
  const scene = normalizeFilterValue(filters.scene);
  const groupName = normalizeFilterValue(filters.groupName);

  return {
    active: true,
    status: "READY",
    ...(scene ? { scene } : {}),
    ...(groupName ? { groupName } : {}),
  };
}

async function loadCandidates(filters: SuggestionFilters) {
  const items = await db.keywordAsset.findMany({
    where: buildCandidateWhere(filters),
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
  });

  return items
    .map((item) => {
      const score =
        priorityScore(item.priority) +
        freshnessScore(item.lastContentGeneratedAt) +
        geoScoreGap(item.avgGeoScore) -
        usagePenalty(item.usageCount);

      return {
        ...item,
        score,
        reason: buildRecommendationReason(item),
      };
    })
    .sort((left, right) => right.score - left.score);
}

async function getCachedSuggestion(candidate: KeywordCandidate, channel: string) {
  return db.topicSuggestion.findFirst({
    where: {
      keywordAssetId: candidate.id,
      channel,
      scene: candidate.scene,
      status: "ACTIVE",
      OR: [{ dismissedUntil: null }, { dismissedUntil: { lt: new Date() } }],
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function generateSuggestionTitle(candidate: KeywordCandidate, channel: string) {
  const fallbackTitle = buildFallbackTitle(candidate.keyword, candidate.scene, channel);
  const model = await getDefaultModel();

  if (!model) {
    return fallbackTitle;
  }

  try {
    const prompts = buildSuggestionPrompt(candidate.keyword, candidate.scene, channel);
    const rawTitle = await callModel(model, prompts.systemPrompt, prompts.userPrompt);
    return cleanSuggestedTitle(rawTitle, fallbackTitle);
  } catch (error) {
    console.warn("[TOPIC_SUGGESTION_FALLBACK]", error);
    return fallbackTitle;
  }
}

async function upsertSuggestion(candidate: KeywordCandidate & { score: number; reason: string }, channel: string) {
  const existing = await db.topicSuggestion.findFirst({
    where: {
      keywordAssetId: candidate.id,
      channel,
      scene: candidate.scene,
    },
    orderBy: { updatedAt: "desc" },
  });

  const title = await generateSuggestionTitle(candidate, channel);
  const payload = {
    keywordAssetId: candidate.id,
    keyword: candidate.keyword,
    title,
    scene: candidate.scene,
    channel,
    reason: candidate.reason,
    score: candidate.score,
    status: "ACTIVE",
    dismissedUntil: null,
    lastGeneratedAt: new Date(),
  };

  if (existing) {
    return db.topicSuggestion.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return db.topicSuggestion.create({ data: payload });
}

export async function getTopicSuggestions(filters: SuggestionFilters = {}): Promise<TopicSuggestionItem[]> {
  const limit = Math.max(1, Math.min(filters.limit || DEFAULT_LIMIT, 10));
  const channel = normalizeFilterValue(filters.channel) || "\u77e5\u4e4e";
  const rankedCandidates = await loadCandidates(filters);
  const selected = rankedCandidates.slice(0, Math.max(limit * 2, limit));

  const suggestions: TopicSuggestionItem[] = [];
  for (const candidate of selected) {
    const cached = await getCachedSuggestion(candidate, channel);
    if (cached && !cacheExpired(cached.lastGeneratedAt)) {
      suggestions.push(cached as TopicSuggestionItem);
    } else {
      const fresh = await upsertSuggestion(candidate, channel);
      suggestions.push(fresh as TopicSuggestionItem);
    }

    if (suggestions.length >= limit) {
      break;
    }
  }

  return suggestions.sort((left, right) => (right.score || 0) - (left.score || 0));
}

export async function dismissTopicSuggestion(id: string) {
  const dismissedUntil = new Date(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000);
  return db.topicSuggestion.update({
    where: { id },
    data: {
      status: "DISMISSED",
      dismissedUntil,
    },
  });
}

export default {
  getTopicSuggestions,
  dismissTopicSuggestion,
};
