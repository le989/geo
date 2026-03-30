"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  PlugZap,
  Star,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ModelStats = {
  callsThisMonth: number;
  avgDurationMs: number | null;
  successRate: number | null;
};

type ModelRow = {
  id: string;
  name: string;
  provider: string;
  baseURL: string;
  modelName: string;
  isDefault: boolean;
  isActive: boolean;
  status: string;
  createdAt: string;
  maskedKey?: string;
  complianceScore?: number | null;
  complianceStatus?: string | null;
  complianceTestedAt?: string | null;
  stats: ModelStats;
};

type ProviderOption = {
  value: string;
  label: string;
  baseURL?: string;
  modelName?: string;
  name?: string;
};

const PROVIDERS: ProviderOption[] = [
  { value: "deepseek", label: "DeepSeek", baseURL: "https://api.deepseek.com", modelName: "deepseek-chat", name: "DeepSeek Chat" },
  { value: "qwen", label: "千问", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", modelName: "qwen-max", name: "千问 Max" },
  { value: "doubao", label: "豆包", baseURL: "https://ark.cn-beijing.volces.com/api/v3", modelName: "YOUR_ENDPOINT", name: "豆包" },
  { value: "wenxin", label: "文心", baseURL: "https://qianfan.baidubce.com/v2", modelName: "ernie-4.5-8k", name: "文心 4.5" },
  { value: "kimi", label: "Kimi", baseURL: "https://api.moonshot.cn/v1", modelName: "moonshot-v1-8k", name: "Kimi" },
  { value: "glm", label: "智谱 GLM", baseURL: "https://open.bigmodel.cn/api/paas/v4", modelName: "glm-4", name: "智谱 GLM" },
  { value: "openai", label: "OpenAI", baseURL: "https://api.openai.com/v1", modelName: "gpt-4o", name: "GPT-4o" },
  { value: "gemini", label: "Gemini(OpenAI兼容)", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", modelName: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  { value: "anthropic", label: "Anthropic(Claude)", baseURL: "https://api.anthropic.com", modelName: "claude-sonnet-4-5", name: "Claude 3.5 Sonnet" },
  { value: "custom", label: "自定义(OpenAI兼容)" },
];

function providerBadge(provider: string) {
  const intl = ["openai", "gemini", "anthropic"].includes(provider);
  return intl
    ? "bg-purple-50 text-purple-700 border-purple-100"
    : "bg-blue-50 text-blue-700 border-blue-100";
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : "";
}

async function parseApiResponse(res: Response) {
  const rawText = await res.text();
  if (!rawText) {
    return { ok: false, error: `请求失败：${res.status}` };
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return { ok: false, error: rawText };
  }
}

function complianceTone(status?: string | null) {
  if (status === "passed") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (status === "warning") return "border-amber-100 bg-amber-50 text-amber-700";
  if (status === "failed") return "border-red-100 bg-red-50 text-red-700";
  return "border-zinc-100 bg-zinc-50 text-zinc-500";
}

function complianceLabel(status?: string | null) {
  if (status === "passed") return "通过";
  if (status === "warning") return "警告";
  if (status === "failed") return "风险";
  return "未测试";
}

export default function ModelsPage() {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [complianceId, setComplianceId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "compliance_desc">("default");

  const [form, setForm] = useState({
    name: "",
    provider: "custom",
    baseURL: "",
    apiKey: "",
    modelName: "",
  });

  const estimated = useMemo(() => models.filter((m) => m.isActive).length, [models]);
  const canManageModels = ["admin", "editor"].includes(getCookieValue("gf_role"));

  const sortedModels = useMemo(() => {
    const list = [...models];
    if (sortBy === "compliance_desc") {
      return list.sort((a, b) => {
        const aScore = typeof a.complianceScore === "number" ? a.complianceScore : -1;
        const bScore = typeof b.complianceScore === "number" ? b.complianceScore : -1;
        if (bScore !== aScore) return bScore - aScore;
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return list;
  }, [models, sortBy]);

  const applyProviderDefaults = (provider: string) => {
    const preset = PROVIDERS.find((item) => item.value === provider);
    setForm((current) => ({
      ...current,
      provider,
      name: current.name.trim() ? current.name : preset?.name || "",
      baseURL: preset?.baseURL || current.baseURL,
      modelName: preset?.modelName || current.modelName,
    }));
  };

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/models", { cache: "no-store" });
      const data = await parseApiResponse(res);
      setModels(Array.isArray(data.models) ? data.models : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canManageModels) {
      window.location.href = "/workbench/forbidden";
      return;
    }
    void fetchModels();
  }, [canManageModels]);

  const createModel = async () => {
    const payload = {
      name: form.name.trim(),
      provider: form.provider,
      baseURL: form.baseURL.trim(),
      apiKey: form.apiKey.trim(),
      modelName: form.modelName.trim(),
    };

    if (!payload.name || !payload.provider || !payload.baseURL || !payload.modelName || !payload.apiKey.trim()) {
      alert("请填写完整的模型名称、Provider、Base URL、Model Name 和 API Key。");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        alert(data.error || "新增模型失败");
        return;
      }

      setOpen(false);
      setForm({ name: "", provider: "custom", baseURL: "", apiKey: "", modelName: "" });
      await fetchModels();
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: string) => {
    const target = models.find((item) => item.id === id);
    if (!target) return;

    if (!target.complianceTestedAt) {
      const goOn = confirm("该模型还没有合规测试记录，仍要设为默认模型吗？");
      if (!goOn) return;
    }

    const res = await fetch("/api/models", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isDefault: true }),
    });
    const data = await parseApiResponse(res);
    if (!res.ok) {
      alert(data.error || "设置默认模型失败");
      return;
    }
    await fetchModels();
  };

  const deleteModel = async (id: string) => {
    if (!confirm("确定要删除这个模型配置吗？")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/models?id=${id}`, { method: "DELETE" });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        alert(data.error || "删除模型失败");
        return;
      }
      await fetchModels();
    } finally {
      setDeletingId(null);
    }
  };

  const testModel = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch("/api/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await parseApiResponse(res);
      if (res.ok && data.ok) {
        alert(`测试成功：${data.latencyMs}ms\n${data.sample || "OK"}`);
      } else {
        alert(`测试失败：${data.error || `请求失败：${res.status}`}`);
      }
    } finally {
      setTestingId(null);
    }
  };

  const runCompliance = async (id: string) => {
    setComplianceId(id);
    try {
      const res = await fetch("/api/models/compliance/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: id }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        alert(data.error || "运行合规测试失败");
        return;
      }
      alert(
        `合规测试完成\n禁用词规避率：${Math.round((data.forbiddenAvoidanceRate || 0) * 100)}%\n品牌信息引用准确率：${Math.round((data.brandAccuracyRate || 0) * 100)}%\n综合得分：${Math.round(data.overallScore || 0)}`,
      );
      await fetchModels();
    } finally {
      setComplianceId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">模型管理</h2>
          <p className="mt-1 text-sm text-zinc-500">统一维护可用模型、默认模型、联通测试和合规得分。</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as "default" | "compliance_desc")}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">默认排序</SelectItem>
              <SelectItem value="compliance_desc">合规得分从高到低</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="border-none bg-[#0071e3] text-white hover:bg-[#0071e3]/90">
                <Plus className="mr-2 h-4 w-4" />
                新增模型
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>新增模型</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 py-2">
                <Input placeholder="模型名称，例如 DeepSeek Chat" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
                <Select value={form.provider} onValueChange={applyProviderDefaults}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择 Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Base URL，例如 https://api.deepseek.com" value={form.baseURL} onChange={(e) => setForm((current) => ({ ...current, baseURL: e.target.value }))} />
                <Input placeholder="Model Name，例如 deepseek-chat / gpt-4o" value={form.modelName} onChange={(e) => setForm((current) => ({ ...current, modelName: e.target.value }))} />
                <Input placeholder="API Key" type="password" value={form.apiKey} onChange={(e) => setForm((current) => ({ ...current, apiKey: e.target.value }))} />
                <p className="text-xs text-zinc-500">选择内置 Provider 后会自动带出默认 Base URL 和 Model Name，你也可以按实际要求修改。</p>
              </div>
              <DialogFooter>
                <Button onClick={createModel} disabled={saving} className="border-none bg-[#0071e3] text-white hover:bg-[#0071e3]/90">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  保存模型
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="apple-card border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">模型列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="py-16 text-center text-zinc-400">
              <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
              正在加载模型列表...
            </div>
          ) : sortedModels.length === 0 ? (
            <div className="py-16 text-center text-zinc-400">暂无模型配置</div>
          ) : (
            sortedModels.map((model) => (
              <div key={model.id} className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-bold text-slate-800 dark:text-zinc-200">{model.name}</div>
                      {model.isDefault ? <span className="rounded border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">默认模型</span> : null}
                      <span className={cn("rounded border px-2 py-0.5 text-[10px] font-bold", providerBadge(model.provider))}>{model.provider}</span>
                      <span className={cn("rounded border px-2 py-0.5 text-[10px] font-bold", model.isActive ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-zinc-100 bg-zinc-50 text-zinc-500")}>{model.isActive ? "可用" : "未启用"}</span>
                      <span className={cn("rounded border px-2 py-0.5 text-[10px] font-bold", complianceTone(model.complianceStatus))}>{complianceLabel(model.complianceStatus)}</span>
                    </div>
                    <div className="mt-1 break-all text-xs text-zinc-500">
                      {model.baseURL} · {model.modelName}
                      {model.maskedKey ? <span className="ml-2 inline-flex items-center gap-1">Key: {model.maskedKey}</span> : null}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60">
                        <div className="text-[11px] text-zinc-400">本月调用</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-zinc-100">{model.stats.callsThisMonth}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60">
                        <div className="text-[11px] text-zinc-400">平均耗时</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-zinc-100">{model.stats.avgDurationMs ?? "-"} ms</div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60">
                        <div className="text-[11px] text-zinc-400">成功率</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-zinc-100">{model.stats.successRate === null ? "-" : `${model.stats.successRate}%`}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60">
                        <div className="text-[11px] text-zinc-400">合规得分</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-zinc-100">{typeof model.complianceScore === "number" ? Math.round(model.complianceScore) : "未测试"}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60">
                        <div className="text-[11px] text-zinc-400">最近测试</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-zinc-100">{model.complianceTestedAt ? new Date(model.complianceTestedAt).toLocaleString("zh-CN") : "暂无记录"}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => runCompliance(model.id)} disabled={complianceId === model.id}>
                      {complianceId === model.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1 h-4 w-4" />}运行合规测试
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setDefault(model.id)} disabled={model.isDefault}>
                      <Star className="mr-1 h-4 w-4" />设为默认
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => testModel(model.id)} disabled={testingId === model.id}>
                      {testingId === model.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PlugZap className="mr-1 h-4 w-4" />}测试
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl border-red-200 text-red-600 hover:bg-red-50" onClick={() => deleteModel(model.id)} disabled={deletingId === model.id}>
                      {deletingId === model.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}删除
                    </Button>
                  </div>
                </div>
                {!model.complianceTestedAt ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <TriangleAlert className="h-4 w-4" />
                    该模型还没有合规测试记录，建议设为默认前先跑一次测试。
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-zinc-400">当前启用模型数：{estimated}。建议新增模型后先点一次“测试”，再运行“合规测试”，确认基础联通和品牌约束表现都正常。</div>
    </div>
  );
}
