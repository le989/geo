"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Database, Globe, History, Loader2, Save, TriangleAlert, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type BrandProfile = {
  name: string;
  intro: string;
  productLines: string;
  scenes: string;
  forbidden: string;
  sources: string;
};

type FieldMeta = {
  updatedAt: string;
  updatedBy: string | null;
  sourceType: string;
  sourceLabel: string | null;
};

type BrandResponse = BrandProfile & {
  fieldMeta?: Record<string, FieldMeta>;
};

type CrawlDiff = {
  fieldKey: keyof BrandProfile;
  label: string;
  oldValue: string;
  newValue: string;
  changed: boolean;
};

type CrawlPreview = {
  preview: BrandProfile;
  diffs: CrawlDiff[];
  count: number;
  crawledUrls: string[];
  changedCount: number;
};

type HistoryItem = {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  changeType: string;
  changedBy: string | null;
  sourceLabel: string | null;
  createdAt: string;
};

const EMPTY_PROFILE: BrandProfile = {
  name: "",
  intro: "",
  productLines: "",
  scenes: "",
  forbidden: "",
  sources: "",
};

const FIELD_LABELS: Record<keyof BrandProfile, string> = {
  name: "品牌名称",
  intro: "品牌简介",
  productLines: "产品线与代表型号",
  scenes: "典型应用场景",
  forbidden: "禁止表述",
  sources: "可引用来源",
};

const FIELD_HINTS: Record<keyof BrandProfile, string> = {
  name: "填写品牌正式名称，例如 凯基特",
  intro: "用 2-4 句介绍品牌定位、核心能力和行业角色，只保留事实信息。",
  productLines: "一行一个要点，例如：电感接近开关 - M12/M18、抗干扰、适合金属检测",
  scenes: "一行一个典型应用场景，例如：包装产线定位、物流分拣检测、液位监测",
  forbidden: "一行一个禁用表述，例如：行业第一、100% 零误差、绝对领先",
  sources: "一行一个可引用来源 URL 或页面标题，用于后续内容引用。",
};

function isStale(updatedAt?: string) {
  if (!updatedAt) return true;
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  return ageMs > 90 * 24 * 60 * 60 * 1000;
}

function formatDate(value?: string) {
  if (!value) return "暂无记录";
  return new Date(value).toLocaleString("zh-CN");
}

function summarizeText(value: string) {
  const text = (value || "").trim();
  if (!text) return "空";
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
}

