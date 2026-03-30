"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Clock3, LayoutDashboard, ShieldAlert, Sparkles, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type QuickAction = {
  label: string;
  href: string;
};

type SuggestionItem = {
  id: string;
  keyword: string;
  title: string;
  scene?: string;
  channel?: string;
  reason?: string;
  score?: number;
};

type ContentItem = {
  id: string;
  title: string;
  excerpt?: string;
  channel?: string;
  scene?: string;
  owner?: string;
  status?: string;
  source?: {
    type?: string;
    label?: string;
  };
  review?: {
    status?: string;
  };
  check?: {
    status?: string;
  };
  updatedAt?: string;
  lastEditedAt?: string | null;
};

type AdminHomeData = {
  role: "admin";
  suggestions: SuggestionItem[];
  overview: {
    totalTasks: number;
    pendingTasks: number;
    highRiskTasks: number;
    publishedThisWeek: number;
    createdThisWeek: number;
    monitorRunsThisWeek: number;
  };
  highRiskItems: ContentItem[];
  latestContents: ContentItem[];
  quickActions: QuickAction[];
};

type EditorHomeData = {
  role: "editor";
  suggestions: SuggestionItem[];
  pendingItems: ContentItem[];
  recentEdited: ContentItem[];
  quickActions: QuickAction[];
};

type ViewerHomeData = {
  role: "viewer";
  publishedItems: ContentItem[];
};

type HomePayload = AdminHomeData | EditorHomeData | ViewerHomeData;

const ROLE_LABELS: Record<string, string> = {
  admin: "管理员视图",
  editor: "编辑视图",
  viewer: "查看视图",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_GENERATE: "待生成",
  GENERATING: "生成中",
  PENDING_REVIEW: "待审核",
  NEEDS_REVISION: "待返工",
  COMPLETED: "已发布",
  FAILED: "失败",
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
  pass: "可进入审核",
  revise: "建议修改",
  high_risk: "高风险",
};

const CHECK_LABELS: Record<string, string> = {
  pass: "通过",
  warning: "提醒",
  fail: "阻断",
};

function formatTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildFactoryHref(item: SuggestionItem) {
  const params = new URLSearchParams();
  params.set("prompt", item.title || item.keyword || "");
  params.set("keyword", item.keyword || "");
  params.set("scene", item.scene || "");
  params.set("channel", item.channel || "");
  params.set("sourceType", "keyword");
  params.set("sourceLabel", item.title || item.keyword || "");
  return `/workbench/factory?${params.toString()}`;
}

