import OpenAI from "openai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const DIMENSION_CONFIG = [
  {
    key: "structure",
    label: "\u7ed3\u6784\u5316\u7a0b\u5ea6",
    weight: 25,
    description:
      "\u770b\u6807\u9898\u5c42\u7ea7\u3001\u6bb5\u843d\u7ec4\u7ec7\u3001\u5217\u8868\u4e0e\u7ed3\u5c3e\u603b\u7ed3\u662f\u5426\u4fbf\u4e8e AI \u63d0\u53d6\u7b54\u6848\u3002",
  },
  {
    key: "brand_density",
    label: "\u54c1\u724c\u4fe1\u606f\u5bc6\u5ea6",
    weight: 20,
    description:
      "\u770b\u54c1\u724c\u540d\u3001\u4ea7\u54c1\u7ebf\u3001\u573a\u666f\u4fe1\u606f\u662f\u5426\u81ea\u7136\u4e14\u5145\u5206\u51fa\u73b0\u3002",
  },
  {
    key: "source_reference",
    label: "\u6765\u6e90\u5f15\u7528",
    weight: 20,
    description:
      "\u770b\u5185\u5bb9\u662f\u5426\u4f53\u73b0\u77e5\u8bc6\u5e93\u4e2d\u7684\u6765\u6e90\u3001\u4f9d\u636e\u548c\u53ef\u5f15\u7528\u4fe1\u606f\u3002",
  },
  {
    key: "qa_coverage",
    label: "\u95ee\u7b54\u8986\u76d6\u5ea6",
    weight: 20,
    description:
      "\u770b\u6b63\u6587\u662f\u5426\u56de\u7b54\u9898\u76ee\u6838\u5fc3\u95ee\u9898\uff0c\u5e76\u8986\u76d6\u5e38\u89c1\u51b3\u7b56\u70b9\u3002",
  },
  {
    key: "authority",
    label: "\u6743\u5a01\u6027\u8868\u8fbe",
    weight: 15,
    description:
      "\u770b\u8868\u8fbe\u662f\u5426\u4e13\u4e1a\u3001\u514b\u5236\u3001\u53ef\u4fe1\uff0c\u907f\u514d\u7a7a\u6cdb\u548c\u7edd\u5bf9\u5316\u3002",
  },
] as const;

type RawDimension = {
  key?: string;
  label?: string;
  score?: number;
  maxScore?: number;
  reason?: string;
  tips?: string[];
};

function normalizeDimensions(rawDimensions: RawDimension[] = []) {
  return DIMENSION_CONFIG.map((dimension, index) => {
    const matched = rawDimensions.find((item) => item.key === dimension.key) || rawDimensions[index] || {};
    const maxScore = Number.isFinite(matched.maxScore) ? Number(matched.maxScore) : dimension.weight;
    const score = Number.isFinite(matched.score) ? Number(matched.score) : 0;

    return {
      key: dimension.key,
      label: dimension.label,
      weight: dimension.weight,
      score: Math.max(0, Math.min(score, maxScore)),
      maxScore,
      reason:
        typeof matched.reason === "string" && matched.reason.trim()
          ? matched.reason.trim()
          : "\u5f53\u524d\u7ef4\u5ea6\u6682\u65e0\u660e\u663e\u6263\u5206\u95ee\u9898\u3002",
      tips: Array.isArray(matched.tips)
        ? matched.tips
            .filter((item) => typeof item === "string" && item.trim())
            .map((item) => item.trim())
            .slice(0, 3)
        : [],
      description: dimension.description,
    };
  });
}

