import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { decryptApiKey } from "@/lib/crypto";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

function requireModelManager() {
  const role = cookies().get("gf_role")?.value;
  if (role !== "admin" && role !== "editor") {
    throw new Error("forbidden");
  }
}

function buildModelTestError(options: {
  provider?: string;
  baseURL?: string;
  modelName?: string;
  message: string;
}) {
  const provider = options.provider || "unknown";
  const baseURL = options.baseURL || "(empty)";
  const modelName = options.modelName || "(empty)";

  if (options.message.includes("400 status code (no body)")) {
    return `上游接口返回 400。请检查 Provider、Base URL、Model Name 和 API Key 是否匹配。当前配置：${provider} / ${baseURL} / ${modelName}`;
  }

  return options.message;
}

export async function POST(req: Request) {
  let requestBody: Record<string, unknown> = {};
  let resolvedProvider: string | undefined;
  let resolvedBaseURL: string | undefined;
  let resolvedModelName: string | undefined;

  try {
    requireModelManager();
    requestBody = await req.json();

    const id = typeof requestBody.id === "string" ? requestBody.id : undefined;
    let provider = typeof requestBody.provider === "string" ? requestBody.provider : undefined;
    let baseURL = typeof requestBody.baseURL === "string" ? requestBody.baseURL : undefined;
    let apiKey = typeof requestBody.apiKey === "string" ? requestBody.apiKey : undefined;
    let modelName = typeof requestBody.modelName === "string" ? requestBody.modelName : undefined;

    if (id) {
      const config = await db.modelConfig.findUnique({ where: { id } });
      if (!config) {
        return NextResponse.json({ error: "模型不存在" }, { status: 404 });
      }
      provider = config.provider;
      baseURL = config.baseURL;
      apiKey = decryptApiKey(config.apiKey);
      modelName = config.modelName;
    }

    resolvedProvider = provider;
    resolvedBaseURL = baseURL;
    resolvedModelName = modelName;

    if (!provider || !baseURL || !apiKey || !modelName) {
      return NextResponse.json({ error: "模型配置不完整，请补充 Base URL、Model Name 和 API Key。" }, { status: 400 });
    }

    const startedAt = Date.now();

    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey, baseURL });
      const response = await client.messages.create({
        model: modelName,
        max_tokens: 32,
        system: "你是连通性测试助手，只需要回复 OK。",
        messages: [{ role: "user", content: "请回复 OK" }],
      });
      const text = response.content?.map((part) => ("text" in part ? part.text : "")).join("").trim() || "OK";
      return NextResponse.json({ ok: true, latencyMs: Date.now() - startedAt, sample: text.slice(0, 60) });
    }

    const client = new OpenAI({ apiKey, baseURL });
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: "你是连通性测试助手，只需要回复 OK。" },
        { role: "user", content: "请回复 OK" },
      ],
      max_tokens: 32,
    });

    const text = response.choices?.[0]?.message?.content?.trim() || "OK";
    return NextResponse.json({ ok: true, latencyMs: Date.now() - startedAt, sample: text.slice(0, 60) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "测试失败";
    return NextResponse.json(
      {
        ok: false,
        error: buildModelTestError({
          provider: resolvedProvider || (typeof requestBody.provider === "string" ? requestBody.provider : undefined),
          baseURL: resolvedBaseURL || (typeof requestBody.baseURL === "string" ? requestBody.baseURL : undefined),
          modelName: resolvedModelName || (typeof requestBody.modelName === "string" ? requestBody.modelName : undefined),
          message,
        }),
      },
      { status: 500 }
    );
  }
}
