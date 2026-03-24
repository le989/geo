"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, AlertCircle, CheckCircle2, BookOpen, Copy, Save, Edit3, BarChart3, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// 动态导入 Markdown 编辑器，避免服务端渲染错误
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

type TaskStatus = "IDLE" | "PENDING_GENERATE" | "PENDING_REVIEW" | "FAILED";

interface TopicTemplate {
  id: string;
  topic: string;
  scene: string;
  channel: string;
  priority: string;
}

// 评分项接口
interface ScoreItem {
  name: string;
  score: number;
  max: number;
  tip: string;
}

interface ScoreResult {
  total: number;
  items: ScoreItem[];
  suggestion: string;
}

export default function FactoryPage() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | undefined>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TaskStatus>("IDLE");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState("知乎");
  const [selectedContentType, setSelectedContentType] = useState("自动识别");
  const [selectedTopicScene, setSelectedTopicScene] = useState("");
  
  // 评分相关状态
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  
  // 选题库相关状态
  const [topics, setTopics] = useState<TopicTemplate[]>([]);
  const [scenes, setScenes] = useState<string[]>([]);
  const [filterScene, setFilterScene] = useState<string>("全部");
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [batchUnified, setBatchUnified] = useState(true);
  const [batchUnifiedChannel, setBatchUnifiedChannel] = useState("知乎");
  const [batchUnifiedType, setBatchUnifiedType] = useState("自动识别");
  const [batchTaskIds, setBatchTaskIds] = useState<string[]>([]);
  const [batchDone, setBatchDone] = useState(0);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const batchPollingRef = useRef<NodeJS.Timeout | null>(null);

  // 内容清洗函数
  const cleanMarkdown = useCallback((text: string): string => {
    return (text || "")
      // 去掉 **文字** 和 __文字__（加粗）
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      // 去掉 *文字* 和 _文字_（斜体）
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      // 去掉 ### ## # 标题符号（保留文字）
      .replace(/^#{1,6}\s+/gm, "")
      // 去掉 --- 分隔线
      .replace(/^---+$/gm, "")
      // 去掉 ``` 代码块
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`(.+?)`/g, "$1")
      // 保留 Markdown 表格（| 符号），不清洗
      // 去掉行首的 > 引用符号
      .replace(/^>\s+/gm, "")
      // 清理多余空行（超过2个换行的合并为2个）
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }, []);

  // 清除轮询
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // 评分功能
  const handleScore = useCallback(async (content: string) => {
    setIsScoring(true);
    setScore(null);
    try {
      const response = await fetch("/api/generate/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (response.ok) {
        const data = await response.json();
        setScore(data);
      }
    } catch (error) {
      console.error("Scoring failed", error);
    } finally {
      setIsScoring(false);
    }
  }, []);

  // 轮询任务状态
  const pollTaskStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`);
      if (!response.ok) throw new Error("Failed to fetch task");
      
      const task = await response.json();
      
      if (task.status === "PENDING_REVIEW") {
        const cleanedContent = cleanMarkdown(task.content);
        setResult(cleanedContent);
        setStatus("PENDING_REVIEW");
        setLoading(false);
        stopPolling();
        localStorage.removeItem("last_generation_task_id");
        // 并行触发评分
        handleScore(cleanedContent);
      } else if (task.status === "FAILED") {
        setStatus("FAILED");
        setResult(task.content || "生成过程中发生未知错误。");
        setLoading(false);
        stopPolling();
      } else {
        setStatus(task.status);
      }
    } catch (error) {
      console.error("Polling error:", error);
      setStatus("FAILED");
      setLoading(false);
      stopPolling();
    }
  }, [cleanMarkdown, handleScore, stopPolling]);

  // 获取选题库
  const fetchTopics = useCallback(async () => {
    try {
      const response = await fetch("/api/topics");
      if (response.ok) {
        const data = await response.json();
        setTopics(data);
        const uniqueScenes = Array.from(new Set(data.map((t: TopicTemplate) => t.scene))) as string[];
        setScenes(["全部", ...uniqueScenes]);
      }
    } catch (error) {
      console.error("Failed to fetch topics", error);
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  // 初始化
  useEffect(() => {
    fetchTopics();
    const savedTaskId = localStorage.getItem("last_generation_task_id");
    if (savedTaskId) {
      setTaskId(savedTaskId);
      setLoading(true);
      pollTaskStatus(savedTaskId);
      pollingRef.current = setInterval(() => pollTaskStatus(savedTaskId), 3000);
    }
    return () => stopPolling();
  }, [fetchTopics, pollTaskStatus, stopPolling]);

  // 批量进度轮询
  useEffect(() => {
    if (batchTaskIds.length === 0) return;
    const poll = async () => {
      let done = 0;
      for (const id of batchTaskIds) {
        try {
          const res = await fetch(`/api/tasks/${id}`);
          if (!res.ok) continue;
          const task = await res.json();
          if (task.status === "PENDING_REVIEW" || task.status === "FAILED") done += 1;
        } catch {}
      }
      setBatchDone(done);
      if (done >= batchTaskIds.length && batchPollingRef.current) {
        clearInterval(batchPollingRef.current);
        batchPollingRef.current = null;
      }
    };
    poll();
    batchPollingRef.current = setInterval(poll, 3000);
    return () => {
      if (batchPollingRef.current) {
        clearInterval(batchPollingRef.current);
        batchPollingRef.current = null;
      }
    };
  }, [batchTaskIds]);

  const startBatchGenerate = async () => {
    if (batchSelectedIds.length === 0) {
      alert("请至少选择一个选题");
      return;
    }
    const selected = topics.filter(t => batchSelectedIds.includes(t.id)).slice(0, 10);
    const items = selected.map(t => ({
      prompt: t.topic,
      channel: batchUnified ? batchUnifiedChannel : t.channel,
      contentType: batchUnified ? batchUnifiedType : "自动识别",
      scene: t.scene || "批量生成",
    }));
    try {
      const res = await fetch("/api/generate/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.taskIds)) {
        setBatchTaskIds(data.taskIds);
        setBatchDone(0);
        setIsBatchOpen(false);
      } else {
        alert(data.error || "批量生成提交失败");
      }
    } catch {
      alert("网络异常，批量提交失败");
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    
    setLoading(true);
    setResult("");
    setStatus("PENDING_GENERATE");
    
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          channel: selectedChannel,
          contentType: selectedContentType,
          scene: selectedTopicScene || "自主创作"
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Generation request failed");
      }
      
      const newTaskId = data.taskId;
      setTaskId(newTaskId);
      localStorage.setItem("last_generation_task_id", newTaskId);
      
      stopPolling();
      pollingRef.current = setInterval(() => pollTaskStatus(newTaskId), 3000);
    } catch (error: unknown) {
      console.error("Generation failed", error);
      const message = error instanceof Error ? error.message : "生成请求失败";
      setStatus("FAILED");
      setResult(`生成失败: ${message}`);
      setLoading(false);
    }
  };

  const handleSaveToTasks = async () => {
    if (!taskId || !result) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: taskId, 
          content: result,
          status: "PENDING_REVIEW" 
        }),
      });
      if (response.ok) {
        alert("已成功保存到任务库！");
      }
    } catch (error) {
      console.error("Failed to save task", error);
      alert("保存失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      // 这里的 result 是 Markdown 格式，如果需要带格式复制（如 HTML），
      // 通常富文本编辑器会提供转换方法，或者简单地复制 Markdown 源码。
      // 对于大多数自媒体平台，直接粘贴 Markdown 源码并不理想，
      // 但由于我们使用的是 @uiw/react-md-editor，用户可以直接在预览模式复制渲染后的内容。
      // 这里的“一键复制”我们先实现复制 Markdown 源码。
      navigator.clipboard.writeText(result);
      alert("内容已复制到剪贴板（Markdown格式）");
    }
  };

  const handleCopyRichText = () => {
    if (!result) return;
    
    // 获取预览区域的 HTML 内容
    const previewElement = document.querySelector(".wmde-markdown") as HTMLElement;
    if (previewElement) {
      const html = previewElement.innerHTML;
      const blob = new Blob([html], { type: "text/html" });
      const data = [new ClipboardItem({ "text/html": blob, "text/plain": new Blob([result], { type: "text/plain" }) })];
      
      navigator.clipboard.write(data).then(() => {
        alert("已成功复制富文本内容（带格式），可直接粘贴到自媒体平台！");
      }).catch(err => {
        console.error("Rich text copy failed:", err);
        handleCopy(); // 回退到普通复制
      });
    } else {
      handleCopy();
    }
  };

  const filteredTopics = filterScene === "全部" 
    ? topics 
    : topics.filter(t => t.scene === filterScene);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* 顶部标题与状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">内容生产工厂</h2>
            <p className="text-sm text-zinc-500 mt-1">基于 GEO 理论和品牌底座生成高质量营销内容</p>
          </div>
          {batchTaskIds.length > 0 && batchDone < batchTaskIds.length && (
            <div className="text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full px-3 py-1 shadow-sm">
              正在生成 {batchDone}/{batchTaskIds.length} 篇
            </div>
          )}
          {batchTaskIds.length > 0 && batchDone === batchTaskIds.length && (
            <button
              className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1"
              onClick={() => window.location.href = "/workbench/tasks"}
            >
              批量生成完成！前往任务看板查看
            </button>
          )}
        </div>
        {status !== "IDLE" && (
          <div className="flex items-center text-sm font-medium px-4 py-1.5 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-slate-200 dark:border-zinc-700">
            {status === "PENDING_GENERATE" && (
              <span className="text-amber-500 flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 云端处理中...
              </span>
            )}
            {status === "PENDING_REVIEW" && (
              <span className="text-green-500 flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2" /> 生成完成
              </span>
            )}
            {status === "FAILED" && (
              <span className="text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" /> 任务异常
              </span>
            )}
          </div>
        )}
      </div>

      {/* 主创作区 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左侧：输入区 */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="apple-card border-none shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Edit3 className="h-5 w-5 mr-2 text-[#0071e3]" />
                创作参数
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">发布渠道</label>
                <div className="grid grid-cols-2 gap-2">
                  {["知乎", "百家号", "今日头条", "搜狐号", "网易号"].map(channel => (
                    <button
                      key={channel}
                      onClick={() => setSelectedChannel(channel)}
                      className={cn(
                        "text-[10px] py-1.5 rounded-lg border transition-all",
                        selectedChannel === channel 
                          ? "bg-[#0071e3] text-white border-[#0071e3]" 
                          : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 hover:border-[#0071e3]"
                      )}
                    >
                      {channel}
                    </button>
                  ))}
                </div>
              </div>

      {/* 批量生成弹窗 */}
      <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>批量生成</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            {/* 选题列表 */}
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">从选题库勾选多个选题（最多 10 个）</p>
              <div className="max-h-[360px] overflow-y-auto border rounded-xl p-2 bg-white dark:bg-zinc-900">
                {topics.map((t) => (
                  <label key={t.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={batchSelectedIds.includes(t.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setBatchSelectedIds(prev => {
                          if (checked) {
                            if (prev.length >= 10) return prev;
                            return [...prev, t.id];
                          } else {
                            return prev.filter(id => id !== t.id);
                          }
                        });
                      }}
                    />
                    <div className="text-xs">
                      <div className="font-medium text-slate-700 dark:text-zinc-300">{t.topic}</div>
                      <div className="text-[10px] text-zinc-400 mt-1">{t.channel} · {t.scene}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 设置区 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">统一设置</span>
                <label className="text-xs text-zinc-500">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={batchUnified}
                    onChange={(e) => setBatchUnified(e.target.checked)}
                  />
                  所有选题使用同一渠道与内容类型
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">渠道</label>
                <select
                  disabled={!batchUnified}
                  value={batchUnifiedChannel}
                  onChange={(e) => setBatchUnifiedChannel(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                >
                  {["知乎", "百家号", "今日头条", "搜狐号", "网易号"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">内容类型</label>
                <select
                  disabled={!batchUnified}
                  value={batchUnifiedType}
                  onChange={(e) => setBatchUnifiedType(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                >
                  {["自动识别", "经验分享", "定义科普", "选型指南", "竞品对比", "行业应用"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 text-xs text-zinc-500 border border-slate-200 dark:border-zinc-800">
                预计生成时间：约 {Math.ceil(Math.max(1, batchSelectedIds.length) * 0.7)} 分钟（按每篇 ~40 秒估算）
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={startBatchGenerate}
              disabled={batchSelectedIds.length === 0}
              className="bg-[#0071e3] hover:bg-[#0071e3]/90 border-none text-white"
            >
              开始批量生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">内容类型</label>
                <select 
                  value={selectedContentType}
                  onChange={(e) => setSelectedContentType(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 focus:outline-none focus:border-[#0071e3]"
                >
                  {["自动识别", "经验分享", "定义科普", "选型指南", "竞品对比", "行业应用"].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">创作指令</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="从下方的选题库中选择，或直接输入您的创作需求..."
                  className="min-h-[150px] rounded-[12px] border-slate-200 focus-visible:ring-[#0071e3] resize-none text-sm p-3"
                  disabled={loading}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button"
                  variant="outline"
                  className="rounded-[12px] h-11 border-slate-200"
                  onClick={() => setIsBatchOpen(true)}
                >
                  批量生成
                </Button>
                <Button 
                  onClick={handleGenerate} 
                  disabled={loading || !prompt}
                  className={cn(
                    "w-full bg-[#0071e3] hover:bg-[#0071e3]/90 border-none text-white h-11 rounded-[12px] font-medium transition-all shadow-lg shadow-blue-500/20",
                    loading && "opacity-80"
                  )}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {loading ? "处理中" : "立即生成"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 选题库 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center text-slate-600">
                <BookOpen className="h-4 w-4 mr-2 text-[#0071e3]" />
                快速选题
              </h3>
              <select 
                className="text-[10px] bg-transparent border-none focus:ring-0 text-[#0071e3] font-medium"
                value={filterScene}
                onChange={(e) => setFilterScene(e.target.value)}
              >
                {scenes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {topicsLoading ? (
                <div className="py-10 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-zinc-300" /></div>
              ) : (
                filteredTopics.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setPrompt(item.topic);
                      setSelectedChannel(item.channel);
                      setSelectedTopicScene(item.scene);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 hover:border-[#0071e3] transition-all group"
                  >
                    <p className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 group-hover:text-[#0071e3] line-clamp-2 leading-tight">
                      {item.topic}
                    </p>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[9px] text-[#0071e3] font-bold uppercase">{item.channel}</span>
                      <span className="text-[9px] text-zinc-400">{item.scene}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 中间：编辑器区 */}
        <div className="lg:col-span-6">
          <Card className="apple-card border-none shadow-md overflow-hidden flex flex-col min-h-[750px]">
            <CardHeader className="pb-3 border-b border-slate-50 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-[#0071e3]" />
                  内容编辑与预览
                </CardTitle>
                <div className="flex items-center gap-2">
                  {result && (
                    <>
                      <Button variant="ghost" size="sm" className="h-8 text-[11px] text-slate-500 px-2" onClick={handleCopyRichText}>
                        <Copy className="h-3 w-3 mr-1" /> 复制 (带格式)
                      </Button>
                      <Button 
                        size="sm" 
                        className="h-8 text-[11px] bg-green-600 hover:bg-green-700 text-white border-none px-2"
                        onClick={handleSaveToTasks}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                        保存
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 bg-white dark:bg-zinc-950">
              <div className="h-full prose prose-sm max-w-none" data-color-mode="light">
                {loading && !result ? (
                  <div className="flex flex-col items-center justify-center h-[600px] text-zinc-400 gap-4">
                    <div className="relative">
                      <Loader2 className="h-12 w-12 animate-spin text-[#0071e3]" />
                      <Sparkles className="h-5 w-5 text-[#0071e3] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-700 dark:text-zinc-300 text-lg">AI 正在深度创作中</p>
                      <p className="text-sm mt-1">基于品牌知识库与行业经验，正在为您去除“AI味”...</p>
                    </div>
                  </div>
                ) : (
                    <div className="h-full flex-1 overflow-hidden">
                      <MDEditor
                        value={result}
                        onChange={setResult}
                        preview="live"
                        height="100%"
                        minHeight={700}
                        className="border-none shadow-none flex-1"
                        textareaProps={{
                          placeholder: "生成的内容将在此展示，您可以直接在这里编辑修改..."
                        }}
                      />
                    </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：评分区 */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="apple-card border-none shadow-md overflow-hidden min-h-[750px]">
            <CardHeader className="pb-3 border-b border-slate-50 dark:border-zinc-800">
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-[#0071e3]" />
                GEO 质量评分
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              {isScoring ? (
                <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0071e3]" />
                  <p className="text-xs font-medium">正在评估 GEO 优化质量...</p>
                </div>
              ) : score ? (
                <div className="space-y-6">
                  {/* 总分 */}
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800">
                    <div className={cn(
                      "text-5xl font-black mb-2",
                      score.total / 120 >= 0.8 ? "text-green-500" : score.total / 120 >= 0.6 ? "text-amber-500" : "text-red-500"
                    )}>
                      {score.total}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">GEO 总评分</div>
                  </div>

                  {/* 细项 */}
                  <div className="space-y-4">
                    {score.items.map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 dark:text-zinc-300">{item.name}</span>
                          <span className="text-slate-400 font-medium">{item.score} / {item.max}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              item.score / item.max >= 0.8 ? "bg-green-500" : item.score / item.max >= 0.6 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${(item.score / item.max) * 100}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500 flex items-start leading-tight">
                          <Info className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0 text-slate-300" />
                          {item.tip}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 建议 */}
                  <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
                      <ChevronRight className="h-4 w-4 text-[#0071e3]" />
                      优化建议
                    </div>
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-900/20">
                      <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed italic">
                        {score.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-4 opacity-40">
                  <div className="p-4 rounded-full bg-slate-100 dark:bg-zinc-900">
                    <BarChart3 className="h-10 w-10" />
                  </div>
                  <p className="text-xs text-center max-w-[150px] leading-relaxed">
                    生成内容后将自动触发<br />GEO 质量多维度评分
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
