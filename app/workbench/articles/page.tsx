"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Eye, Filter, RefreshCw, Search, Sparkles, Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ContentItem = {
  id: string;
  title: string;
  excerpt: string;
  channel: string;
  scene: string;
  owner: string;
  status: string;
  source: {
    type: string;
    label?: string;
  };
  review: {
    status?: string;
    score?: number;
    summary?: string;
  };
  check: {
    status?: string;
    recommendedAction?: string;
  };
  sample?: {
    id: string;
    taskId: string;
    reason?: string;
    active?: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
  lastEditedAt?: string | null;
};

type SampleItem = {
  id: string;
  taskId: string;
};

type VisibilityHistoryItem = {
  id: string;
  taskId: string;
  taskTitle: string;
  keyword: string;
  platform: string;
  mentionCount: number;
  mentioned: boolean;
  isFirstScreen: boolean;
  sentiment: string;
  cached: boolean;
  queriedAt: string;
  responseText: string;
};

type VisibilityQueryItem = {
  platform: string;
  mentionCount: number;
  mentioned: boolean;
  isFirstScreen: boolean;
  sentiment: string;
  cached: boolean;
  responseText: string;
};

const ALL_FILTER = "all";
const VISIBILITY_PLATFORMS = [
  { key: "deepseek", label: "DeepSeek" },
  { key: "doubao", label: "豆包" },
  { key: "kimi", label: "Kimi" },
  { key: "qwen", label: "通义千问" },
] as const;
const STATUS_LABELS: Record<string, string> = {
  PENDING_GENERATE: "待生产",
  GENERATING: "生成中",
  PENDING_REVIEW: "待审核",
  NEEDS_REVISION: "待返工",
  COMPLETED: "已发布",
  FAILED: "失败",
};
const STATUS_TONES: Record<string, string> = {
  PENDING_GENERATE: "bg-amber-50 text-amber-700",
  GENERATING: "bg-blue-50 text-blue-700",
  PENDING_REVIEW: "bg-purple-50 text-purple-700",
  NEEDS_REVISION: "bg-rose-50 text-rose-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-slate-100 text-slate-600",
};
const SOURCE_LABELS: Record<string, string> = {
  manual: "手动创建",
  topic: "选题库",
  keyword: "关键词",
  brand: "品牌资料",
  monitor: "监测发现",
  sample: "样板复用",
};
const REVIEW_LABELS: Record<string, string> = {
  pass: "可通过",
  revise: "建议修改",
  high_risk: "高风险",
};
const REVIEW_TONES: Record<string, string> = {
  pass: "bg-emerald-50 text-emerald-700",
  revise: "bg-amber-50 text-amber-700",
  high_risk: "bg-rose-50 text-rose-700",
};
const CHECK_LABELS: Record<string, string> = {
  pass: "通过",
  warning: "提醒",
  fail: "阻断",
};
const CHECK_TONES: Record<string, string> = {
  pass: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  fail: "bg-rose-50 text-rose-700",
};