export default function BrandPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "history">("profile");
  const [profile, setProfile] = useState<BrandProfile>(EMPTY_PROFILE);
  const [fieldMeta, setFieldMeta] = useState<Record<string, FieldMeta>>({});
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState("https://www.kjtchina.com/list-product.html");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawlPreview, setCrawlPreview] = useState<CrawlPreview | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);

  const staleCount = useMemo(
    () => Object.keys(FIELD_LABELS).filter((field) => isStale(fieldMeta[field]?.updatedAt)).length,
    [fieldMeta],
  );

  const fetchProfile = async () => {
    const response = await fetch("/api/brand", { cache: "no-store" });
    const data: BrandResponse = await response.json();
    setProfile({ ...EMPTY_PROFILE, ...data });
    setFieldMeta(data.fieldMeta || {});
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/brand/history", { cache: "no-store" });
      const data = await response.json();
      setHistoryItems(Array.isArray(data.items) ? data.items : []);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        await fetchProfile();
      } catch (error) {
        console.error("Failed to fetch brand profile", error);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      void fetchHistory();
    }
  }, [activeTab]);

  const updateField = (key: keyof BrandProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error("保存品牌资料失败");
      const data: BrandResponse = await response.json();
      setProfile({ ...EMPTY_PROFILE, ...data });
      setFieldMeta(data.fieldMeta || {});
      alert("品牌资料已保存");
      if (activeTab === "history") {
        await fetchHistory();
      }
    } catch (error) {
      console.error("Failed to save brand profile", error);
      alert(error instanceof Error ? error.message : "保存品牌资料失败");
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewCrawl = async () => {
    if (!crawlUrl.trim()) return;
    setCrawling(true);
    try {
      const response = await fetch("/api/brand/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: crawlUrl.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "官网抓取失败");
      setCrawlPreview(data);
      setSelectedFields((data.diffs || []).filter((item: CrawlDiff) => item.changed).map((item: CrawlDiff) => item.fieldKey));
    } catch (error) {
      console.error("Failed to crawl brand site", error);
      alert(error instanceof Error ? error.message : "官网抓取失败");
    } finally {
      setCrawling(false);
    }
  };

  const handleApplyPreview = async () => {
    if (!crawlPreview || selectedFields.length === 0) {
      alert("请至少勾选一个要应用的字段");
      return;
    }
    setApplying(true);
    try {
      const response = await fetch("/api/brand/crawl/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preview: crawlPreview.preview,
          fields: selectedFields,
          sourceLabel: "官网更新确认",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "应用官网变更失败");
      setProfile({ ...EMPTY_PROFILE, ...(data.profile || {}) });
      setFieldMeta(data.fieldMeta || {});
      setCrawlPreview(null);
      setSelectedFields([]);
      setIsDialogOpen(false);
      alert(`已应用 ${Array.isArray(data.appliedFields) ? data.appliedFields.length : 0} 个字段变更`);
      if (activeTab === "history") {
        await fetchHistory();
      }
    } catch (error) {
      console.error("Failed to apply crawl preview", error);
      alert(error instanceof Error ? error.message : "应用官网变更失败");
    } finally {
      setApplying(false);
    }
  };

  const renderFieldMeta = (fieldKey: keyof BrandProfile) => {
    const meta = fieldMeta[fieldKey];
    const stale = isStale(meta?.updatedAt);
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
        <span>上次更新时间：{formatDate(meta?.updatedAt)}</span>
        {meta?.sourceLabel ? <span>来源：{meta.sourceLabel}</span> : null}
        {stale ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">超过 90 天未更新</span> : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-[360px] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#0071e3]" />
          <p className="text-sm">正在加载品牌知识库...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <Database className="h-6 w-6 text-[#0071e3]" />
            品牌知识库
          </h2>
          <p className="mt-2 text-sm text-slate-500">维护品牌事实、来源和禁止表述，同时跟踪每个字段的更新时间与变更历史。</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            待更新字段：{staleCount}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#0071e3] text-[#0071e3] hover:bg-[#0071e3]/10">
                <Globe className="mr-2 h-4 w-4" />
                从官网更新
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>从官网更新品牌资料</DialogTitle>
                <DialogDescription>先抓取官网内容并生成字段 diff，确认后才会真正写入品牌知识库。</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="crawl-url">官网 URL</Label>
                  <Input id="crawl-url" value={crawlUrl} onChange={(e) => setCrawlUrl(e.target.value)} placeholder="https://www.example.com/products" />
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">
                  第一步先抓取并生成 diff 预览；第二步勾选确认后才会真正更新字段并写入变更历史。
                </div>
                {crawlPreview ? (
                  <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>抓取页面数：{crawlPreview.count}</span>
                      <span>变更字段数：{crawlPreview.changedCount}</span>
                    </div>
                    <div className="space-y-3">
                      {crawlPreview.diffs.map((diff) => (
                        <label key={diff.fieldKey} className="block rounded-2xl border border-slate-100 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-medium text-slate-900">{diff.label}</div>
                              <div className="mt-1 text-xs text-zinc-500">{diff.changed ? "检测到变更" : "无变化"}</div>
                            </div>
                            {diff.changed ? (
                              <input
                                type="checkbox"
                                checked={selectedFields.includes(diff.fieldKey)}
                                onChange={(e) => {
                                  setSelectedFields((prev) =>
                                    e.target.checked ? [...prev, diff.fieldKey] : prev.filter((item) => item !== diff.fieldKey),
                                  );
                                }}
                              />
                            ) : null}
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div>
                              <div className="mb-1 text-xs font-medium text-zinc-500">当前值</div>
                              <div className="min-h-[84px] rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">{summarizeText(diff.oldValue)}</div>
                            </div>
                            <div>
                              <div className="mb-1 text-xs font-medium text-zinc-500">抓取预览</div>
                              <div className="min-h-[84px] rounded-xl bg-blue-50 p-3 text-sm text-slate-800">{summarizeText(diff.newValue)}</div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={handlePreviewCrawl} disabled={crawling || !crawlUrl.trim()}>
                  {crawling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  生成 diff 预览
                </Button>
                <Button onClick={handleApplyPreview} disabled={applying || !crawlPreview} className="bg-[#0071e3] text-white hover:bg-[#0071e3]/90">
                  {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  确认应用变更
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={handleSave} disabled={saving} className="border-none bg-[#0071e3] text-white hover:bg-[#0071e3]/90">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            保存品牌资料
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={activeTab === "profile" ? "default" : "outline"} className={activeTab === "profile" ? "bg-[#0071e3] text-white hover:bg-[#0071e3]/90" : ""} onClick={() => setActiveTab("profile")}>
          <Database className="mr-2 h-4 w-4" />品牌资料
        </Button>
        <Button variant={activeTab === "history" ? "default" : "outline"} className={activeTab === "history" ? "bg-[#0071e3] text-white hover:bg-[#0071e3]/90" : ""} onClick={() => setActiveTab("history")}>
          <History className="mr-2 h-4 w-4" />变更历史
        </Button>
      </div>

      {activeTab === "profile" ? (
        <>
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="text-lg">品牌基础信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">{FIELD_LABELS.name}</Label>
                {renderFieldMeta("name")}
                <Input id="name" value={profile.name} onChange={(e) => updateField("name", e.target.value)} placeholder={FIELD_HINTS.name} className="rounded-[12px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="intro">{FIELD_LABELS.intro}</Label>
                {renderFieldMeta("intro")}
                <Textarea id="intro" value={profile.intro} onChange={(e) => updateField("intro", e.target.value)} placeholder={FIELD_HINTS.intro} className="min-h-[140px] rounded-[12px]" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="apple-card">
              <CardHeader>
                <CardTitle className="text-lg">产品与场景</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="productLines">{FIELD_LABELS.productLines}</Label>
                  {renderFieldMeta("productLines")}
                  <Textarea id="productLines" value={profile.productLines} onChange={(e) => updateField("productLines", e.target.value)} placeholder={FIELD_HINTS.productLines} className="min-h-[180px] rounded-[12px]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scenes">{FIELD_LABELS.scenes}</Label>
                  {renderFieldMeta("scenes")}
                  <Textarea id="scenes" value={profile.scenes} onChange={(e) => updateField("scenes", e.target.value)} placeholder={FIELD_HINTS.scenes} className="min-h-[180px] rounded-[12px]" />
                </div>
              </CardContent>
            </Card>

            <Card className="apple-card">
              <CardHeader>
                <CardTitle className="text-lg">约束与来源</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="forbidden">{FIELD_LABELS.forbidden}</Label>
                  {renderFieldMeta("forbidden")}
                  <Textarea id="forbidden" value={profile.forbidden} onChange={(e) => updateField("forbidden", e.target.value)} placeholder={FIELD_HINTS.forbidden} className="min-h-[180px] rounded-[12px]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sources">{FIELD_LABELS.sources}</Label>
                  {renderFieldMeta("sources")}
                  <Textarea id="sources" value={profile.sources} onChange={(e) => updateField("sources", e.target.value)} placeholder={FIELD_HINTS.sources} className="min-h-[180px] rounded-[12px]" />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="apple-card">
          <CardHeader>
            <CardTitle className="text-lg">变更历史</CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="py-12 text-center text-zinc-400">
                <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />正在加载变更历史...
              </div>
            ) : historyItems.length === 0 ? (
              <div className="py-12 text-center text-zinc-400">暂无变更历史</div>
            ) : (
              <div className="space-y-3">
                {historyItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-700">{item.fieldLabel}</span>
                      <span>{formatDate(item.createdAt)}</span>
                      <span>变更人：{item.changedBy || "unknown"}</span>
                      <span>来源：{item.sourceLabel || item.changeType}</span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="mb-1 text-xs font-medium text-zinc-500">旧值</div>
                        <div className="min-h-[84px] rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">{summarizeText(item.oldValue)}</div>
                      </div>
                      <div>
                        <div className="mb-1 text-xs font-medium text-zinc-500">新值</div>
                        <div className="min-h-[84px] rounded-xl bg-emerald-50 p-3 text-sm text-slate-800">{summarizeText(item.newValue)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {staleCount > 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <TriangleAlert className="h-4 w-4" />
          有 {staleCount} 个字段超过 90 天未更新，建议优先检查并刷新品牌资料。
        </div>
      ) : null}
    </div>
  );
}
