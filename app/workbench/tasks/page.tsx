"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, type ComponentType, type CSSProperties, type MouseEvent } from "react";
import nextDynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Filter,
  History,
  LayoutDashboard,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import contentText from "@/lib/content-text";
import taskWorkflow from "@/lib/task-workflow";

const { cleanCopiedArticleText } = contentText as {
  cleanCopiedArticleText: (text: string) => string;
};

const {
  ALL_FILTER,
  CHANNEL_OPTIONS,
  SCENE_OPTIONS,
  OWNER_OPTIONS,
  TASK_LABELS,
  STATUS_LABELS,
  STATUS_COLUMNS,
  COLUMN_LABELS,
  getAvailableTaskActions,
  getRecommendedTaskAction,
  getTaskActionGuard,
  formatTaskEventAction,
} = taskWorkflow as {
  ALL_FILTER: string;
  CHANNEL_OPTIONS: string[];
  SCENE_OPTIONS: string[];
  OWNER_OPTIONS: string[];
  TASK_LABELS: Record<string, string>;
  STATUS_LABELS: Record<string, string>;
  STATUS_COLUMNS: Record<string, string>;
  COLUMN_LABELS: Record<string, string>;
  getAvailableTaskActions: (status: string) => Array<{ status: string; label: string; tone: string }>;
  getRecommendedTaskAction: (status: string, aiReview?: Record<string, any>, publishCheck?: Record<string, any>) => { status: string; label: string; tone: string; reason: string } | null;
  getTaskActionGuard: (currentStatus: string, nextStatus: string, publishCheck?: Record<string, any>) => { blocked: boolean; level: string; message: string } | null;
  formatTaskEventAction: (action: string) => string;
};

const MDPreview = nextDynamic(
  () =>
    import("@uiw/react-md-editor").then(
      (mod) =>
        (mod.default as unknown as {
          Markdown: ComponentType<{ source: string; style?: CSSProperties }>;
        }).Markdown
    ),
  { ssr: false }
);

type TaskEvent = {
  id: string;
  action: string;
  actor: string;
  note: string | null;
  createdAt: string;
};

type ReviewResult = {
  status?: string;
  score?: number;
  summary?: string;
  issues?: Array<string | { text?: string; paragraphIndex?: number }>;
  suggestions?: string[];
  risks?: string[];
};

type PublishCheckItem = {
  key: string;
  level: string;
  label: string;
  detail: string;
};

type PublishCheckResult = {
  status?: string;
  items?: PublishCheckItem[];
  recommendedAction?: string;
  brandCheck?: {
    referenceCount?: number;
    riskCount?: number;
  };
};

type Recommendation = {
  status: string;
  label: string;
  tone: string;
  reason: string;
};

type Task = {
  id: string;
  title: string;
  channel: string;
  scene: string;
  owner: string;
  status: string;
  content: string | null;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  sourceType?: string;
  sourceLabel?: string;
  lastEditedAt?: string | null;
  aiReview?: ReviewResult | null;
  publishCheck?: PublishCheckResult | null;
  recommendation?: Recommendation | null;
  createdAt: string;
  updatedAt: string;
  taskEvents?: TaskEvent[];
};

const STATUS_STYLES: Record<string, { color: string; icon: LucideIcon }> = {
  PENDING_GENERATE: { color: "text-amber-500 bg-amber-50", icon: Clock },
  GENERATING: { color: "text-blue-500 bg-blue-50", icon: Clock },
  PENDING_REVIEW: { color: "text-purple-500 bg-purple-50", icon: AlertCircle },
  NEEDS_REVISION: { color: "text-rose-500 bg-rose-50", icon: RefreshCw },
  COMPLETED: { color: "text-green-500 bg-green-50", icon: CheckCircle2 },
  FAILED: { color: "text-red-500 bg-red-50", icon: AlertCircle },
};

const COLUMNS = ["pending", "review", "revision", "done"];

