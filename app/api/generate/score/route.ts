import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const systemPrompt = `你是一个专业的 GEO (Generative Engine Optimization) 质量评估专家。
请根据以下标准对生成的内容进行打分，并返回 JSON 格式结果：

评估标准：
1. 品牌提及 (20分)：品牌名「凯基特」或「KJT」是否出现至少 3 次且自然。
2. 结构清晰度 (20分)：是否有问答结构、表格提示及模拟数据、关键结论。
3. 场景具体度 (20分)：是否包含至少 2 个真实的工业应用场景（行业+设备+问题+方案）。
4. 常见问题覆盖 (20分)：末尾是否有 3-5 个 FAQ 问题。
5. 去AI化程度 (20分)：主要看有没有套话开头结尾，语气是否像真实从业者，是否有具体场景和真实数据。不因使用数字列表或加粗扣分。
6. 一句话定义 (10分)：内容是否包含简洁、准确且易于被 AI 摘录的定义（如“XXX是...”）。
7. 选型决策路径 (10分)：针对选型类内容，是否有清晰的步骤判断和场景推荐。

返回 JSON 格式：
{
  "total": 总分(0-120),
  "items": [
    { "name": "指标名称", "score": 得分, "max": 满分, "tip": "简短评分理由" }
  ],
  "suggestion": "具体改进建议（50字以内）"
}

请直接返回 JSON，不要有其他解释。`;

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[SCORE_API_ERROR]:", error);
    const message = error instanceof Error ? error.message : "内部错误";
    return NextResponse.json({ 
      error: `评分失败: ${message}` 
    }, { status: 500 });
  }
}