function HomeHeader({ role }: { role?: string }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          <LayoutDashboard className="h-3.5 w-3.5" />
          工作台首页
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">今天先从最重要的内容开始</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-zinc-400">
          首页会根据你的角色显示推荐选题、待处理内容和最近产出，方便你直接进入生成、编辑或审核流程。
        </p>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {role ? ROLE_LABELS[role] || role : "正在识别角色"}
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">{title}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function QuickActions({ items }: { items: QuickAction[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</span>
            <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-blue-600" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function SuggestionList({ items }: { items: SuggestionItem[] }) {
  if (!items.length) {
    return <EmptyState title="暂时没有推荐选题" description="先到关键词词库补充关键词，系统会根据优先级和最近产出自动生成推荐。" />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((item) => (
        <Card key={item.id} className="border-slate-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                AI 推荐选题
              </div>
              <div className="text-xs text-slate-500 dark:text-zinc-400">{item.channel || "未指定渠道"}</div>
            </div>
            <CardTitle className="text-lg leading-7 text-slate-900 dark:text-white">{item.title}</CardTitle>
            <CardDescription className="text-sm text-slate-500 dark:text-zinc-400">
              关键词：{item.keyword || "-"} · 场景：{item.scene || "未指定"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-slate-600 dark:text-zinc-300">{item.reason || "系统根据关键词优先级和最近产出情况推荐该选题。"}</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-zinc-400">推荐分：{typeof item.score === "number" ? item.score.toFixed(1) : "-"}</span>
              <Button asChild size="sm">
                <Link href={buildFactoryHref(item)}>去生成</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ContentList({
  items,
  emptyTitle,
  emptyDescription,
  hrefBuilder,
}: {
  items: ContentItem[];
  emptyTitle: string;
  emptyDescription: string;
  hrefBuilder?: (item: ContentItem) => string | null;
}) {
  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const href = hrefBuilder ? hrefBuilder(item) : null;
        const content = (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                  <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-zinc-800">{STATUS_LABELS[item.status || ""] || item.status || "未知状态"}</span>
                  <span>{item.channel || "未指定渠道"}</span>
                  <span>{item.scene || "未指定场景"}</span>
                  {item.source?.type ? <span>{SOURCE_LABELS[item.source.type] || item.source.type}</span> : null}
                </div>
                <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-zinc-300">{item.excerpt || "暂无摘要"}</p>
              </div>
              <div className="grid min-w-[220px] gap-2 text-xs text-slate-500 dark:text-zinc-400">
                <div>最近编辑：{formatTime(item.lastEditedAt || item.updatedAt)}</div>
                <div>AI 审核：{REVIEW_LABELS[item.review?.status || ""] || "未生成"}</div>
                <div>发布前检查：{CHECK_LABELS[item.check?.status || ""] || "未生成"}</div>
                <div>负责人：{item.owner || "AI 助手"}</div>
              </div>
            </div>
          </>
        );

        if (href) {
          return (
            <Link
              key={item.id}
              href={href}
              className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              {content}
            </Link>
          );
        }

        return (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {content}
          </div>
        );
      })}
    </div>
  );
}

function AdminHome({ data }: { data: AdminHomeData }) {
  const stats = [
    { label: "总任务数", value: data.overview.totalTasks },
    { label: "待处理", value: data.overview.pendingTasks },
    { label: "高风险", value: data.overview.highRiskTasks, tone: "text-rose-600" },
    { label: "本周已发布", value: data.overview.publishedThisWeek },
    { label: "本周新增", value: data.overview.createdThisWeek },
    { label: "监测运行", value: data.overview.monitorRunsThisWeek },
  ];

  return (
    <div className="space-y-8">
      <QuickActions items={data.quickActions} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-slate-200 dark:border-zinc-800">
            <CardContent className="p-6">
              <div className="text-sm text-slate-500 dark:text-zinc-400">{stat.label}</div>
              <div className={cn("mt-3 text-3xl font-bold text-slate-900 dark:text-white", stat.tone)}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">本周建议选题</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">适合立刻投给编辑或直接发起生成。</p>
        </div>
        <SuggestionList items={data.suggestions} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-rose-500" />高风险提醒</CardTitle>
            <CardDescription>优先处理 AI 审核高风险或发布前检查阻断的内容。</CardDescription>
          </CardHeader>
          <CardContent>
            <ContentList
              items={data.highRiskItems}
              emptyTitle="当前没有高风险内容"
              emptyDescription="这说明当前审核队列比较健康。"
              hrefBuilder={(item) => `/workbench/factory?taskId=${item.id}`}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle>最近内容</CardTitle>
            <CardDescription>最近更新的文章，方便快速查看产出情况。</CardDescription>
          </CardHeader>
          <CardContent>
            <ContentList
              items={data.latestContents}
              emptyTitle="还没有内容产出"
              emptyDescription="生成内容后，这里会显示最新文章。"
              hrefBuilder={(item) => `/workbench/factory?taskId=${item.id}`}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function EditorHome({ data }: { data: EditorHomeData }) {
  return (
    <div className="space-y-8">
      <QuickActions items={data.quickActions} />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">本周建议选题</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">系统会优先推荐高优先级、最近未产出的关键词题目。</p>
        </div>
        <SuggestionList items={data.suggestions} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-amber-500" />待处理内容</CardTitle>
            <CardDescription>待生成、待审核、待返工的内容会集中显示在这里。</CardDescription>
          </CardHeader>
          <CardContent>
            <ContentList
              items={data.pendingItems}
              emptyTitle="当前没有待处理内容"
              emptyDescription="可以直接从推荐选题或快速生成开始。"
              hrefBuilder={(item) => `/workbench/factory?taskId=${item.id}`}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><SquarePen className="h-5 w-5 text-blue-500" />最近编辑</CardTitle>
            <CardDescription>你最近改过的内容，点进去可以继续编辑或提交审核。</CardDescription>
          </CardHeader>
          <CardContent>
            <ContentList
              items={data.recentEdited}
              emptyTitle="还没有最近编辑内容"
              emptyDescription="生成或保存一篇内容后，这里会出现最近编辑记录。"
              hrefBuilder={(item) => `/workbench/factory?taskId=${item.id}`}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ViewerHome({ data }: { data: ViewerHomeData }) {
  return (
    <div className="space-y-8">
      <Card className="border-slate-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>已发布内容</CardTitle>
          <CardDescription>viewer 角色只读浏览已发布内容，不显示生成、编辑和审核入口。</CardDescription>
        </CardHeader>
        <CardContent>
          <ContentList items={data.publishedItems} emptyTitle="暂时没有已发布内容" emptyDescription="内容发布后会在这里展示。" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function WorkbenchHomeClient() {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<HomePayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/workbench/home", { cache: "no-store" });
        if (response.status === 401) {
          window.location.href = "/workbench/login";
          return;
        }
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "获取工作台首页失败");
        }
        if (alive) {
          setPayload(data);
        }
      } catch (requestError) {
        if (alive) {
          setError(requestError instanceof Error ? requestError.message : "获取工作台首页失败");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  const body = useMemo(() => {
    if (!payload) return null;
    if (payload.role === "admin") return <AdminHome data={payload} />;
    if (payload.role === "editor") return <EditorHome data={payload} />;
    return <ViewerHome data={payload} />;
  }, [payload]);

  return (
    <div className="space-y-8">
      <HomeHeader role={payload?.role} />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-zinc-800" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <Card className="border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30">
          <CardContent className="flex items-start gap-3 p-6 text-rose-700 dark:text-rose-200">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium">工作台首页加载失败</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error ? body : null}
    </div>
  );
}