const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual: "\u624b\u52a8\u521b\u5efa",
  topic: "\u9009\u9898\u5e93",
  keyword: "\u5173\u952e\u8bcd",
  brand: "\u54c1\u724c\u8d44\u6599",
  monitor: "\u76d1\u6d4b\u53d1\u73b0",
  sample: "\u6837\u677f\u590d\u7528",
};

const REVIEW_STATUS_STYLES: Record<string, string> = {
  pass: "bg-emerald-50 text-emerald-700",
  revise: "bg-amber-50 text-amber-700",
  high_risk: "bg-rose-50 text-rose-700",
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  pass: "\u53ef\u8fdb\u5165\u5ba1\u6838",
  revise: "\u5efa\u8bae\u4fee\u6539",
  high_risk: "\u9ad8\u98ce\u9669",
};

const CHECK_LEVEL_STYLES: Record<string, string> = {
  pass: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  fail: "bg-rose-50 text-rose-700",
};

const CHECK_LEVEL_LABELS: Record<string, string> = {
  pass: "\u901a\u8fc7",
  warning: "\u63d0\u9192",
  fail: "\u963b\u65ad",
};

const QUICK_FILTERS = [
  { key: "all", label: "\u5168\u90e8\u4efb\u52a1" },
  { key: "review", label: "\u5f85\u5ba1\u6838" },
  { key: "high_risk", label: "\u9ad8\u98ce\u9669" },
] as const;

