import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptApiKey } from "@/lib/crypto";
import { ensurePresetModels } from "@/lib/models";
import { logTaskEvent } from "@/lib/log";
import contentText from "@/lib/content-text";
import * as generationPrompts from "@/lib/generation-prompts";
import contentReview from "@/lib/content-review";
import articleStore from "@/lib/article-store";

const { pickBestArticleTitle } = contentText as {
  pickBestArticleTitle: (content: string, modelTitle?: string) => string;
};

const {
  buildBrandContext,
  buildSystemPrompt,
  buildTitlePrompts,
  copyTextLabels,
  normalizeContentType,
} = generationPrompts as typeof import("@/lib/generation-prompts");

const {
  parseReviewResponse,
  buildPublishChecks,
  createReviewFallback,
  buildReviewPrompts,
  buildBrandCheck,
} = contentReview as {
  parseReviewResponse: (rawText: string, content?: string) => Record<string, unknown>;
  buildPublishChecks: (options: { title: string; content: string; brandCheck: Record<string, any> }) => Record<string, unknown>;
  createReviewFallback: (brandCheck: Record<string, any>, publishCheck: Record<string, unknown>) => Record<string, unknown>;
  buildReviewPrompts: (options: {
    title: string;
    content: string;
    channel: string;
    scene: string;
    brandCheck: Record<string, any>;
    publishCheck: Record<string, unknown>;
  }) => { systemPrompt: string; userPrompt: string };
  buildBrandCheck: (content: string, brandProfile: Record<string, unknown> | null | undefined) => Record<string, any>;
};

const {
  SOURCE_TYPES,
  createContentDraftPayload,
  buildGeneratedTaskUpdate,
  buildContentVersionPayload,
} = articleStore as {
  SOURCE_TYPES: Record<string, string>;
  createContentDraftPayload: (input: Record<string, any>) => Record<string, any>;
  buildGeneratedTaskUpdate: (input: Record<string, any>) => Record<string, any>;
  buildContentVersionPayload: (input: Record<string, any>) => Record<string, any>;
};

type ModelConfigLite = {
  id: string;
  provider: string;
  baseURL: string;
  apiKey: string;
  modelName: string;
};

async function getDefaultModel(): Promise<ModelConfigLite | null> {
  await ensurePresetModels();
  return db.modelConfig.findFirst({
    where: { isDefault: true, isActive: true },
    select: { id: true, provider: true, baseURL: true, apiKey: true, modelName: true },
  });
}

