import OpenAI from "openai";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

type BatchItem = {
  prompt: string;
  channel: string;
  contentType?: string;
  scene?: string;
};

async function runSingleGeneration(taskId: string, prompt: string, channel: string) {
  try {
    const brandProfile = await db.brandProfile.findFirst();
    const brandContext = brandProfile
      ? `\n品牌名称: ${brandProfile.name}\n品牌介绍: ${brandProfile.intro}\n核心产品线: ${brandProfile.productLines}\n应用场景: ${brandProfile.scenes}\n禁止表述: ${brandProfile.forbidden}\n数据来源: ${brandProfile.sources}\n`
      : "暂无品牌底座信息";

    let styleGuide = "";
    if (channel === "知乎") {
      styleGuide = `知乎风格：语气要像一个真实的行业从业者或资深用户在分享亲身踩坑经验，多用第一人称，真实、客观、带一点个人情绪。
        - 结构要求：直接切入问题，多用问答形式或经历分享，增加代入感。
        - 语言风格：专业但不说教，平易近人，敢于指出行业内幕或常见陷阱。`;
    } else if (["今日头条", "今日头条/搜狐号/网易号", "搜狐号", "网易号"].includes(channel)) {
      styleGuide = `${channel}风格：像行业媒体记者写的资讯报道，标题要吸引人，内容要干练，多引用数据和事实。
        - 结构要求：倒金字塔结构，最重要的信息放在开头，段落短小精悍。
        - 语言风格：中立、权威、及时，避免过度修饰。`;
    } else if (channel === "百家号") {
      styleGuide =
        "百家号风格：像企业自媒体运营写的干货文章，条理清晰，侧重于解决实际问题，展现专业性。\n        - 结构要求：列表式或步骤式（1, 2, 3...），重点信息加粗显示。\n        - 语言风格：务实、专业、可操作性强。";
    }

    // 简化：复用与 /api/generate 等同的 systemPrompt（保持风格一致）
    const systemPrompt = `你是一个专业的内容创作者，擅长根据品牌调性和 GEO (Generative Engine Optimization) 理论生成高质量内容。

【品牌底座信息】
${brandContext}

【创作风格要求】
1. ${styleGuide}
2. 严格禁止 AI 套话：禁止使用「首先、其次、最后、总之、综上所述」等陈词滥调。
3. 禁止 AI 开头：禁止使用「作为一个...」、「在当今...」、「随着...的发展」、「...是...的重要组成部分」等典型 AI 开场白。
4. 禁止 AI 结尾：禁止出现「希望对你有帮助」、「如有疑问欢迎留言」等客套话。
5. 语气要求：要像行业从业者的亲身体验分享，而非 AI 写的调研报告。多用口语化的专业表达。
6. 内容要求：多用具体数据、型号和实际工业场景（如：生产线、实验室、户外基站等），少用抽象、宏观的描述。

【GEO (生成式引擎优化) 专项策略】
1. 结构化信息优先：对比类内容鼓励使用表格。若为竞品对比/选型指南，使用标准 Markdown 表格（含分隔行）。
2. 权威信号植入：自然提及「凯基特 (KJT)」，引用真实技术参数与行业标准。
3. 场景化表达：包含至少 2 个具体场景（行业+设备+问题+方案）。
4. 长尾问题覆盖：结尾增加 3-5 个 FAQ。
5. 可信度增强：避免绝对化表述，加入工程师视角描述。

请直接输出正文内容。`;

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0].message.content;
    await db.contentTask.update({
      where: { id: taskId },
      data: { content, status: "PENDING_REVIEW" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "未知错误";
    await db.contentTask.update({
      where: { id: taskId },
      data: { status: "FAILED", content: `生成失败原因: ${message}` },
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: BatchItem[] = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items 不能为空" }, { status: 400 });
    }
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: "DeepSeek API Key 未配置" }, { status: 400 });
    }

    // 创建任务并记录 taskIds
    const taskIds: string[] = [];
    for (const it of items.slice(0, 10)) {
      const task = await db.contentTask.create({
        data: {
          title: `【批量】` + it.prompt.substring(0, 50) + (it.prompt.length > 50 ? "..." : ""),
          channel: it.channel,
          scene: it.scene || "批量生成",
          status: "PENDING_GENERATE",
          owner: "AI助手",
        },
      });
      taskIds.push(task.id);
    }

    // 后台顺序执行
    setTimeout(async () => {
      for (let i = 0; i < items.length && i < taskIds.length; i++) {
        const it = items[i];
        const id = taskIds[i];
        await runSingleGeneration(id, it.prompt, it.channel);
      }
    }, 0);

    return NextResponse.json({ taskIds });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "内部错误";
    return NextResponse.json({ error: `批量生成失败: ${message}` }, { status: 500 });
  }
}