function getRoleFromCookie() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )gf_role=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default function ArticlesPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [sampleTaskIds, setSampleTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER);
  const [sourceFilter, setSourceFilter] = useState(ALL_FILTER);
  const [samplePendingId, setSamplePendingId] = useState<string | null>(null);
  const [role, setRole] = useState("");

  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [visibilityTask, setVisibilityTask] = useState<ContentItem | null>(null);
  const [visibilityKeyword, setVisibilityKeyword] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(VISIBILITY_PLATFORMS.map((item) => item.key));
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [visibilityResults, setVisibilityResults] = useState<VisibilityQueryItem[]>([]);
  const [visibilityHistory, setVisibilityHistory] = useState<VisibilityHistoryItem[]>([]);
  const [visibilityError, setVisibilityError] = useState("");
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const fetchItems = async () => {
    const response = await fetch("/api/content", { cache: "no-store" });
    const data = await response.json();
    setItems(Array.isArray(data) ? data : []);
  };

  const fetchSamples = async () => {
    const response = await fetch("/api/samples", { cache: "no-store" });
    const data = await response.json();
    const ids = Array.isArray(data) ? data.map((item: SampleItem) => item.taskId) : [];
    setSampleTaskIds(ids);
  };

  const loadVisibilityHistory = async (taskId: string) => {
    const response = await fetch(`/api/visibility/history?taskId=${taskId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "获取历史记录失败");
    }
    setVisibilityHistory(Array.isArray(data.items) ? data.items : []);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setRole(getRoleFromCookie());
        await Promise.all([fetchItems(), fetchSamples()]);
      } catch (error) {
        console.error("Failed to fetch content list", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const statusOptions = useMemo(() => [ALL_FILTER, ...Array.from(new Set(items.map((item) => item.status)))], [items]);
  const sourceOptions = useMemo(() => [ALL_FILTER, ...Array.from(new Set(items.map((item) => item.source?.type || "manual")))], [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === ALL_FILTER || item.status === statusFilter;
      const matchesSource = sourceFilter === ALL_FILTER || (item.source?.type || "manual") === sourceFilter;
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [items, searchQuery, statusFilter, sourceFilter]);

  const stats = {
    total: items.length,
    editable: items.filter((item) => ["PENDING_REVIEW", "NEEDS_REVISION", "COMPLETED"].includes(item.status)).length,
    highRisk: items.filter((item) => item.review?.status === "high_risk" || item.check?.status === "fail").length,
    samples: sampleTaskIds.length,
  };

  const updateSample = async (taskId: string, shouldAdd: boolean) => {
    setSamplePendingId(taskId);
    try {
      const response = await fetch(shouldAdd ? "/api/samples" : `/api/samples?taskId=${taskId}`,
        {
          method: shouldAdd ? "POST" : "DELETE",
          headers: shouldAdd ? { "Content-Type": "application/json" } : undefined,
          body: shouldAdd ? JSON.stringify({ taskId }) : undefined,
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || (shouldAdd ? "加入样板库失败" : "移出样板库失败"));
        return;
      }
      await Promise.all([fetchItems(), fetchSamples()]);
    } finally {
      setSamplePendingId(null);
    }
  };

  const openVisibilityDialog = async (item: ContentItem) => {
    setVisibilityTask(item);
    setVisibilityKeyword(item.title || item.source?.label || "");
    setVisibilityResults([]);
    setVisibilityError("");
    setHistoryExpanded(false);
    setVisibilityOpen(true);
    try {
      await loadVisibilityHistory(item.id);
    } catch (error) {
      setVisibilityError(error instanceof Error ? error.message : "获取历史记录失败");
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]
    );
  };

  const runVisibilityQuery = async () => {
    if (!visibilityTask || !visibilityKeyword.trim() || selectedPlatforms.length === 0) {
      setVisibilityError("请输入关键词并至少选择一个平台");
      return;
    }

    setVisibilityLoading(true);
    setVisibilityError("");
    try {
      const response = await fetch("/api/visibility/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: visibilityTask.id,
          keyword: visibilityKeyword.trim(),
          platforms: selectedPlatforms,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "AI 可见性查询失败");
      }
      setVisibilityResults(Array.isArray(data.items) ? data.items : []);
      await loadVisibilityHistory(visibilityTask.id);
    } catch (error) {
      setVisibilityError(error instanceof Error ? error.message : "AI 可见性查询失败");
    } finally {
      setVisibilityLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-medium text-[#0071e3]">内容沉淀</div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">文章列表</h1>
          <p className="mt-2 text-sm text-slate-500">查看已生成内容，继续编辑，并按审核、发布风险和样板沉淀状态筛选。</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="rounded-xl border-slate-200">
            <Link href="/workbench/samples">查看样板库</Link>
          </Button>
          <Button asChild className="rounded-xl bg-[#0071e3] px-5 hover:bg-[#0071e3]/90">
            <Link href="/workbench/factory">新建内容</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5"><div className="text-sm text-slate-500">内容总数</div><div className="mt-3 text-3xl font-bold text-slate-900">{stats.total}</div></CardContent></Card>
        <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5"><div className="text-sm text-slate-500">可继续编辑</div><div className="mt-3 text-3xl font-bold text-slate-900">{stats.editable}</div></CardContent></Card>
        <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5"><div className="text-sm text-slate-500">高风险待处理</div><div className="mt-3 text-3xl font-bold text-rose-600">{stats.highRisk}</div></CardContent></Card>
        <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5"><div className="text-sm text-slate-500">样板沉淀数</div><div className="mt-3 text-3xl font-bold text-amber-600">{stats.samples}</div></CardContent></Card>
      </div>

      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索标题或摘要..." className="h-11 rounded-xl border-slate-200 pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200"><SelectValue placeholder="任务状态" /></SelectTrigger>
              <SelectContent>{statusOptions.map((status) => <SelectItem key={status} value={status}>{status === ALL_FILTER ? "全部状态" : STATUS_LABELS[status] || status}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200"><SelectValue placeholder="内容来源" /></SelectTrigger>
              <SelectContent>{sourceOptions.map((source) => <SelectItem key={source} value={source}>{source === ALL_FILTER ? "全部来源" : SOURCE_LABELS[source] || source}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" className="h-11 rounded-xl border-slate-200" onClick={() => { setSearchQuery(""); setStatusFilter(ALL_FILTER); setSourceFilter(ALL_FILTER); }}>
              <Filter className="mr-2 h-4 w-4" />重置筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="flex items-center justify-center gap-2 p-8 text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" />正在加载文章列表...</CardContent></Card>
        ) : filteredItems.length ? (
          filteredItems.map((item) => {
            const inSamples = sampleTaskIds.includes(item.id) || Boolean(item.sample?.active);
            return (
              <Card key={item.id} className="rounded-2xl border-slate-100 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className={cn("rounded-full px-2.5 py-1 font-semibold", STATUS_TONES[item.status] || "bg-slate-100 text-slate-600")}>{STATUS_LABELS[item.status] || item.status}</span>
                        {inSamples ? <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">优质样板</span> : null}
                        <span>{SOURCE_LABELS[item.source?.type || "manual"] || "手动创建"}</span>
                        <span>{item.channel}</span>
                        <span>{item.scene}</span>
                      </div>
                      <div className="text-xl font-bold text-slate-900">{item.title || "未命名内容"}</div>
                      <p className="max-w-4xl text-sm leading-relaxed text-slate-600">{item.excerpt || "暂无摘要"}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button asChild variant="outline" className="rounded-xl border-slate-200"><Link href={"/workbench/factory?taskId=" + item.id}>继续编辑</Link></Button>
                      {role !== "viewer" ? (
                        <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => void openVisibilityDialog(item)}>
                          <Eye className="mr-2 h-4 w-4" />查询 AI 可见性
                        </Button>
                      ) : null}
                      <Button variant="outline" className={cn("rounded-xl", inSamples ? "border-amber-200 text-amber-700 hover:bg-amber-50" : "border-slate-200")} disabled={samplePendingId === item.id} onClick={() => updateSample(item.id, !inSamples)}>
                        {inSamples ? <StarOff className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />}
                        {inSamples ? "移出样板库" : "加入样板库"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 px-4 py-3"><div className="text-xs text-slate-400">负责人</div><div className="mt-1 text-sm font-medium text-slate-700">{item.owner}</div></div>
                    <div className="rounded-xl bg-slate-50 px-4 py-3"><div className="text-xs text-slate-400">AI审核</div><div className="mt-1 flex items-center gap-2"><span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", REVIEW_TONES[item.review?.status || "revise"] || "bg-slate-100 text-slate-600")}>{REVIEW_LABELS[item.review?.status || "revise"] || "建议修改"}</span><span className="text-xs text-slate-400">{typeof item.review?.score === "number" ? `评分 ${item.review.score}` : "--"}</span></div></div>
                    <div className="rounded-xl bg-slate-50 px-4 py-3"><div className="text-xs text-slate-400">发布前检查</div><div className="mt-1 flex items-center gap-2"><span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", CHECK_TONES[item.check?.status || "warning"] || "bg-slate-100 text-slate-600")}>{CHECK_LABELS[item.check?.status || "warning"] || "提醒"}</span></div></div>
                    <div className="rounded-xl bg-slate-50 px-4 py-3"><div className="text-xs text-slate-400">最后更新</div><div className="mt-1 text-sm font-medium text-slate-700">{new Date(item.lastEditedAt || item.updatedAt).toLocaleString("zh-CN")}</div></div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center text-slate-500"><BookOpen className="h-8 w-8 text-slate-300" /><div className="text-base font-medium text-slate-700">没有匹配的文章</div><p className="max-w-md text-sm">调整筛选条件或先从生成页创建一篇新内容。</p></CardContent></Card>
        )}
      </div>

      <Dialog open={visibilityOpen} onOpenChange={setVisibilityOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>查询 AI 可见性</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-medium text-slate-900">{visibilityTask?.title || "未选择文章"}</div>
              <div className="mt-1">渠道：{visibilityTask?.channel || "--"} / 场景：{visibilityTask?.scene || "--"}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_1.4fr_auto] lg:items-end">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">查询关键词</label>
                  <Input value={visibilityKeyword} onChange={(event) => setVisibilityKeyword(event.target.value)} placeholder="例如：激光传感器" />
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">查询平台</div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {VISIBILITY_PLATFORMS.map((platform) => (
                      <label key={platform.key} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(platform.key)}
                          onChange={() => togglePlatform(platform.key)}
                        />
                        <span>{platform.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button className="rounded-xl bg-[#0071e3] px-6 hover:bg-[#0071e3]/90" disabled={visibilityLoading} onClick={() => void runVisibilityQuery()}>
                  {visibilityLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  开始查询
                </Button>
              </div>
              {visibilityError ? <div className="mt-3 text-sm text-rose-600">{visibilityError}</div> : null}
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-4 text-sm font-medium text-slate-900">本次查询结果</div>
              {visibilityResults.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {visibilityResults.map((result) => (
                    <div key={result.platform} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-900">{VISIBILITY_PLATFORMS.find((item) => item.key === result.platform)?.label || result.platform}</div>
                          <div className="mt-1 text-xs text-slate-400">{result.cached ? "缓存结果" : "实时查询"}</div>
                        </div>
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", result.mentioned ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{result.mentioned ? "已提及" : "未提及"}</span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-white px-3 py-2">
                          <div className="text-xs text-slate-400">提及次数</div>
                          <div className="mt-1 text-sm font-medium text-slate-800">{result.mentionCount}</div>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2">
                          <div className="text-xs text-slate-400">是否首屏</div>
                          <div className="mt-1 text-sm font-medium text-slate-800">{result.isFirstScreen ? "是" : "否"}</div>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 sm:col-span-2">
                          <div className="text-xs text-slate-400">情感倾向</div>
                          <div className="mt-1 text-sm font-medium text-slate-800">{result.sentiment}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">还没有查询结果，选择关键词和平台后点击开始查询。</div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setHistoryExpanded((value) => !value)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">历史查询记录</div>
                  <div className="mt-1 text-xs text-slate-400">展开后查看该文章的历史 AI 可见性查询结果</div>
                </div>
                {historyExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              </button>
              {historyExpanded ? (
                <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                  <div className="max-h-[260px] space-y-3 overflow-y-auto pr-1">
                    {visibilityHistory.length ? (
                      visibilityHistory.map((item) => (
                        <div key={item.id} className="rounded-xl bg-slate-50 p-4 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium text-slate-900">{item.keyword}</div>
                              <div className="mt-1 text-xs text-slate-400">{item.taskTitle || "未命名文章"}</div>
                            </div>
                            <div className="text-xs text-slate-400">{new Date(item.queriedAt).toLocaleString("zh-CN")}</div>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                            <div>平台：{VISIBILITY_PLATFORMS.find((platform) => platform.key === item.platform)?.label || item.platform}</div>
                            <div>提及次数：{item.mentionCount}</div>
                            <div>是否首屏：{item.isFirstScreen ? "是" : "否"}</div>
                            <div>情感：{item.sentiment}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500">暂无历史记录</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
