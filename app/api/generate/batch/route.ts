import OpenAI from "openai";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import contentText from "@/lib/content-text";
import * as generationPrompts from "@/lib/generation-prompts";
import contentReview from "@/lib/content-review";
import articleStore from "@/lib/article-store";
import { logTaskEvent } from "@/lib/log";
import { appendVariationInstruction, type BatchVariationSpec } from "@/lib/batch-variation";
import { findSimilarityWarnings, type SimilarityWarning } from "@/lib/content-similarity";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const { pickBestArticleTitle } = contentText as {
  pickBestArticleTitle: (content: string, modelTitle?: string) => string;
};

const { buildBrandContext, buildSystemPrompt, buildTitlePrompts, copyTextLabels } =
  generationPrompts as typeof import("@/lib/generation-prompts");

const {
  parseReviewResponse,
  buildPublishChecks,
  createReviewFallback,
  buildReviewPrompts,
  buildBrandCheck,
} = contentReview as {
  parseReviewResponse: (rawText: string, content?: string) => Record<string, unknown>;
  buildPublishChecks: (options: {
    title: string;
    content: string;
    brandCheck: Record<string, any>;
  }) => Record<string, unknown>;
  createReviewFallback: (
    brandCheck: Record<string, any>,
    publishCheck: Record<string, unknown>,
  ) => Record<string, unknown>;
  buildReviewPrompts: (options: {
    title: string;
    content: string;
    channel: string;
    scene: string;
    brandCheck: Record<string, any>;
    publishCheck: Record<string, unknown>;
  }) => { systemPrompt: string; userPrompt: string };
  buildBrandCheck: (
    content: string,
    brandProfile: Record<string, unknown> | null | undefined,
  ) => Record<string, any>;
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

type BatchItem = {
  prompt: string;
  channel: string;
  contentType?: string;
  scene?: string;
  variationSpec?: BatchVariationSpec | null;
};

type BatchGenerationResult = {
  taskId: string;
  title: string;
  content: string;
};

async function runSingleGeneration(
  taskId: string,
  item: BatchItem,
): Promise<BatchGenerationResult | null> {
  try {
    const brandContext = await buildBrandContext();
    const brandProfile = await db.brandProfile.findFirst();
    const systemPrompt = buildSystemPrompt({
      brandContext,
      channel: item.channel,
      contentType: item.contentType || copyTextLabels.contentTypes[0],
    });

    const promptForModel = appendVariationInstruction(item.prompt, item.variationSpec);

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptForModel },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    const { systemPrompt: titleSystemPrompt, userPrompt: titleUserPrompt } =
      buildTitlePrompts(content);
    const titleResponse = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: titleSystemPrompt },
        { role: "user", content: titleUserPrompt },
      ],
    });
    const title = pickBestArticleTitle(
      content,
      titleResponse.choices[0]?.message?.content || "",
    );

    const brandCheck = buildBrandCheck(content, brandProfile);
    const publishCheck = buildPublishChecks({ title, content, brandCheck });
    let aiReview = createReviewFallback(brandCheck, publishCheck);
    try {
      const prompts = buildReviewPrompts({
        title,
        content,
        channel: item.channel,
        scene: item.scene || copyTextLabels.batchScene,
        brandCheck,
        publishCheck,
      });
      const reviewResponse = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: prompts.systemPrompt },
          { role: "user", content: prompts.userPrompt },
        ],
      });
      aiReview = parseReviewResponse(
        reviewResponse.choices[0]?.message?.content || "",
        content,
      );
    } catch (reviewError) {
      console.warn(`[BATCH TASK ${taskId}] review fallback`, reviewError);
    }

    await db.contentTask.update({
      where: { id: taskId },
      data: buildGeneratedTaskUpdate({
        title,
        content,
        aiReview,
        publishCheck: { ...publishCheck, brandCheck },
        sourceType: SOURCE_TYPES.manual,
        sourceLabel: item.prompt.slice(0, 80),
        status: "PENDING_REVIEW",
      }),
    });

    const versionBase = await db.contentTask.findUnique({
      where: { id: taskId },
      select: {
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
    });
    await db.contentVersion.create({
      data: buildContentVersionPayload({
        taskId,
        title,
        content,
        source: "initial_generation",
        actor: "AI助手",
        versionNumber: (versionBase?.versions?.[0]?.versionNumber || 0) + 1,
      }),
    });

    await logTaskEvent(taskId, "AI助手", "TASK_GENERATED", `批量生成完成，标题：${title}`);
    return { taskId, title, content };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "未知错误";
    await db.contentTask.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        content: `生成失败原因：${message}`,
        aiReview: {},
        publishCheck: {},
      },
    });
    await logTaskEvent(taskId, "AI助手", "TASK_FAILED", `批量生成失败：${message}`);
    return null;
  }
}

async function persistSimilarityWarnings(warnings: SimilarityWarning[]) {
  if (!warnings.length) return;

  for (const warning of warnings) {
    await logTaskEvent(
      warning.aTaskId,
      "AI助手",
      "TASK_SIMILARITY_WARNING",
      `与《${warning.bTitle}》相似度 ${warning.similarity}`,
    );
    await logTaskEvent(
      warning.bTaskId,
      "AI助手",
      "TASK_SIMILARITY_WARNING",
      `与《${warning.aTitle}》相似度 ${warning.similarity}`,
    );
  }
}

async function processBatchGeneration(taskIds: string[], items: BatchItem[]) {
  const generatedResults: BatchGenerationResult[] = [];

  for (let index = 0; index < items.length && index < taskIds.length; index += 1) {
    const generated = await runSingleGeneration(taskIds[index], items[index]);
    if (generated) {
      generatedResults.push(generated);
    }
  }

  const similarityWarnings = findSimilarityWarnings(generatedResults, 0.75);
  await persistSimilarityWarnings(similarityWarnings);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: BatchItem[] = Array.isArray(body.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json({ error: "批量生成项目不能为空" }, { status: 400 });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: "DeepSeek API Key 未配置" }, { status: 400 });
    }

    const limitedItems = items.slice(0, 10);
    const taskIds: string[] = [];

    for (const item of limitedItems) {
      const task = await db.contentTask.create({
        data: createContentDraftPayload({
          title: "【批量】生成中...",
          channel: item.channel,
          scene: item.scene || copyTextLabels.batchScene,
          owner: "AI助手",
          sourceType: SOURCE_TYPES.manual,
          sourceLabel: String(item.prompt || "").slice(0, 80),
        }),
      });
      taskIds.push(task.id);
      await logTaskEvent(task.id, "AI助手", "TASK_CREATED", `已提交批量生成任务：${task.scene}`);
    }

    setTimeout(() => {
      void processBatchGeneration(taskIds, limitedItems);
    }, 0);

    return NextResponse.json({ taskIds });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "内部错误";
    return NextResponse.json({ error: `批量生成失败：${message}` }, { status: 500 });
  }
}
