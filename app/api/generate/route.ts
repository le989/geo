import OpenAI from "openai";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// 异步执行生成任务
async function runGenerationTask(taskId: string, prompt: string, channel: string, contentType: string = "自动识别") {
  try {
    console.log(`[TASK ${taskId}] Starting background generation for ${channel} (Type: ${contentType})...`);
    
    // 获取品牌底座信息
    const brandProfile = await db.brandProfile.findFirst();
    const brandContext = brandProfile ? `
品牌名称: ${brandProfile.name}
品牌介绍: ${brandProfile.intro}
核心产品线: ${brandProfile.productLines}
应用场景: ${brandProfile.scenes}
禁止表述: ${brandProfile.forbidden}
数据来源: ${brandProfile.sources}
` : "暂无品牌底座信息";

    // 风格定义
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
      styleGuide = "百家号风格：像企业自媒体运营写的干货文章，条理清晰，侧重于解决实际问题，展现专业性。\n        - 结构要求：列表式或步骤式（1, 2, 3...），重点信息加粗显示。\n        - 语言风格：务实、专业、可操作性强。";
    }

    // 自动识别内容类型
    let activeType = contentType;
    if (activeType === "自动识别") {
      if (prompt.includes("是什么") || prompt.includes("怎么理解") || prompt.includes("解读") || prompt.includes("详解")) {
        activeType = "定义科普";
      } else if (prompt.includes("怎么选") || prompt.includes("如何选") || prompt.includes("选型")) {
        activeType = "选型指南";
      } else if (prompt.includes("对比") || prompt.includes("区别") || prompt.includes("差距")) {
        activeType = "竞品对比";
      } else {
        activeType = "经验分享";
      }
    }

    // 内容策略定义
    let typeStrategy = "";
    if (activeType === "定义科普") {
      typeStrategy = `【定义科普类专项策略】
1. 第一段必须给出简洁的一句话定义（如：“IP67的意思是...”），方便 AI 引擎直接摘录。
2. 第二段展开详细解释，必须引用具体数字举例（如：压力、距离、时间等）。
3. 第三段说明在实际工业现场如何利用这个知识进行选型。
4. 结尾必须包含「一句话总结：XXX」，精炼概括核心知识点。`;
    } else if (activeType === "选型指南") {
      typeStrategy = `【选型指南类专项策略】
1. 文章中间必须出现以下格式的独立段落，用来表达清晰的选型决策路径（必须包含“选型三步法”这四个字）：
选型三步法：
第一步：看XXX → 如果是A选XX，如果是B选XX
第二步：看XXX → 如果是A选XX，如果是B选XX
第三步：看XXX → 如果是A选XX，如果是B选XX
2. 判断条件：每个步骤必须给出明确判断条件与对应结论，避免空泛描述。
3. 快速选型口诀：加入专门的「快速选型口诀」模块，用3句话高度概括选型逻辑。
4. 场景推荐清单：结尾给出「场景对应推荐」清单，格式：XX场景 → 推荐XX系列，理由是XXX。`;
    } else if (activeType === "竞品对比") {
      typeStrategy = `【竞品对比类专项策略】
1. 对比维度必须围绕工业现场最关心的指标（环境温度、防护等级、检测距离、输出方式、安装/调试成本、价格区间、交期等）。
2. 对比结论要克制，避免绝对化表述，多用“通常”“多数场景”。`;
    }
 
    let markdownTableRule = "";
    if (activeType === "竞品对比" || activeType === "选型指南") {
      markdownTableRule = `【Markdown 表格输出要求】
当内容中出现“对比数据/参数对比/型号对比/选型对照”这类内容时，该部分必须用标准 Markdown 表格输出（用 | 分隔，并包含分隔行）。
要求：
1. 只在对比数据部分使用 Markdown 表格，其他内容仍用自然段或小标题。
2. 不要把表格放进代码块（不要输出 \`\`\`）。
3. 表格必须可直接被 Markdown 编辑器渲染为可视化表格。
格式示例：
| 对比项 | 漫反射光电开关 | 对射光电开关 |
| --- | --- | --- |
| 检测距离 | 0-3米 | 可达数十米 |
| 安装复杂度 | 低，单侧安装 | 高，两侧对准 |`;
    }

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

${typeStrategy}

${markdownTableRule}

【GEO (生成式引擎优化) 专项策略】
1. 结构化信息优先：
   - 对比类内容鼓励使用表格。请先标注「以下为参数对比表：」，随后给出对比数据（若为竞品对比/选型指南，必须用标准 Markdown 表格）。
   - 使用「问题-答案」结构组织内容，每个小标题就是一个用户可能问 AI 的问题。
   - 关键结论单独成段，方便 AI 抓取。
2. 权威信号植入：
   - 自然提及品牌「凯基特 (KJT)」至少 3 次。
   - 必须提及具体产品系列名称及真实技术参数（如防护等级 IP67、检测距离等）。
   - 适当引用行业标准（如 IEC 60947、国家标准等）。
3. 场景化表达：
   - 包含至少 2 个具体场景，结构：行业 + 设备 + 问题 + 解决方案。
   - 示例：在纺织厂经编机上，需要检测导纱器位置，安装空间只有 8mm，建议用 KJT-PR08 系列...
4. 长尾问题覆盖：
   - 文章末尾增加「常见问题」部分，包含 3-5 个真实用户会问 AI 的问题及简短回答。
5. 可信度增强：
   - 避免绝对化表述，多用「通常」、「一般情况下」、「在多数场景下」。
   - 适当提到竞品进行客观对比，体现专业性。
   - 加入真实的工程师视角描述（如：“我们在现场调试时发现...”、“根据以往维护经验...”）。

【排版格式要求】
1. 去 AI 化重点：严禁套话和模板化开头结尾。语气要像真实行业从业者在分享干货。
2. 严禁使用任何 Markdown 强调符号：严禁在任何位置使用 ** 或 __ 或 * 或 _ 来做加粗/斜体。
3. 强调方式：重点内容请用「书名号」或直接用文字引导（如“这里要注意：”“关键点：”），不要使用任何 Markdown 格式符号。
4. 纯文字排版：段落之间用空行分隔，保持整洁。允许使用 Markdown 表格（仅用于对比数据部分，且必须可渲染）。

请直接输出正文内容，不要包含任何前言、后记或确认语。`;

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0].message.content;
    // 自动提取标题：取内容第一行非空文字，最多30字
const extractTitle = (text: string): string => {
  const lines = (text || "").split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const clean = line.replace(/^#{1,6}\s*/, "").replace(/[*_|>]/g, "").trim();
    if (clean.length >= 5) return clean.substring(0, 40);
  }
  return lines[0]?.substring(0, 40) || "未命名内容";
};
const title = extractTitle(content || "");
    console.log(`[TASK ${taskId}] Generation completed.`);

    // 任务成功完成，状态改为 PENDING_REVIEW
    await db.contentTask.update({
  where: { id: taskId },
  data: {
    content: content,
    title: title,
    status: "PENDING_REVIEW",
  },
});
  } catch (error: unknown) {
    console.error(`[TASK ${taskId}] BACKGROUND_GENERATE_ERROR:`, error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    await db.contentTask.update({
      where: { id: taskId },
      data: { 
        status: "FAILED",
        content: `生成失败原因: ${errorMessage}`
      },
    });
  }
}

export async function POST(req: Request) {
  try {
    const { prompt, channel = "知乎", scene = "内容生成", contentType = "自动识别" } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY.includes("xxx")) {
      return NextResponse.json({ 
        error: "DeepSeek API Key 未正确配置，请在 .env.local 中设置" 
      }, { status: 400 });
    }

    // 1. 在数据库中创建初始任务，状态为 PENDING_GENERATE
    const task = await db.contentTask.create({
      data: {
        title: prompt.substring(0, 50) + (prompt.length > 50 ? "..." : ""),
        channel: channel,
        scene: scene,
        status: "PENDING_GENERATE",
        owner: "AI助手"
      },
    });

    // 2. 异步启动生成过程
    setTimeout(() => {
      runGenerationTask(task.id, prompt, channel, contentType);
    }, 0);

    return NextResponse.json({ taskId: task.id });
  } catch (error: unknown) {
    console.error("[GENERATE_API_ERROR]:", error);
    const message = error instanceof Error ? error.message : "内部错误";
    return NextResponse.json({ 
      error: `接口调用失败: ${message}` 
    }, { status: 500 });
  }
}