function buildFallbackScore(content: string) {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  const hasHeadings = /(^|\n)#{1,3}\s/.test(content);
  const hasList = /(^|\n)([-*]|\d+\.)\s/.test(content);
  const brandMatches = (content.match(/\u51ef\u57fa\u7279|KJT|\u4f20\u611f\u5668|\u63a5\u8fd1\u5f00\u5173/g) || []).length;
  const sourceMatches = (content.match(/http|\u5b98\u7f51|\u6765\u6e90|\u53c2\u8003/g) || []).length;
  const questionMatches = (content.match(/\u5982\u4f55|\u4e3a\u4ec0\u4e48|\u600e\u4e48|\u5efa\u8bae|\u65b9\u6848/g) || []).length;
  const authorityMatches = (content.match(/\u6848\u4f8b|\u53c2\u6570|\u578b\u53f7|\u6e29\u5ea6|\u7cbe\u5ea6|\u5b89\u88c5|\u7ef4\u62a4/g) || []).length;

  const dimensions = [
    {
      key: "structure",
      score: Math.min(25, (hasHeadings ? 10 : 0) + (hasList ? 5 : 0) + Math.min(10, paragraphs.length * 2)),
      maxScore: 25,
      reason: hasHeadings
        ? "\u7ed3\u6784\u8f83\u6e05\u6670\uff0c\u4f46\u4ecd\u53ef\u8865\u5145\u7ed3\u5c3e\u603b\u7ed3\u6216\u66f4\u660e\u786e\u7684\u5c0f\u6807\u9898\u3002"
        : "\u7f3a\u5c11\u660e\u786e\u7684\u5c0f\u6807\u9898\u6216\u7ed3\u6784\u5206\u5c42\uff0cAI \u62bd\u53d6\u91cd\u70b9\u4f1a\u66f4\u5403\u529b\u3002",
      tips: hasHeadings
        ? [
            "\u8865\u4e00\u6bb5\u603b\u7ed3\u6536\u675f\u5168\u6587",
            "\u8ba9\u5c0f\u6807\u9898\u66f4\u8d34\u8fd1\u95ee\u9898\u573a\u666f",
          ]
        : ["\u8865\u5145\u4e8c\u7ea7\u6807\u9898", "\u6309\u573a\u666f\u6216\u95ee\u9898\u62c6\u5206\u6bb5\u843d"],
    },
    {
      key: "brand_density",
      score: Math.min(20, brandMatches * 3),
      maxScore: 20,
      reason:
        brandMatches >= 5
          ? "\u54c1\u724c\u4e0e\u4ea7\u54c1\u4fe1\u606f\u51fa\u73b0\u8f83\u5145\u5206\u3002"
          : "\u54c1\u724c\u3001\u4ea7\u54c1\u7ebf\u6216\u573a\u666f\u4fe1\u606f\u5bc6\u5ea6\u504f\u4f4e\uff0c\u5185\u5bb9\u8fa8\u8bc6\u5ea6\u4e0d\u8db3\u3002",
      tips: [
        "\u8865\u5145\u54c1\u724c\u540d\u4e0e\u4ea7\u54c1\u7ebf",
        "\u628a\u54c1\u724c\u4fe1\u606f\u81ea\u7136\u878d\u5165\u89e3\u51b3\u65b9\u6848\u63cf\u8ff0",
      ],
    },
    {
      key: "source_reference",
      score: Math.min(20, sourceMatches * 5),
      maxScore: 20,
      reason:
        sourceMatches > 0
          ? "\u5df2\u6709\u6765\u6e90\u6216\u5f15\u7528\u610f\u8bc6\uff0c\u4f46\u8fd8\u53ef\u4ee5\u66f4\u660e\u786e\u3002"
          : "\u7f3a\u5c11\u6765\u6e90\u3001\u5b98\u7f51\u6216\u5f15\u7528\u4f9d\u636e\uff0c\u53ef\u4fe1\u5ea6\u504f\u5f31\u3002",
      tips: ["\u8865\u5145\u5b98\u7f51\u6216\u8d44\u6599\u6765\u6e90", "\u5728\u5173\u952e\u5224\u65ad\u5904\u7ed9\u51fa\u4f9d\u636e"],
    },
    {
      key: "qa_coverage",
      score: Math.min(20, questionMatches * 4 + Math.min(8, paragraphs.length)),
      maxScore: 20,
      reason:
        questionMatches >= 2
          ? "\u6b63\u6587\u5bf9\u95ee\u9898\u6709\u4e00\u5b9a\u8986\u76d6\uff0c\u4f46\u8fd8\u53ef\u4ee5\u6269\u5145\u5173\u952e\u51b3\u7b56\u70b9\u3002"
          : "\u5bf9\u9898\u76ee\u6838\u5fc3\u95ee\u9898\u7684\u56de\u7b54\u8fd8\u4e0d\u591f\u96c6\u4e2d\u3002",
      tips: [
        "\u589e\u52a0 FAQ \u6216\u5e38\u89c1\u51b3\u7b56\u70b9",
        "\u660e\u786e\u56de\u7b54\u201c\u600e\u4e48\u9009/\u4e3a\u4ec0\u4e48\u201d",
      ],
    },
    {
      key: "authority",
      score: Math.min(15, authorityMatches * 2),
      maxScore: 15,
      reason:
        authorityMatches >= 4
          ? "\u4e13\u4e1a\u8868\u8fbe\u8f83\u5145\u5206\u3002"
          : "\u4e13\u4e1a\u53c2\u6570\u3001\u6848\u4f8b\u6216\u5de5\u51b5\u7ec6\u8282\u504f\u5c11\uff0c\u6743\u5a01\u611f\u4e0d\u8db3\u3002",
      tips: ["\u8865\u5145\u53c2\u6570\u548c\u578b\u53f7", "\u52a0\u5165\u5de5\u51b5\u6216\u6848\u4f8b\u7ec6\u8282"],
    },
  ] satisfies RawDimension[];

  const normalized = normalizeDimensions(dimensions);
  const total = normalized.reduce((sum, item) => sum + item.score, 0);

  return {
    total,
    dimensions: normalized,
    suggestion:
      total >= 85
        ? "\u6574\u4f53\u8d28\u91cf\u8f83\u597d\uff0c\u53ef\u7ee7\u7eed\u505a\u7ec6\u8282\u4f18\u5316\u3002"
        : "\u5efa\u8bae\u4f18\u5148\u4fee\u6b63\u5f97\u5206\u8f83\u4f4e\u7684\u7ef4\u5ea6\uff0c\u518d\u8fdb\u884c\u53d1\u5e03\u6216\u4ea4\u4ed8\u3002",
  };
}