function getReviewIssueText(issue: string | { text?: string; paragraphIndex?: number }) {
  if (typeof issue === "string") return issue;
  if (issue && typeof issue === "object" && typeof issue.text === "string") return issue.text;
  return "";
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState(ALL_FILTER);
  const [selectedScene, setSelectedScene] = useState(ALL_FILTER);
  const [quickFilter, setQuickFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOwner, setBulkOwner] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      if (response.ok) {
        setTasks(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    }
  }, []);

  const fetchTaskDetail = useCallback(async (id: string) => {
    const response = await fetch(`/api/tasks/${id}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch task detail");
    }
    return (await response.json()) as Task;
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const syncTask = useCallback(
    async (id: string) => {
      const detail = await fetchTaskDetail(id);
      setTasks((prev) => prev.map((item) => (item.id === id ? { ...item, ...detail } : item)));
      setSelectedTask((prev) => (prev?.id === id ? detail : prev));
      return detail;
    },
    [fetchTaskDetail]
  );

  const patchTask = useCallback(
    async (id: string, payload: Record<string, unknown>) => {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to update task");
      }
      return response.json();
    },
    []
  );

  const openTask = useCallback(
    async (task: Task) => {
      setIsDialogOpen(true);
      setSelectedTask(task);
      try {
        await syncTask(task.id);
      } catch (error) {
        console.error("Failed to open task", error);
      }
    },
    [syncTask]
  );

  const filteredTasks = tasks.filter((task) => {
    const matchSearch = !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchChannel = selectedChannel === ALL_FILTER || task.channel === selectedChannel;
    const matchScene = selectedScene === ALL_FILTER || task.scene === selectedScene;
    const matchQuickFilter =
      quickFilter === "all"
        ? true
        : quickFilter === "review"
          ? task.status === "PENDING_REVIEW"
          : task.aiReview?.status === "high_risk" || task.publishCheck?.status === "fail";
    return matchSearch && matchChannel && matchScene && matchQuickFilter;
  });

  const getTasksByColumn = (column: string) =>
    filteredTasks.filter((task) => (STATUS_COLUMNS[task.status] || "pending") === column);

  const selectedTaskRecommendation = selectedTask ? getRecommendedTaskAction(selectedTask.status, selectedTask.aiReview || {}, selectedTask.publishCheck || {}) : null;
  const taskActions = getAvailableTaskActions(selectedTask?.status || "");
  const orderedTaskActions = selectedTaskRecommendation
    ? [
        ...taskActions.filter((action) => action.status === selectedTaskRecommendation.status),
        ...taskActions.filter((action) => action.status !== selectedTaskRecommendation.status),
      ]
    : taskActions;
  const actionGuards = Object.fromEntries(orderedTaskActions.map((action) => [action.status, getTaskActionGuard(selectedTask?.status || "", action.status, selectedTask?.publishCheck || {})]));

  const stats = {
    total: tasks.filter((task) => {
      const createdAt = new Date(task.createdAt).getTime();
      return Date.now() - createdAt <= 7 * 24 * 60 * 60 * 1000;
    }).length,
    completed: tasks.filter((task) => task.status === "COMPLETED").length,
    pending: tasks.filter((task) => ["PENDING_GENERATE", "GENERATING", "PENDING_REVIEW", "NEEDS_REVISION", "FAILED"].includes(task.status)).length,
  };

  const toggleSelect = (id: string, event: MouseEvent<HTMLInputElement>) => {
    event.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleUpdateOwner = async (id: string, owner: string) => {
    try {
      setUpdating(true);
      await patchTask(id, { owner });
      await syncTask(id);
      await fetchTasks();
    } catch (error) {
      alert(error instanceof Error ? error.message : TASK_LABELS.syncFailed);
    } finally {
      setUpdating(false);
    }
  };

  const handleTaskAction = async (status: string) => {
    if (!selectedTask) return;
    const note = selectedTask.reviewNote?.trim() || "";
    if (status === "NEEDS_REVISION" && !note) {
      alert(TASK_LABELS.reviewNotePlaceholder);
      return;
    }

    const actionGuard = getTaskActionGuard(selectedTask.status, status, selectedTask.publishCheck || {});
    if (actionGuard?.blocked) {
      alert(actionGuard.message);
      return;
    }

    try {
      setUpdating(true);
      await patchTask(selectedTask.id, { status, reviewNote: note });
      await syncTask(selectedTask.id);
      await fetchTasks();
    } catch (error) {
      alert(error instanceof Error ? error.message : TASK_LABELS.syncFailed);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveReviewNote = async () => {
    if (!selectedTask) return;
    try {
      setUpdating(true);
      await patchTask(selectedTask.id, { reviewNote: selectedTask.reviewNote || "" });
      await syncTask(selectedTask.id);
      alert(TASK_LABELS.noteSaved);
    } catch (error) {
      alert(error instanceof Error ? error.message : TASK_LABELS.syncFailed);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm(TASK_LABELS.deleteSingleConfirm)) return;
    try {
      setDeleting(true);
      await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
      setIsDialogOpen(false);
      setSelectedTask(null);
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      await fetchTasks();
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`${TASK_LABELS.deleteSelectedConfirmPrefix} ${selectedIds.length} ${TASK_LABELS.deleteSelectedConfirmSuffix}`)) {
      return;
    }

    try {
      setDeleting(true);
      await Promise.all(selectedIds.map((id) => fetch(`/api/tasks?id=${id}`, { method: "DELETE" })));
      setSelectedIds([]);
      await fetchTasks();
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkApply = async () => {
    if (!selectedIds.length || (!bulkOwner && !bulkStatus)) return;
    try {
      setUpdating(true);
      const results = await Promise.allSettled(
        selectedIds.map((id) => patchTask(id, { ...(bulkOwner ? { owner: bulkOwner } : {}), ...(bulkStatus ? { status: bulkStatus } : {}) }))
      );
      const failed = results.filter((item) => item.status === "rejected").length;
      if (failed > 0) {
        alert(TASK_LABELS.syncFailed);
      }
      setSelectedIds([]);
      setBulkOwner("");
      setBulkStatus("");
      if (selectedTask) {
        await syncTask(selectedTask.id).catch(() => null);
      }
      await fetchTasks();
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyPlainText = () => {
    if (!selectedTask?.content) return;
    navigator.clipboard.writeText(cleanCopiedArticleText(selectedTask.content));
    alert(TASK_LABELS.copiedPlain);
  };

  const handleCopyRichText = () => {
    if (!selectedTask?.content) return;
    const plainText = cleanCopiedArticleText(selectedTask.content);
    const previewElement = document.querySelector("[data-task-preview] .wmde-markdown") as HTMLElement | null;

    if (!previewElement || typeof ClipboardItem === "undefined") {
      navigator.clipboard.writeText(plainText);
      alert(TASK_LABELS.richUnsupported);
      return;
    }

    const html = previewElement.innerHTML;
    const data = [
      new ClipboardItem({
        "text/plain": new Blob([plainText], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ];

    navigator.clipboard.write(data).then(
      () => {
        alert(TASK_LABELS.copiedRich);
      },
      () => {
        navigator.clipboard.writeText(plainText);
        alert(TASK_LABELS.richFailed);
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none bg-gradient-to-br from-slate-900 to-slate-700 text-white">
          <CardContent className="p-5">
            <p className="text-sm text-white/70">{TASK_LABELS.totalThisWeek}</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold">{stats.total}</span>
              <Clock className="h-5 w-5 text-white/60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-white">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">{TASK_LABELS.completed}</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">{stats.completed}</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-white">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">{TASK_LABELS.pending}</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">{stats.pending}</span>
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={TASK_LABELS.searchPlaceholder} className="h-10 rounded-xl border-slate-200 pl-9" />
        </div>
        <Select value={selectedChannel} onValueChange={setSelectedChannel}>
          <SelectTrigger className="h-10 w-full rounded-xl md:w-[160px]"><SelectValue placeholder={TASK_LABELS.allChannels} /></SelectTrigger>
          <SelectContent>{CHANNEL_OPTIONS.map((channel) => <SelectItem key={channel} value={channel}>{channel}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={selectedScene} onValueChange={setSelectedScene}>
          <SelectTrigger className="h-10 w-full rounded-xl md:w-[180px]"><SelectValue placeholder={TASK_LABELS.allScenes} /></SelectTrigger>
          <SelectContent>{SCENE_OPTIONS.map((scene) => <SelectItem key={scene} value={scene}>{scene}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((filter) => {
          const active = quickFilter === filter.key;
          return (
            <Button
              key={filter.key}
              type="button"
              variant={active ? "default" : "outline"}
              onClick={() => setQuickFilter(filter.key)}
              className={cn(
                "h-9 rounded-full px-4 text-sm",
                active
                  ? "bg-[#0071e3] text-white hover:bg-[#0071e3]/90"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {filter.label}
            </Button>
          );
        })}
      </div>

      {selectedIds.length > 0 ? (
        <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-4">
          <div className="flex items-center gap-3 text-sm font-medium text-blue-700">
            <span>{TASK_LABELS.selectedCountPrefix} {selectedIds.length} {TASK_LABELS.selectedCountSuffix}</span>
            <button onClick={() => setSelectedIds([])} className="text-xs text-blue-500 hover:text-blue-700">{TASK_LABELS.cancel}</button>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Select value={bulkOwner || undefined} onValueChange={setBulkOwner}>
              <SelectTrigger className="h-9 w-full rounded-lg bg-white md:w-[180px]"><SelectValue placeholder={TASK_LABELS.bulkOwner} /></SelectTrigger>
              <SelectContent>{OWNER_OPTIONS.map((owner) => <SelectItem key={owner} value={owner}>{owner}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={bulkStatus || undefined} onValueChange={setBulkStatus}>
              <SelectTrigger className="h-9 w-full rounded-lg bg-white md:w-[180px]"><SelectValue placeholder={TASK_LABELS.bulkStatus} /></SelectTrigger>
              <SelectContent>{["PENDING_REVIEW", "COMPLETED"].map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" disabled={updating || (!bulkOwner && !bulkStatus)} onClick={handleBulkApply} className="h-9 rounded-lg bg-[#0071e3] text-white hover:bg-[#0071e3]/90">{TASK_LABELS.apply}</Button>
            <Button size="sm" variant="outline" onClick={handleDeleteSelected} disabled={deleting} className="h-9 rounded-lg border-red-200 text-red-500 hover:bg-red-50">{TASK_LABELS.deleteSelected}</Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => {
          const columnTasks = getTasksByColumn(column);
          return (
            <div key={column} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="flex items-center gap-2 font-bold text-slate-700">
                  {COLUMN_LABELS[column]}
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-normal text-slate-500">{columnTasks.length}</span>
                </h3>
              </div>
              <div className="min-h-[520px] space-y-3 rounded-2xl bg-slate-100/60 p-3">
                {columnTasks.map((task) => {
                  const statusStyle = STATUS_STYLES[task.status] || STATUS_STYLES.PENDING_GENERATE;
                  const StatusIcon = statusStyle.icon;
                  return (
                    <Card key={task.id} className="cursor-pointer border-none bg-white transition-all hover:-translate-y-0.5 hover:shadow-md" onClick={() => openTask(task)}>
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-center justify-between">
                          <input type="checkbox" className="h-4 w-4 rounded accent-blue-600" checked={selectedIds.includes(task.id)} onClick={(event) => toggleSelect(task.id, event)} onChange={() => undefined} />
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium", statusStyle.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {STATUS_LABELS[task.status] || task.status}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0071e3]">{task.channel}</span>
                          {task.title?.startsWith(TASK_LABELS.batchPrefix) ? <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">{TASK_LABELS.batch}</span> : null}
                        </div>
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{task.title}</p>
                        {task.aiReview?.status || task.publishCheck?.status === "fail" ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {task.aiReview?.status ? (
                              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", task.aiReview.status === "high_risk" ? "bg-rose-50 text-rose-600" : task.aiReview.status === "pass" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                                {task.aiReview.status === "high_risk" ? "\u9ad8\u98ce\u9669" : task.aiReview.status === "pass" ? "\u53ef\u901a\u8fc7" : "\u5efa\u8bae\u4fee\u6539"}
                              </span>
                            ) : null}
                            {task.publishCheck?.status === "fail" ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">{"\u963b\u65ad\u9879"}</span> : null}
                          </div>
                        ) : null}
                        {task.reviewNote ? <p className="line-clamp-2 text-xs text-rose-500">{task.reviewNote}</p> : null}
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1"><User className="h-3 w-3" />{task.owner}</div>
                          <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(task.createdAt).toLocaleDateString()}</div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {columnTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-xs text-slate-400">
                    <LayoutDashboard className="mb-2 h-8 w-8 opacity-20" />
                    {TASK_LABELS.noTasks}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="flex max-h-[90vh] w-[min(94vw,1080px)] max-w-[1080px] flex-col overflow-hidden rounded-[24px] p-0">
          <DialogHeader className="min-w-0 flex-none border-b border-slate-100 px-6 pb-4 pt-6 pr-12">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold uppercase text-[#0071e3]">{selectedTask?.channel}</span>
              <span className="text-xs text-slate-400">ID: {selectedTask?.id}</span>
            </div>
            <DialogTitle className="break-words pr-2 text-xl font-bold leading-8 text-slate-900">{selectedTask?.title}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,360px)] lg:items-start">
            <div className="min-w-0 space-y-6">
              <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="flex items-center gap-1 text-xs text-slate-400"><Filter className="h-3 w-3" /> {TASK_LABELS.scene}</p>
                  <p className="text-sm font-medium text-slate-700">{selectedTask?.scene || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-1 text-xs text-slate-400"><Calendar className="h-3 w-3" /> {TASK_LABELS.createdAt}</p>
                  <p className="text-sm font-medium text-slate-700">{selectedTask ? new Date(selectedTask.createdAt).toLocaleString() : "-"}</p>
                </div>
                <div className="space-y-2">
                  <p className="flex items-center gap-1 text-xs text-slate-400"><User className="h-3 w-3" /> {TASK_LABELS.owner}</p>
                  <Select disabled={updating} value={selectedTask?.owner} onValueChange={(value) => selectedTask && handleUpdateOwner(selectedTask.id, value)}>
                    <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent>{OWNER_OPTIONS.map((owner) => <SelectItem key={owner} value={owner}>{owner}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3 w-3" /> {TASK_LABELS.taskStatus}</p>
                  <div className={cn("inline-flex rounded-full px-3 py-2 text-sm font-medium", STATUS_STYLES[selectedTask?.status || ""]?.color || "bg-slate-100 text-slate-500")}>
                    {selectedTask?.status ? STATUS_LABELS[selectedTask.status] || selectedTask.status : "-"}
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="flex items-center gap-2 font-bold text-slate-700">
                    {TASK_LABELS.generatedContent}
                    {updating ? <Loader2 className="h-3 w-3 animate-spin text-[#0071e3]" /> : null}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-[#0071e3] hover:bg-blue-50" onClick={handleCopyRichText}><Copy className="mr-1 h-3 w-3" /> {TASK_LABELS.copyRich}</Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:bg-slate-100" onClick={handleCopyPlainText}><Copy className="mr-1 h-3 w-3" /> {TASK_LABELS.copyPlain}</Button>
                  </div>
                </div>
                <div className="max-h-[52vh] min-w-0 max-w-full overflow-x-hidden overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-5 text-sm leading-relaxed" data-color-mode="light" data-task-preview>
                  {selectedTask?.content ? (
                    <div className="min-w-0 max-w-full break-words [&_.wmde-markdown]:max-w-full [&_.wmde-markdown]:overflow-x-hidden [&_.wmde-markdown]:bg-transparent [&_.wmde-markdown]:text-[13px] [&_.wmde-markdown_*]:max-w-full [&_.wmde-markdown_code]:break-words [&_.wmde-markdown_code]:whitespace-pre-wrap [&_.wmde-markdown_img]:h-auto [&_.wmde-markdown_img]:max-w-full [&_.wmde-markdown_p]:break-words [&_.wmde-markdown_pre]:max-w-full [&_.wmde-markdown_pre]:overflow-x-auto [&_.wmde-markdown_pre_code]:whitespace-pre [&_.wmde-markdown_table]:block [&_.wmde-markdown_table]:max-w-full [&_.wmde-markdown_table]:overflow-x-auto [&_.wmde-markdown_td]:break-words [&_.wmde-markdown_th]:break-words">
                      <MDPreview source={selectedTask.content} style={{ background: "transparent", fontSize: "13px" }} />
                    </div>
                  ) : (
                    <span className="italic text-slate-400">{TASK_LABELS.noContent}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="min-w-[320px] max-w-[360px] self-start space-y-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 lg:max-h-[52vh] lg:overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><Filter className="h-4 w-4 text-[#0071e3]" />{"内容来源"}</div>
                <div className="rounded-xl bg-white p-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-800">{SOURCE_TYPE_LABELS[selectedTask?.sourceType || "manual"] || "\u624b\u52a8\u521b\u5efa"}</span>
                    <span className="text-xs text-slate-400">{selectedTask?.lastEditedAt ? ["\u6700\u540e\u7f16\u8f91", new Date(selectedTask.lastEditedAt).toLocaleString()].join(" \u00b7 ") : "\u751f\u6210\u540e\u81ea\u52a8\u5165\u5e93"}</span>
                  </div>
                  <div className="mt-2 leading-relaxed text-slate-500">{selectedTask?.sourceLabel || "\u5f53\u524d\u5185\u5bb9\u6765\u81ea\u751f\u6210\u94fe\u8def\uff0c\u53ef\u7ee7\u7eed\u7f16\u8f91\u5e76\u6c89\u6dc0\u4e3a\u53ef\u590d\u7528\u6587\u7ae0\u3002"}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><CheckCircle2 className="h-4 w-4 text-[#0071e3]" />{"AI\u5ba1\u6838\u6982\u89c8"}</div>
                <div className="rounded-xl bg-white p-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", REVIEW_STATUS_STYLES[selectedTask?.aiReview?.status || "revise"] || "bg-slate-100 text-slate-600")}>{REVIEW_STATUS_LABELS[selectedTask?.aiReview?.status || "revise"] || "\u5efa\u8bae\u4fee\u6539"}</span>
                    <span className="text-xs font-semibold text-slate-400">{"\u8bc4\u5206 "}{typeof selectedTask?.aiReview?.score === "number" ? selectedTask.aiReview.score : "--"}</span>
                  </div>
                  <div className="mt-3 leading-relaxed text-slate-700">{selectedTask?.aiReview?.summary || "\u7cfb\u7edf\u6682\u672a\u751f\u6210 AI \u5ba1\u6838\u7ed3\u8bba\uff0c\u53ef\u5148\u67e5\u770b\u53d1\u5e03\u524d\u68c0\u67e5\u4e0e\u54c1\u724c\u547d\u4e2d\u60c5\u51b5\u3002"}</div>
                  {selectedTask?.aiReview?.issues?.length ? (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs font-semibold text-slate-500">{"\u5f85\u5904\u7406\u95ee\u9898"}</div>
                      <div className="space-y-2">
                        {selectedTask.aiReview.issues.map((issue, index) => (
                          <div key={["issue", index].join("-")} className="rounded-lg bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-700">
                            {getReviewIssueText(issue)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {selectedTask?.aiReview?.suggestions?.length ? (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs font-semibold text-slate-500">{"\u4fee\u6539\u5efa\u8bae"}</div>
                      <div className="space-y-2">
                        {selectedTask.aiReview.suggestions.map((suggestion, index) => (
                          <div key={["suggestion", index].join("-")} className="rounded-lg bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-700">{suggestion}</div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="space-y-3">
              {selectedTaskRecommendation ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><CheckCircle2 className="h-4 w-4 text-[#0071e3]" />{"\u5efa\u8bae\u52a8\u4f5c"}</div>
                  <div className={cn("rounded-xl border px-4 py-4 text-sm", selectedTaskRecommendation.tone === "primary" ? "border-emerald-100 bg-emerald-50/70 text-emerald-800" : "border-amber-100 bg-amber-50/80 text-amber-800")}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{selectedTaskRecommendation.label}</span>
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", selectedTaskRecommendation.tone === "primary" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                        {selectedTaskRecommendation.status === "COMPLETED" ? "\u4f18\u5148\u901a\u8fc7" : "\u4f18\u5148\u8fd4\u5de5"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-current/90">{selectedTaskRecommendation.reason}</div>
                  </div>
                </div>
              ) : null}
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><AlertCircle className="h-4 w-4 text-[#0071e3]" />{"\u53d1\u5e03\u524d\u68c0\u67e5"}</div>
                <div className="rounded-xl bg-white p-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", CHECK_LEVEL_STYLES[selectedTask?.publishCheck?.status || "warning"] || "bg-slate-100 text-slate-600")}>{CHECK_LEVEL_LABELS[selectedTask?.publishCheck?.status || "warning"] || "\u63d0\u9192"}</span>
                    <span className="text-xs text-slate-400">{"\u54c1\u724c\u547d\u4e2d "}{selectedTask?.publishCheck?.brandCheck?.referenceCount || 0}</span>
                  </div>
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">{selectedTask?.publishCheck?.recommendedAction || "\u5efa\u8bae\u5148\u5b8c\u6210\u6807\u9898\u3001\u54c1\u724c\u547d\u4e2d\u548c\u98ce\u9669\u8bcd\u68c0\u67e5\u540e\u518d\u63d0\u4ea4\u5ba1\u6838\u3002"}</div>
                  <div className="mt-3 space-y-2">
                    {selectedTask?.publishCheck?.items?.length ? selectedTask.publishCheck.items.map((item, index) => (
                      <div key={[item.key, index].join("-")} className="rounded-lg border border-slate-100 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", CHECK_LEVEL_STYLES[item.level] || "bg-slate-100 text-slate-600")}>{CHECK_LEVEL_LABELS[item.level] || item.level}</span>
                        </div>
                        <div className="mt-1 text-xs leading-relaxed text-slate-500">{item.detail}</div>
                      </div>
                    )) : <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">{"\u6682\u672a\u751f\u6210\u53d1\u5e03\u524d\u68c0\u67e5\u7ed3\u679c\u3002"}</div>}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><MessageSquareText className="h-4 w-4 text-[#0071e3]" />{TASK_LABELS.reviewNote}</div>
                <Textarea value={selectedTask?.reviewNote || ""} onChange={(e) => setSelectedTask((prev) => (prev ? { ...prev, reviewNote: e.target.value } : prev))} placeholder={TASK_LABELS.reviewNotePlaceholder} className="min-h-[120px] resize-none rounded-xl border-slate-200 bg-white" />
                <Button variant="outline" className="w-full rounded-xl" disabled={updating || !selectedTask} onClick={handleSaveReviewNote}>{TASK_LABELS.saveNote}</Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><CheckCircle2 className="h-4 w-4 text-[#0071e3]" />{TASK_LABELS.reviewMeta}</div>
                <div className="rounded-xl bg-white p-3 text-sm text-slate-600">
                  {selectedTask?.reviewedBy ? [selectedTask.reviewedBy, selectedTask.reviewedAt ? new Date(selectedTask.reviewedAt).toLocaleString() : "-"].join(" / ") : "-"}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><History className="h-4 w-4 text-[#0071e3]" />{TASK_LABELS.timeline}</div>
                <div className="max-h-[260px] space-y-3 overflow-y-auto pr-1">
                  {selectedTask?.taskEvents?.length ? selectedTask.taskEvents.map((event) => (
                    <div key={event.id} className="rounded-xl bg-white p-3 text-xs shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-slate-700">{formatTaskEventAction(event.action)}</span>
                        <span className="text-slate-400">{new Date(event.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="mt-1 text-slate-500">{event.actor}</div>
                      {event.note ? <div className="mt-2 leading-relaxed text-slate-600">{event.note}</div> : null}
                    </div>
                  )) : <div className="rounded-xl bg-white p-3 text-xs text-slate-400">{TASK_LABELS.timelineEmpty}</div>}
                </div>
              </div>
            </div>
            </div>
          </div>

          <DialogFooter className="flex flex-none flex-wrap items-start gap-2 border-t border-slate-100 px-6 py-4">
            <Button variant="outline" className="rounded-xl border-red-200 px-6 text-red-500 hover:bg-red-50" onClick={() => selectedTask && handleDeleteSingle(selectedTask.id)}>
              <Trash2 className="mr-1 h-4 w-4" /> {TASK_LABELS.delete}
            </Button>
            <Button variant="outline" className="rounded-xl px-6" onClick={() => setIsDialogOpen(false)}>{TASK_LABELS.close}</Button>
            {orderedTaskActions.map((action) => {
              const actionGuard = actionGuards[action.status];
              return (
                <div key={action.status} className="space-y-1">
                  <Button
                    variant={action.tone === "outline" || action.tone === "danger" ? "outline" : undefined}
                    className={cn(
                      "rounded-xl px-6",
                      action.tone === "primary" && "border-none bg-[#0071e3] text-white hover:bg-[#0071e3]/90",
                      action.tone === "danger" && "border-rose-200 text-rose-500 hover:bg-rose-50",
                      selectedTaskRecommendation?.status === action.status && "ring-2 ring-offset-1 ring-[#0071e3]/20"
                    )}
                    disabled={updating || !selectedTask || Boolean(actionGuard?.blocked)}
                    onClick={() => handleTaskAction(action.status)}
                  >
                    {action.label}
                  </Button>
                  {actionGuard ? (
                    <div className={cn("max-w-[220px] text-xs leading-relaxed", actionGuard.level === "fail" ? "text-rose-500" : "text-amber-500")}>
                      {actionGuard.message}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



