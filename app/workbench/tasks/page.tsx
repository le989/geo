"use client";

import { useState, useEffect, useCallback } from "react";
import type { ComponentType, CSSProperties } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LucideIcon } from "lucide-react";
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Copy,
  LayoutDashboard,
  Plus,
  Loader2,
  Trash2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const MDPreview = dynamic(
  () =>
    import("@uiw/react-md-editor").then(
      (mod) =>
        (mod.default as unknown as {
          Markdown: ComponentType<{ source: string; style?: CSSProperties }>;
        }).Markdown
    ),
  { ssr: false }
);

interface Task {
  id: string;
  title: string;
  channel: string;
  scene: string;
  owner: string;
  status: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
}

const CHANNELS = ["全部", "知乎", "今日头条", "搜狐号", "百家号", "网易号"];
const SCENES = ["全部", "供应商推荐", "技术选型", "参数对比"];
const STATUS_MAP: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  "PENDING_GENERATE": { label: "待生成", color: "text-amber-500 bg-amber-50", icon: Clock },
  "GENERATING": { label: "生成中", color: "text-blue-500 bg-blue-50", icon: Clock },
  "PENDING_REVIEW": { label: "待审核", color: "text-purple-500 bg-purple-50", icon: AlertCircle },
  "COMPLETED": { label: "已完成", color: "text-green-500 bg-green-50", icon: CheckCircle2 },
  "FAILED": { label: "失败", color: "text-red-500 bg-red-50", icon: AlertCircle },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("全部");
  const [selectedScene, setSelectedScene] = useState("全部");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks");
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确认删除选中的 ${selectedIds.length} 篇内容？`)) return;
    setDeleting(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch("/api/tasks", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })
        )
      );
      setSelectedIds([]);
      fetchTasks();
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm("确认删除这篇内容？")) return;
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setIsDialogOpen(false);
    fetchTasks();
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    setUpdating(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(tasks.map(t => t.id === id ? updatedTask : t));
        if (selectedTask?.id === id) {
          setSelectedTask(updatedTask);
        }
      }
    } catch (error) {
      console.error("Failed to update task", error);
    } finally {
      setUpdating(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = selectedChannel === "全部" || task.channel === selectedChannel;
    const matchesScene = selectedScene === "全部" || task.scene.includes(selectedScene);
    return matchesSearch && matchesChannel && matchesScene;
  });

  const getTasksByStatus = (status: string) => {
    if (status === "待生产") return filteredTasks.filter(t => t.status === "PENDING_GENERATE" || t.status === "GENERATING");
    if (status === "待审核") return filteredTasks.filter(t => t.status === "PENDING_REVIEW");
    if (status === "已发布") return filteredTasks.filter(t => t.status === "COMPLETED");
    return [];
  };

  // 统计数据
  const stats = {
    totalThisWeek: tasks.filter(t => {
      const created = new Date(t.createdAt);
      const now = new Date();
      const diff = now.getTime() - created.getTime();
      return diff < 7 * 24 * 60 * 60 * 1000;
    }).length,
    completed: tasks.filter(t => t.status === "COMPLETED").length,
    pending: tasks.filter(t => t.status !== "COMPLETED" && t.status !== "FAILED").length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* 顶部统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "本周新增任务", value: stats.totalThisWeek, icon: Plus, color: "text-blue-600 bg-blue-50" },
          { label: "已发布内容", value: stats.completed, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          { label: "待处理任务", value: stats.pending, icon: Clock, color: "text-amber-600 bg-amber-50" },
        ].map((stat, i) => (
          <Card key={i} className="apple-card border-none shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={cn("p-3 rounded-2xl", stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 搜索与筛选 */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input 
            placeholder="搜索任务标题..." 
            className="pl-10 rounded-full bg-white border-slate-200 h-11"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-[140px] rounded-full h-11 bg-white border-slate-200">
              <SelectValue placeholder="所有渠道" />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedScene} onValueChange={setSelectedScene}>
            <SelectTrigger className="w-[140px] rounded-full h-11 bg-white border-slate-200">
              <SelectValue placeholder="所有场景" />
            </SelectTrigger>
            <SelectContent>
              {SCENES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-2 py-2 bg-red-50 rounded-xl border border-red-100">
          <span className="text-sm text-red-600 font-medium">已选 {selectedIds.length} 篇</span>
          <Button
            size="sm"
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="bg-red-500 hover:bg-red-600 text-white border-none h-8 text-xs"
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
            删除选中
          </Button>
          <button onClick={() => setSelectedIds([])} className="text-xs text-red-400 hover:text-red-600">取消</button>
        </div>
      )}

      {/* 看板区域 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {["待生产", "待审核", "已发布"].map((col) => {
          const colTasks = getTasksByStatus(col);
          return (
            <div key={col} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  {col}
                  <span className="text-xs font-normal bg-slate-200 dark:bg-zinc-800 text-slate-500 px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-3 min-h-[500px] rounded-2xl bg-slate-100/50 dark:bg-zinc-900/50 p-3">
                {colTasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className="apple-card cursor-pointer hover:shadow-md transition-all border-none"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsDialogOpen(true);
                    }}
                  >
                    <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded accent-blue-600"
                        checked={selectedIds.includes(task.id)}
                        onClick={(e) => toggleSelect(task.id, e)}
                        onChange={() => {}}
                      />
                    </div>
                      <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-[#0071e3] uppercase">
                          {task.channel}
                        </span>
                        {task.title?.startsWith("【批量】") && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-600">
                            批量
                          </span>
                        )}
                      </div>
                        {task.status.includes("FAILED") && <AlertCircle className="h-4 w-4 text-red-500" />}
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 line-clamp-2">
                        {task.title}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.owner}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(task.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-400 text-xs">
                    <LayoutDashboard className="h-8 w-8 mb-2 opacity-10" />
                    暂无任务
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 任务详情弹窗 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[24px] p-6">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-[#0071e3] uppercase">
                {selectedTask?.channel}
              </span>
              <span className="text-xs text-zinc-400">ID: {selectedTask?.id}</span>
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">{selectedTask?.title}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-1">
              <p className="text-xs text-zinc-400 flex items-center gap-1"><Filter className="h-3 w-3" /> 业务场景</p>
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">{selectedTask?.scene}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-400 flex items-center gap-1"><Calendar className="h-3 w-3" /> 创建时间</p>
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">{selectedTask && new Date(selectedTask.createdAt).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-400 flex items-center gap-1"><User className="h-3 w-3" /> 负责人</p>
              <Select 
                disabled={updating}
                value={selectedTask?.owner} 
                onValueChange={(val) => handleUpdateTask(selectedTask!.id, { owner: val })}
              >
                <SelectTrigger className="h-9 rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["待分配", "AI助手", "工程师", "运营专员"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-400 flex items-center gap-1"><Clock className="h-3 w-3" /> 任务状态</p>
              <Select 
                disabled={updating}
                value={selectedTask?.status} 
                onValueChange={(val) => handleUpdateTask(selectedTask!.id, { status: val })}
              >
                <SelectTrigger className={cn("h-9 rounded-lg border-none", STATUS_MAP[selectedTask?.status || ""]?.color)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(STATUS_MAP).map(s => <SelectItem key={s} value={s}>{STATUS_MAP[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-slate-100 dark:bg-zinc-800" />

          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                生成内容
                {updating && <Loader2 className="h-3 w-3 animate-spin text-[#0071e3]" />}
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-[#0071e3] hover:bg-blue-50 h-8"
                onClick={() => {
                  if (selectedTask?.content) {
                    navigator.clipboard.writeText(selectedTask.content);
                    alert("内容已复制");
                  }
                }}
              >
                <Copy className="h-3 w-3 mr-1" /> 复制全文
              </Button>
            </div>
            <div
              className="bg-slate-50 dark:bg-zinc-900 p-5 rounded-xl text-sm leading-relaxed max-h-[350px] overflow-y-auto border border-slate-100 dark:border-zinc-800"
              data-color-mode="light"
            >
              {selectedTask?.content ? (
                <MDPreview source={selectedTask.content} style={{ background: "transparent", fontSize: "13px" }} />
              ) : (
                <span className="text-zinc-400 italic">暂无内容</span>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button 
              variant="outline" 
              className="rounded-xl px-6 text-red-500 border-red-200 hover:bg-red-50" 
              onClick={() => selectedTask && handleDeleteSingle(selectedTask.id)} 
            >
              <Trash2 className="h-4 w-4 mr-1" /> 删除
            </Button>
            <Button variant="outline" className="rounded-xl px-6" onClick={() => setIsDialogOpen(false)}>
              关闭
            </Button>
            <Button className="bg-[#0071e3] hover:bg-[#0071e3]/90 border-none text-white rounded-xl px-6">
              确认审核
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
