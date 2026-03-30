import { db } from "@/lib/db";
import brandProfileUtils from "@/lib/brand-profile";

const { buildBrandContext: buildBrandProfileContext } = brandProfileUtils as {
  buildBrandContext: (profile: Record<string, unknown> | null | undefined) => string;
};

const ZHIHU = "知乎";
const TOUTIAO = "今日头条";
const SOHU = "搜狐号";
const NETEASE = "网易号";
const BAIJIAHAO = "百家号";
const AUTO_TYPE = "自动识别";
const KNOWLEDGE_TYPE = "定义科普";
const GUIDE_TYPE = "选型指南";
const COMPARE_TYPE = "竞品对比";
const EXPERIENCE_TYPE = "经验分享";
const APPLICATION_TYPE = "行业应用";
const SCENE_FALLBACK = "自主创作";
const BATCH_SCENE = "批量生成";

export type ModelConfigLite = {
  id: string;
  provider: string;
  baseURL: string;
  apiKey: string;
  modelName: string;
};

export async function buildBrandContextFromDb() {
  const brandProfile = await db.brandProfile.findFirst();
  return buildBrandProfileContext(brandProfile);
}

export async function buildBrandContext() {
  return buildBrandContextFromDb();
}

export function normalizeContentType(prompt: string, contentType?: string) {
  if (contentType && contentType !== AUTO_TYPE) return contentType;
  if (/是什么|怎么理解|解读|详解/u.test(prompt)) return KNOWLEDGE_TYPE;
  if (/怎么选|如何选|选型/u.test(prompt)) return GUIDE_TYPE;
  if (/对比|区别|差距/u.test(prompt)) return COMPARE_TYPE;
  if (/应用|场景|案例/u.test(prompt)) return APPLICATION_TYPE;
  return EXPERIENCE_TYPE;
}

function channelStyleGuide(channel: string) {
  if (channel === ZHIHU) {
    return [
      "写得像有一线经验的工程师或技术负责人。",
      "可以适度使用第一人称，但重点是经验和判断，不要像口播脚本。",
      "语气真诚、直接、专业，避免官话和营销话术。",
    ].join(" ");
  }

  if ([TOUTIAO, SOHU, NETEASE].includes(channel)) {
    return [
      "写得像行业媒体的深度稿件。",
      "开头直接给出最重要结论。",
      "段落紧凑，信息密度高，适合阅读和转载。",
    ].join(" ");
  }

  if (channel === BAIJIAHAO) {
    return [
      "写得像企业自媒体的成熟行业文章。",
      "结构清晰，强调实操价值和选型建议。",
      "可以适度体现品牌专业度，但不要生硬推销。",
    ].join(" ");
  }

  return "使用专业、克制、实用的中文工业内容写作风格。";
}

function contentTypeGuide(contentType: string) {
  if (contentType === KNOWLEDGE_TYPE) {
    return [
      "开头先用一句话说清概念。",
      "正文解释关键参数、常见误区和现场应用。",
      "结尾给出一句可直接引用的简洁结论。",
    ].join(" ");
  }

  if (contentType === GUIDE_TYPE) {
    return [
      "把文章写成选型决策指南。",
      "至少包含三个明确步骤，每一步都要有判断条件和建议。",
      "优先写现场选型时真正会踩的坑。",
    ].join(" ");
  }

  if (contentType === COMPARE_TYPE) {
    return [
      "对比维度要围绕工程上真正关心的参数：精度、量程、安装、环境、防护、维护、成本和交付。",
      "出现参数对比时，输出合法 Markdown 表格。",
    ].join(" ");
  }

  if (contentType === APPLICATION_TYPE) {
    return [
      "内容必须落到具体工业场景。",
      "每个场景都要写清设备、问题和解决思路。",
    ].join(" ");
  }

  return [
    "写成有经验、有判断的实战分享文章。",
    "多写真实取舍、常见误区和落地建议。",
  ].join(" ");
}

export function buildSystemPrompt(options: { brandContext: string; channel: string; contentType: string }) {
  const { brandContext, channel, contentType } = options;

  return [
    "你是一名擅长工业自动化与传感器领域的中文 B2B 内容作者。",
    "整篇文章只输出简体中文正文，不要输出任何解释、提示词痕迹或元信息。",
    "文章必须像真实可发布稿件，不能像 AI 回答。",
    `品牌资料：\n${brandContext}`,
    `渠道风格要求：${channelStyleGuide(channel)}`,
    `内容任务要求：${contentTypeGuide(contentType)}`,
    "硬性要求：",
    "1. 不要出现'下面为你整理''作为 AI''总结一下'这类 AI 套话。",
    "2. 如果品牌资料中有禁用表述，必须避开。",
    "3. 尽量使用品牌资料中的产品线、场景、来源信息，但不要编造不存在的参数。",
    "4. 合理提到凯基特（KJT）及相关系列时，要自然、专业，不要硬广。",
    "5. 结构要清晰，使用有信息量的小标题。",
    "6. 如果出现参数对比，用 Markdown 表格，不要放进代码块。",
    "7. 只有在话题合适时，结尾补 3 到 5 个简短 FAQ。",
    "8. 只输出文章正文。",
  ].join("\n\n");
}

export function buildTitlePrompts(content: string) {
  return {
    systemPrompt: [
      "你负责给中文工业内容起标题。",
      "只返回一个简体中文标题。",
      "长度尽量控制在 10 到 24 个汉字。",
      "不要使用引号、编号、前缀、Markdown 和解释。",
      "不要直接复制正文第一句。",
      "标题要像真实发布文章。",
    ].join(" "),
    userPrompt: `文章正文：\n${content}\n\n请只输出一个正式标题。`,
  };
}

export const copyTextLabels = {
  channels: [ZHIHU, BAIJIAHAO, TOUTIAO, SOHU, NETEASE],
  contentTypes: [AUTO_TYPE, EXPERIENCE_TYPE, KNOWLEDGE_TYPE, GUIDE_TYPE, COMPARE_TYPE, APPLICATION_TYPE],
  defaultScene: SCENE_FALLBACK,
  batchScene: BATCH_SCENE,
};