export async function POST(req: Request) {
  try {
    const { content } = await req.json();
    const safeContent = String(content || "").trim();

    if (!safeContent) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const systemPrompt = [
      "\u4f60\u662f GEO \u8bc4\u5206\u52a9\u624b\uff0c\u8981\u5bf9\u6587\u7ae0\u8fdb\u884c\u53ef\u89e3\u91ca\u7684\u591a\u7ef4\u5ea6\u8bc4\u5206\u3002",
      "\u8bf7\u4e25\u683c\u6309 JSON \u8fd4\u56de\uff0c\u4e0d\u8981\u8f93\u51fa\u89e3\u91ca\u6587\u5b57\u3002",
      "\u8bc4\u5206\u7ef4\u5ea6\u56fa\u5b9a\u4e3a\uff1a\u7ed3\u6784\u5316\u7a0b\u5ea6\u3001\u54c1\u724c\u4fe1\u606f\u5bc6\u5ea6\u3001\u6765\u6e90\u5f15\u7528\u3001\u95ee\u7b54\u8986\u76d6\u5ea6\u3001\u6743\u5a01\u6027\u8868\u8fbe\u3002",
      "\u603b\u5206\u6ee1\u5206 100\uff0c\u5404\u7ef4\u5ea6\u7684 maxScore \u5206\u522b\u4e3a 25 / 20 / 20 / 20 / 15\u3002",
      "JSON \u7ed3\u6784\uff1a{ total, dimensions, suggestion }\u3002",
      "dimensions \u5fc5\u987b\u662f\u6570\u7ec4\uff0c\u6bcf\u9879\u5305\u542b\uff1akey, score, maxScore, reason, tips\u3002",
      "tips \u8fd4\u56de 1 \u5230 3 \u6761\u7b80\u77ed\u4f18\u5316\u5efa\u8bae\u3002",
      "key \u53ea\u80fd\u662f\uff1astructure, brand_density, source_reference, qa_coverage, authority\u3002",
    ].join("\n");

    let parsed: any = null;
    if (process.env.DEEPSEEK_API_KEY) {
      const response = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: safeContent },
        ],
        response_format: { type: "json_object" },
      });
      parsed = JSON.parse(response.choices[0].message.content || "{}");
    }

    const fallback = buildFallbackScore(safeContent);
    const dimensions = normalizeDimensions(
      Array.isArray(parsed?.dimensions) ? (parsed.dimensions as RawDimension[]) : fallback.dimensions,
    );
    const total = Number.isFinite(parsed?.total)
      ? Number(parsed.total)
      : dimensions.reduce((sum, item) => sum + item.score, 0);
    const suggestion =
      typeof parsed?.suggestion === "string" && parsed.suggestion.trim()
        ? parsed.suggestion.trim()
        : fallback.suggestion;

    return NextResponse.json({
      total,
      dimensions,
      suggestion,
      items: dimensions.map((item) => ({
        name: item.label,
        score: item.score,
        max: item.maxScore,
        tip: item.reason,
      })),
    });
  } catch (error: unknown) {
    console.error("[SCORE_API_ERROR]", error);
    const fallback = buildFallbackScore("");
    const message = error instanceof Error ? error.message : "\u8bc4\u5206\u5931\u8d25";
    return NextResponse.json(
      {
        error: `\u8bc4\u5206\u5931\u8d25: ${message}`,
        total: fallback.total,
        dimensions: fallback.dimensions,
        suggestion: fallback.suggestion,
        items: fallback.dimensions.map((item) => ({
          name: item.label,
          score: item.score,
          max: item.maxScore,
          tip: item.reason,
        })),
      },
      { status: 500 },
    );
  }
}
