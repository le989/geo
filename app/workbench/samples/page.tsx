"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, RefreshCw, Search, StarOff } from "lucide-react";

type SampleItem = {
  id: string;
  taskId: string;
  title: string;
  channel: string;
  scene: string;
  reason: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  excerpt: string;
};

const ALL_FILTER = "all";

export default function SamplesPage() {
  const [items, setItems] = useState<SampleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState(ALL_FILTER);
  const [sceneFilter, setSceneFilter] = useState(ALL_FILTER);
  const [removingTaskId, setRemovingTaskId] = useState<string | null>(null);

  const fetchSamples = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/samples", { cache: "no-store" });
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch samples", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, []);

  const channelOptions = useMemo(() => [ALL_FILTER, ...Array.from(new Set(items.map((item) => item.channel)))], [items]);
  const sceneOptions = useMemo(() => [ALL_FILTER, ...Array.from(new Set(items.map((item) => item.scene)))], [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = !searchQuery || item.title.includes(searchQuery) || item.excerpt.includes(searchQuery) || item.reason.includes(searchQuery);
      const matchesChannel = channelFilter === ALL_FILTER || item.channel === channelFilter;
      const matchesScene = sceneFilter === ALL_FILTER || item.scene === sceneFilter;
      return matchesSearch && matchesChannel && matchesScene;
    });
  }, [items, searchQuery, channelFilter, sceneFilter]);

  const removeSample = async (taskId: string) => {
    setRemovingTaskId(taskId);
    try {
      await fetch(`/api/samples?taskId=${taskId}`, { method: "DELETE" });
      await fetchSamples();
    } finally {
      setRemovingTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-medium text-[#0071e3]">优质资产</div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">样板库</h1>
          <p className="mt-2 text-sm text-slate-500">沉淀适合复用的优质文章，供后续生成、选题和编辑参考。</p>
        </div>
        <Button asChild className="rounded-xl bg-[#0071e3] px-5 hover:bg-[#0071e3]/90">
          <Link href="/workbench/articles">从文章列表挑选样板</Link>
        </Button>
      </div>

      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索标题、摘要或样板说明..." className="h-11 rounded-xl border-slate-200 pl-10" />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200"><SelectValue placeholder="渠道" /></SelectTrigger>
              <SelectContent>{channelOptions.map((item) => <SelectItem key={item} value={item}>{item === ALL_FILTER ? "全部渠道" : item}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sceneFilter} onValueChange={setSceneFilter}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200"><SelectValue placeholder="场景" /></SelectTrigger>
              <SelectContent>{sceneOptions.map((item) => <SelectItem key={item} value={item}>{item === ALL_FILTER ? "全部场景" : item}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" className="h-11 rounded-xl border-slate-200" onClick={() => { setSearchQuery(""); setChannelFilter(ALL_FILTER); setSceneFilter(ALL_FILTER); }}>
              <RefreshCw className="mr-2 h-4 w-4" />重置
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="flex items-center justify-center gap-2 p-8 text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" />正在加载样板库...</CardContent></Card>
        ) : filteredItems.length ? (
          filteredItems.map((item) => (
            <Card key={item.id} className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">优质样板</span>
                      <span>{item.channel}</span>
                      <span>{item.scene}</span>
                    </div>
                    <div className="mt-2 text-xl font-bold text-slate-900">{item.title}</div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.excerpt || "暂无摘要"}</p>
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">{item.reason || "这篇内容已被标记为可长期复用的参考样板。"}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild variant="outline" className="rounded-xl border-slate-200"><Link href={"/workbench/factory?taskId=" + item.taskId}>继续查看</Link></Button>
                    <Button variant="outline" className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50" disabled={removingTaskId === item.taskId} onClick={() => removeSample(item.taskId)}>
                      <StarOff className="mr-2 h-4 w-4" />移出样板库
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400"><BookOpen className="h-4 w-4" />最近更新：{new Date(item.updatedAt).toLocaleString()} · 创建人：{item.createdBy}</div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center"><BookOpen className="h-10 w-10 text-slate-300" /><div className="text-lg font-semibold text-slate-700">暂无样板</div><div className="max-w-md text-sm leading-relaxed text-slate-500">先在文章列表里把高质量内容加入样板库，后面生成时就能作为长期参考资产。</div><Button asChild className="rounded-xl bg-[#0071e3] px-5 hover:bg-[#0071e3]/90"><Link href="/workbench/articles">去文章列表</Link></Button></CardContent></Card>
        )}
      </div>
    </div>
  );
}


