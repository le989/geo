"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { AlertCircle, BarChart3, Eye, Globe, Loader2, PlayCircle, Search, ShieldAlert, TrendingUp } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LABELS = {
  title: "品牌监测中心",
  subtitle: "用默认模型按预设问题执行品牌监测，查看最新命中结果和趋势变化。",
  runNow: "立即执行监测",
  running: "监测执行中...",
  coverage: "最新命中率",
  latestRun: "最近一次运行",
  platforms: "监测平台",
  trend: "命中趋势",
  trendDesc: "近 30 天各平台品牌命中率变化",
  latestDetail: "最新运行明细",
  noData: "暂无监测结果，请先执行一次监测。",
  resultQuestion: "监测问题",
  resultPlatform: "平台",
  resultMentioned: "品牌提及",
  resultQuality: "产品匹配",
  resultRisk: "风险检查",
  resultAnswer: "回答摘要",
  mentionedYes: "已提及",
  mentionedNo: "未提及",
  qualityYes: "匹配",
  qualityNo: "待确认",
  riskYes: "有风险",
  riskNo: "正常",
  unknown: "--",
  visibilityTitle: "AI 可见性历史",
  visibilitySubtitle: "查看按关键词和平台发起的 AI 可见性查询记录与趋势。",
};

const PLATFORM_COLORS: Record<string, string> = {
  知乎: "#0071e3",
  今日头条: "#ff6b57",
  百家号: "#15a34a",
  deepseek: "#2563eb",
  doubao: "#ef4444",
  kimi: "#10b981",
  qwen: "#f59e0b",
};

type MonitorChartEntry = Record<string, string | number>;
type MonitorResultRow = {
  id?: string;
  platform: string;
  question: string;
  mentioned: boolean;
  position: string;
  productCorrect: boolean;
  hasFactError: boolean;
  factErrorNote: string;
  rawAnswer: string;
  runAt: string;
};

type PlatformBreakdown = {
  platform: string;
  rate: number;
  total: number;
  mentioned: number;
};