async function getDeepSeekFallback(): Promise<ModelConfigLite | null> {
  await ensurePresetModels();
  return db.modelConfig.findFirst({
    where: { provider: "deepseek", isActive: true },
    orderBy: { isDefault: "desc" },
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
      max_tokens: 4096,
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

async function runQualityReview(options: {
  model: ModelConfigLite;
  title: string;
  content: string;
  channel: string;
  scene: string;
  brandProfile: Record<string, unknown> | null | undefined;
}) {
  const brandCheck = buildBrandCheck(options.content, options.brandProfile);
  const publishCheck = buildPublishChecks({
    title: options.title,
    content: options.content,
    brandCheck,
  });

  let aiReview = createReviewFallback(brandCheck, publishCheck);
  try {
    const prompts = buildReviewPrompts({
      title: options.title,
      content: options.content,
      channel: options.channel,
      scene: options.scene,
      brandCheck,
      publishCheck,
    });
    const reviewText = await callModel(options.model, prompts.systemPrompt, prompts.userPrompt);
    aiReview = parseReviewResponse(reviewText, options.content);
  } catch (error) {
    console.warn("[CONTENT_REVIEW_FALLBACK]", error);
  }

  return { brandCheck, publishCheck, aiReview };
}

async function runGenerationTask(taskId: string, prompt: string, channel: string, scene: string, contentType = copyTextLabels.contentTypes[0], modelId?: string, sourceType = SOURCE_TYPES.manual, sourceLabel = "") {
  try {
    const normalizedType = normalizeContentType(prompt, contentType);
    const brandContext = await buildBrandContext();
    const brandProfile = await db.brandProfile.findFirst();
    const systemPrompt = buildSystemPrompt({
      brandContext,
      channel,
      contentType: normalizedType,
    });

    const selected = modelId
      ? await db.modelConfig.findUnique({
          where: { id: modelId },
          select: { id: true, provider: true, baseURL: true, apiKey: true, modelName: true, isActive: true },
        })
      : null;

    const primary: ModelConfigLite | null =
      selected && selected.isActive
        ? { id: selected.id, provider: selected.provider, baseURL: selected.baseURL, apiKey: selected.apiKey, modelName: selected.modelName }
        : await getDefaultModel();

    if (!primary) {
      throw new Error("未配置可用模型");
    }

    const start = Date.now();
    let content = "";
    let usedModel = primary;

    try {
      content = await callModel(primary, systemPrompt, prompt);
      await db.modelUsage.create({ data: { modelConfigId: primary.id, durationMs: Date.now() - start, success: true } });
    } catch (error) {
      await db.modelUsage.create({ data: { modelConfigId: primary.id, durationMs: Date.now() - start, success: false } });
      const fallback = await getDeepSeekFallback();
      if (!fallback || fallback.id === primary.id) {
        throw error;
      }
      const fallbackStart = Date.now();
      content = await callModel(fallback, systemPrompt, prompt);
      usedModel = fallback;
      await db.modelUsage.create({ data: { modelConfigId: fallback.id, durationMs: Date.now() - fallbackStart, success: true } });
    }

    const { systemPrompt: titleSystemPrompt, userPrompt: titleUserPrompt } = buildTitlePrompts(content);
    let modelTitle = "";
    try {
      modelTitle = await callModel(usedModel, titleSystemPrompt, titleUserPrompt);
    } catch (titleError) {
      console.warn(`[TASK ${taskId}] title generation fallback`, titleError);
    }

    const title = pickBestArticleTitle(content, modelTitle);
    const quality = await runQualityReview({
      model: usedModel,
      title,
      content,
      channel,
      scene,
      brandProfile,
    });

    await db.contentTask.update({
      where: { id: taskId },
      data: buildGeneratedTaskUpdate({
        title,
        content,
        aiReview: quality.aiReview,
        publishCheck: { ...quality.publishCheck, brandCheck: quality.brandCheck },
        sourceType,
        sourceLabel: sourceLabel || prompt.slice(0, 80),
        status: "PENDING_REVIEW",
      }),
    });

    if (sourceType === SOURCE_TYPES.keyword && sourceLabel) {
      await db.keywordAsset.updateMany({
        where: { keyword: sourceLabel },
        data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
      });
    }

    const versionBase = await db.contentTask.findUnique({ where: { id: taskId }, select: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } } });
    await db.contentVersion.create({
      data: buildContentVersionPayload({
        taskId,
        title,
        content,
        source: "initial_generation",
        actor: "\u0041\u0049\u52a9\u624b",
        versionNumber: ((versionBase?.versions?.[0]?.versionNumber) || 0) + 1,
      }),
    });

    await logTaskEvent(taskId, "AI助手", "TASK_GENERATED", `生成完成，标题：${title}`);
  } catch (error: unknown) {
    console.error(`[TASK ${taskId}] generation error`, error);
    const message = error instanceof Error ? error.message : "未知错误";
    await db.contentTask.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        content: `生成失败原因：${message}`,
        publishCheck: {},
        aiReview: {},
      },
    });
    await logTaskEvent(taskId, "AI助手", "TASK_FAILED", `生成失败：${message}`);
  }
}

export async function POST(req: Request) {
  try {
    const { prompt, channel = copyTextLabels.channels[0], scene = copyTextLabels.defaultScene, contentType = copyTextLabels.contentTypes[0], modelId, sourceType = SOURCE_TYPES.manual, sourceLabel = "" } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "缺少生成指令" }, { status: 400 });
    }

    if ((await db.modelConfig.count()) === 0) {
      await ensurePresetModels();
    }

    const task = await db.contentTask.create({
      data: createContentDraftPayload({
        title: "生成中...",
        channel,
        scene,
        status: "PENDING_GENERATE",
        owner: "AI助手",
        sourceType,
        sourceLabel: String(sourceLabel || prompt).slice(0, 80),
      }),
    });

    await logTaskEvent(task.id, "AI助手", "TASK_CREATED", `已提交生成任务：${scene}`);

    setTimeout(() => {
      runGenerationTask(task.id, prompt, channel, scene, contentType, modelId, sourceType, String(sourceLabel || prompt).slice(0, 80));
    }, 0);

    return NextResponse.json({ taskId: task.id });
  } catch (error: unknown) {
    console.error("[GENERATE_API_ERROR]", error);
    const message = error instanceof Error ? error.message : "内部错误";
    return NextResponse.json({ error: `提交生成请求失败：${message}` }, { status: 500 });
  }
}




