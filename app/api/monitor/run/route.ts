import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptApiKey } from "@/lib/crypto";
import { ensurePresetModels } from "@/lib/models";
import monitoring from "@/lib/monitoring";

const {
  MONITOR_PLATFORMS,
  buildMonitorQuestions,
  buildMonitorPrompt,
  evaluateMonitorAnswer,
  buildMonitorStats,
} = monitoring as {
  MONITOR_PLATFORMS: Array<{ key: string; label: string; promptHint: string }>;
  buildMonitorQuestions: (profile: Record<string, unknown> | null | undefined) => string[];
  buildMonitorPrompt: (
    question: string,
    platform: { key: string; label: string; promptHint: string },
    profile: Record<string, unknown> | null | undefined
  ) => string;
  evaluateMonitorAnswer: (
    answer: string,
    profile: Record<string, unknown> | null | undefined
  ) => {
    mentioned: boolean;
    position: string;
    productCorrect: boolean;
    hasFactError: boolean;
    factErrorNote: string | null;
  };
  buildMonitorStats: (results: Array<Record<string, any>>) => Record<string, any>;
};

type ModelConfigLite = {
  id: string;
  provider: string;
  baseURL: string;
  apiKey: string;
  modelName: string;
};

const SYSTEM_PROMPT = [
  "\u4f60\u662f GEO \u54c1\u724c\u76d1\u6d4b\u5206\u6790\u52a9\u624b\u3002",
  "\u4f60\u9700\u8981\u56de\u7b54\u76d1\u63a7\u95ee\u9898\uff0c\u6a21\u62df\u8be5\u5e73\u53f0\u4e0a\u53ef\u80fd\u51fa\u73b0\u7684\u641c\u7d22\u6216\u95ee\u7b54\u5185\u5bb9\u3002",
  "\u56de\u7b54\u9700\u8981\u81ea\u7136\u3001\u5177\u4f53\u3001\u6709\u89c2\u70b9\uff0c\u4f46\u4e0d\u8981\u81ea\u6211\u8bf4\u660e\u3001\u4e0d\u8981\u4f7f\u7528 Markdown \u6807\u8bb0\u3002",
].join("\n");

async function getDefaultModel(): Promise<ModelConfigLite | null> {
  await ensurePresetModels();
  return db.modelConfig.findFirst({
    where: { isDefault: true, isActive: true },
    select: { id: true, provider: true, baseURL: true, apiKey: true, modelName: true },
  });
}

async function getFallbackModel(): Promise<ModelConfigLite | null> {
  await ensurePresetModels();
  return db.modelConfig.findFirst({
    where: { provider: "deepseek", isActive: true },
    orderBy: { isDefault: "desc" },
    select: { id: true, provider: true, baseURL: true, apiKey: true, modelName: true },
  });
}

async function callModel(model: ModelConfigLite, userPrompt: string) {
  const apiKey = decryptApiKey(model.apiKey);
  if (!apiKey) {
    throw new Error("\u9ed8\u8ba4\u6a21\u578b API Key \u672a\u914d\u7f6e");
  }

  if (model.provider === "anthropic") {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: model.modelName,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    return response.content?.map((part) => ("text" in part ? part.text : "")).join("") || "";
  }

  const client = new OpenAI({ apiKey, baseURL: model.baseURL });
  const response = await client.chat.completions.create({
    model: model.modelName,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  return response.choices?.[0]?.message?.content || "";
}

async function ensureMonitorQuestions(brandProfile: Record<string, unknown> | null) {
  const existing = await db.monitorQuestion.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
  });

  if (existing.length > 0) {
    return existing;
  }

  const defaults = buildMonitorQuestions(brandProfile).map((question) => ({
    question,
    scene: "\u54c1\u724c\u76d1\u6d4b",
    active: true,
  }));

  for (const item of defaults) {
    await db.monitorQuestion.create({ data: item });
  }

  return db.monitorQuestion.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
  });
}

async function runMonitorBatch() {
  const brandProfile = await db.brandProfile.findFirst();
  if (!brandProfile) {
    throw new Error("\u8bf7\u5148\u5728\u54c1\u724c\u5e95\u5ea7\u4e2d\u7ef4\u62a4\u54c1\u724c\u8d44\u6599");
  }

  const questions = await ensureMonitorQuestions(brandProfile);
  if (questions.length === 0) {
    throw new Error("\u6ca1\u6709\u53ef\u7528\u7684\u76d1\u6d4b\u95ee\u9898");
  }

  const primaryModel = await getDefaultModel();
  if (!primaryModel) {
    throw new Error("\u8bf7\u5148\u914d\u7f6e\u9ed8\u8ba4\u6a21\u578b");
  }

  const fallbackModel = await getFallbackModel();
  const runAt = new Date();
  const createdIds: string[] = [];

  for (const question of questions) {
    for (const platform of MONITOR_PLATFORMS) {
      const prompt = buildMonitorPrompt(question.question, platform, brandProfile);
      let answer = "";
      let usedModel = primaryModel;

      try {
        answer = await callModel(primaryModel, prompt);
      } catch (primaryError) {
        if (!fallbackModel || fallbackModel.id === primaryModel.id) {
          throw primaryError;
        }
        usedModel = fallbackModel;
        answer = await callModel(fallbackModel, prompt);
      }

      const evaluation = evaluateMonitorAnswer(answer, brandProfile);
      const created = await db.monitorResult.create({
        data: {
          questionId: question.id,
          platform: platform.label,
          rawAnswer: answer,
          mentioned: evaluation.mentioned,
          position: evaluation.position,
          productCorrect: evaluation.productCorrect,
          hasFactError: evaluation.hasFactError,
          factErrorNote: evaluation.factErrorNote,
          runAt,
        },
        select: { id: true },
      });
      createdIds.push(created.id);

      await db.modelUsage.create({
        data: {
          modelConfigId: usedModel.id,
          durationMs: 0,
          success: true,
        },
      });
    }
  }

  const results = await db.monitorResult.findMany({
    where: { id: { in: createdIds } },
    include: { question: { select: { question: true } } },
    orderBy: [{ runAt: "desc" }, { platform: "asc" }],
  });

  return buildMonitorStats(results);
}

export async function GET() {
  try {
    const latest = await db.monitorResult.findMany({
      take: 9,
      include: { question: { select: { question: true } } },
      orderBy: [{ runAt: "desc" }, { platform: "asc" }],
    });
    return NextResponse.json({ latest });
  } catch (error) {
    console.error("[MONITOR_RUN_GET_ERROR]", error);
    return NextResponse.json({ error: "\u83b7\u53d6\u76d1\u6d4b\u72b6\u6001\u5931\u8d25" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const summary = await runMonitorBatch();
    return NextResponse.json({
      ok: true,
      message: "\u76d1\u6d4b\u5df2\u6267\u884c\u5e76\u4fdd\u5b58\u6700\u65b0\u7ed3\u679c",
      summary,
    });
  } catch (error) {
    console.error("[MONITOR_RUN_POST_ERROR]", error);
    const message = error instanceof Error ? error.message : "\u76d1\u6d4b\u6267\u884c\u5931\u8d25";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