type MonitorStats = {
  chartData: MonitorChartEntry[];
  overallRate: number;
  platforms: string[];
  latestRunAt: string | null;
  latestResults: MonitorResultRow[];
  latestPlatformBreakdown: PlatformBreakdown[];
  totalQuestions: number;
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

type VisibilityHistoryResponse = {
  items: VisibilityHistoryItem[];
  platformTrend: MonitorChartEntry[];
};

function formatDateTime(value: string | null) {
  if (!value) return LABELS.unknown;
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shorten(text: string, max = 72) {
  const value = String(text || "").trim();
  if (!value) return LABELS.unknown;
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export default function MonitorPage() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [visibility, setVisibility] = useState<VisibilityHistoryResponse>({ items: [], platformTrend: [] });
  const [error, setError] = useState("");

  async function fetchStats() {
    const [statsResponse, visibilityResponse] = await Promise.all([
      fetch("/api/monitor/stats", { cache: "no-store" }),
      fetch("/api/visibility/history", { cache: "no-store" }),
    ]);

    const statsData = await statsResponse.json();
    if (!statsResponse.ok) {
      throw new Error(statsData.error || LABELS.noData);
    }

    const visibilityData = await visibilityResponse.json().catch(() => ({ items: [], platformTrend: [] }));
    if (visibilityResponse.ok) {
      setVisibility({
        items: Array.isArray(visibilityData.items) ? visibilityData.items : [],
        platformTrend: Array.isArray(visibilityData.platformTrend) ? visibilityData.platformTrend : [],
      });
    } else {
      setVisibility({ items: [], platformTrend: [] });
    }

    setStats(statsData);
  }

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError("");
        await fetchStats();
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : LABELS.noData);
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

  async function handleRun() {
    try {
      setRunning(true);
      setError("");
      const response = await fetch("/api/monitor/run", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || LABELS.noData);
      }
      await fetchStats();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : LABELS.noData);
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0071e3]" />
      </div>
    );
  }

  const visibilityPlatforms = Array.from(new Set(visibility.items.map((item) => item.platform)));

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{LABELS.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{LABELS.subtitle}</p>
        </div>
        <Button onClick={handleRun} disabled={running} className="rounded-full bg-[#0071e3] px-6 text-white hover:bg-[#0071e3]/90">
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
          {running ? LABELS.running : LABELS.runNow}
        </Button>
      </div>

      {error ? (
        <Card className="border border-rose-200 bg-rose-50 shadow-none">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-rose-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none bg-blue-50 shadow-sm"><CardContent className="flex items-center justify-between p-6"><div><p className="text-sm font-medium text-blue-600">{LABELS.coverage}</p><p className="mt-2 text-3xl font-bold text-slate-900">{stats?.overallRate ?? 0}%</p></div><div className="rounded-2xl bg-blue-500/10 p-3 text-blue-600"><TrendingUp className="h-6 w-6" /></div></CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="flex items-center justify-between p-6"><div><p className="text-sm font-medium text-slate-500">{LABELS.latestRun}</p><p className="mt-2 text-xl font-semibold text-slate-900">{formatDateTime(stats?.latestRunAt ?? null)}</p></div><div className="rounded-2xl bg-slate-100 p-3 text-slate-600"><Search className="h-6 w-6" /></div></CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="flex items-center justify-between p-6"><div><p className="text-sm font-medium text-slate-500">{LABELS.platforms}</p><p className="mt-2 text-3xl font-bold text-slate-900">{stats?.platforms?.length ?? 0}</p><p className="mt-2 text-xs text-slate-400">{stats?.platforms?.join(" / ") || LABELS.unknown}</p></div><div className="rounded-2xl bg-slate-100 p-3 text-slate-600"><Globe className="h-6 w-6" /></div></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-slate-900"><BarChart3 className="mr-2 h-5 w-5 text-[#0071e3]" />{LABELS.trend}</CardTitle>
            <CardDescription>{LABELS.trendDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              {(stats?.chartData?.length ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    {stats?.platforms?.map((platform) => (
                      <Line key={platform} type="monotone" dataKey={platform} stroke={PLATFORM_COLORS[platform] || "#64748b"} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-slate-400"><AlertCircle className="mb-2 h-10 w-10 opacity-20" /><p>{LABELS.noData}</p></div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-slate-900"><ShieldAlert className="mr-2 h-5 w-5 text-[#0071e3]" />{LABELS.latestRun}</CardTitle>
            <CardDescription>{formatDateTime(stats?.latestRunAt ?? null)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.latestPlatformBreakdown?.length ?? 0) > 0 ? stats?.latestPlatformBreakdown.map((item) => (
              <div key={item.platform} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center justify-between"><p className="font-medium text-slate-900">{item.platform}</p><span className="text-sm font-semibold text-[#0071e3]">{item.rate}%</span></div><p className="mt-2 text-xs text-slate-500">{item.mentioned} / {item.total} {LABELS.coverage}</p></div>
            )) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-400">{LABELS.noData}</div>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-900">{LABELS.latestDetail}</CardTitle>
          <CardDescription>{stats?.latestResults?.length ?? 0} / {stats?.totalQuestions ?? 0} {LABELS.resultQuestion}</CardDescription>
        </CardHeader>
        <CardContent>
          {(stats?.latestResults?.length ?? 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead><tr className="border-b border-slate-100 text-slate-500"><th className="px-4 py-3">{LABELS.resultQuestion}</th><th className="px-4 py-3">{LABELS.resultPlatform}</th><th className="px-4 py-3">{LABELS.resultMentioned}</th><th className="px-4 py-3">{LABELS.resultQuality}</th><th className="px-4 py-3">{LABELS.resultRisk}</th><th className="px-4 py-3">{LABELS.resultAnswer}</th></tr></thead>
                <tbody>
                  {stats?.latestResults.map((item) => (
                    <tr key={`${item.platform}-${item.question}`} className="border-b border-slate-50 align-top">
                      <td className="px-4 py-4 font-medium text-slate-900">{item.question}</td>
                      <td className="px-4 py-4 text-slate-600">{item.platform}</td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.mentioned ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{item.position || (item.mentioned ? LABELS.mentionedYes : LABELS.mentionedNo)}</span></td>
                      <td className="px-4 py-4 text-slate-600">{item.productCorrect ? LABELS.qualityYes : LABELS.qualityNo}</td>
                      <td className="px-4 py-4 text-slate-600">{item.hasFactError ? item.factErrorNote || LABELS.riskYes : LABELS.riskNo}</td>
                      <td className="max-w-[420px] px-4 py-4 text-slate-500">{shorten(item.rawAnswer)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">{LABELS.noData}</div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-lg text-slate-900"><Eye className="mr-2 h-5 w-5 text-[#0071e3]" />{LABELS.visibilityTitle}</CardTitle>
          <CardDescription>{LABELS.visibilitySubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border border-slate-100 shadow-none"><CardContent className="p-5"><div className="text-sm text-slate-500">历史查询次数</div><div className="mt-3 text-3xl font-bold text-slate-900">{visibility.items.length}</div></CardContent></Card>
            <Card className="border border-slate-100 shadow-none"><CardContent className="p-5"><div className="text-sm text-slate-500">覆盖平台</div><div className="mt-3 text-3xl font-bold text-slate-900">{visibilityPlatforms.length}</div><div className="mt-2 text-xs text-slate-400">{visibilityPlatforms.join(" / ") || LABELS.unknown}</div></CardContent></Card>
            <Card className="border border-slate-100 shadow-none"><CardContent className="p-5"><div className="text-sm text-slate-500">品牌被提及次数</div><div className="mt-3 text-3xl font-bold text-slate-900">{visibility.items.filter((item) => item.mentioned).length}</div></CardContent></Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Card className="border border-slate-100 shadow-none">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">平台趋势</CardTitle>
                <CardDescription>近 24 小时缓存也计入历史走势。</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  {visibility.platformTrend.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={visibility.platformTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                        <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                        {visibilityPlatforms.map((platform) => (
                          <Line key={platform} type="monotone" dataKey={platform} stroke={PLATFORM_COLORS[platform] || "#64748b"} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">暂无可见性趋势数据</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-100 shadow-none">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">最近查询记录</CardTitle>
                <CardDescription>按查询时间倒序展示最近 10 条记录。</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                  {visibility.items.length ? visibility.items.slice(0, 10).map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-900">{item.keyword}</div>
                          <div className="mt-1 text-xs text-slate-400">{item.taskTitle || "未命名文章"}</div>
                        </div>
                        <div className="text-xs text-slate-400">{formatDateTime(item.queriedAt)}</div>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                        <div>平台：{item.platform}</div>
                        <div>提及次数：{item.mentionCount}</div>
                        <div>是否首屏：{item.isFirstScreen ? "是" : "否"}</div>
                        <div>情感：{item.sentiment}</div>
                      </div>
                    </div>
                  )) : <div className="text-sm text-slate-400">暂无可见性查询记录</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
