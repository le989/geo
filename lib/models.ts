import { db } from "@/lib/db";
import { encryptApiKey } from "@/lib/crypto";

type PresetModel = {
  name: string;
  provider: string;
  baseURL: string;
  modelName: string;
  envKey?: string;
};

const PRESETS: PresetModel[] = [
  { name: "DeepSeek Chat", provider: "deepseek", baseURL: "https://api.deepseek.com", modelName: "deepseek-chat", envKey: "DEEPSEEK_API_KEY" },
  { name: "千问 Max", provider: "qwen", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", modelName: "qwen-max" },
  { name: "豆包", provider: "doubao", baseURL: "https://ark.cn-beijing.volces.com/api/v3", modelName: "YOUR_ENDPOINT" },
  { name: "文心 4.5", provider: "wenxin", baseURL: "https://qianfan.baidubce.com/v2", modelName: "ernie-4.5-8k" },
  { name: "Kimi", provider: "kimi", baseURL: "https://api.moonshot.cn/v1", modelName: "moonshot-v1-8k" },
  { name: "智谱 GLM", provider: "glm", baseURL: "https://open.bigmodel.cn/api/paas/v4", modelName: "glm-4" },
  { name: "Claude 3.5 Sonnet", provider: "anthropic", baseURL: "https://api.anthropic.com", modelName: "claude-sonnet-4-5" },
  { name: "Claude 3 Haiku", provider: "anthropic", baseURL: "https://api.anthropic.com", modelName: "claude-haiku-4-5-20251001" },
  { name: "GPT-4o", provider: "openai", baseURL: "https://api.openai.com/v1", modelName: "gpt-4o" },
  { name: "GPT-4o mini", provider: "openai", baseURL: "https://api.openai.com/v1", modelName: "gpt-4o-mini" },
  { name: "Gemini 1.5 Pro", provider: "gemini", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", modelName: "gemini-1.5-pro" },
  { name: "Gemini 1.5 Flash", provider: "gemini", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", modelName: "gemini-1.5-flash" },
];

export async function ensurePresetModels() {
  const count = await db.modelConfig.count();
  if (count > 0) return;

  const rows = PRESETS.map((p) => {
    const envVal = p.envKey ? process.env[p.envKey] : undefined;
    const apiKey = envVal ? encryptApiKey(envVal) : "";
    const isActive = Boolean(envVal);
    return {
      name: p.name,
      provider: p.provider,
      baseURL: p.baseURL,
      apiKey,
      modelName: p.modelName,
      isDefault: p.provider === "deepseek",
      isActive,
    };
  });

  await db.modelConfig.createMany({ data: rows });

  const hasDefault = await db.modelConfig.count({ where: { isDefault: true } });
  if (hasDefault === 0) {
    const first = await db.modelConfig.findFirst({ orderBy: { createdAt: "asc" } });
    if (first) {
      await db.modelConfig.update({ where: { id: first.id }, data: { isDefault: true } });
    }
  }
}

