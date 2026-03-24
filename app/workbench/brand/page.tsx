"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Database, Globe, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function BrandPage() {
  const [profile, setProfile] = useState({
    name: "",
    intro: "",
    productLines: "",
    scenes: "",
    forbidden: "",
    sources: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawlStep, setCrawlStep] = useState("");
  const [crawlUrl, setCrawlUrl] = useState("https://www.kjtchina.com/list-product.html");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/brand");
        const data = await response.json();
        if (data.id) {
          setProfile(data);
        }
      } catch (error) {
        console.error("Failed to fetch brand profile", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleCrawl = async () => {
    if (!crawlUrl) return;
    setCrawling(true);
    setCrawlStep("正在抓取产品分类...");
    try {
      // 模拟步骤更新，因为 API 是一个整体请求
      const stepTimer = setTimeout(() => setCrawlStep("正在解析产品详情..."), 3000);
      const stepTimer2 = setTimeout(() => setCrawlStep("正在整理产品参数..."), 8000);

      const response = await fetch("/api/brand/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: crawlUrl }),
      });
      
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setProfile({
        ...profile,
        name: data.name || profile.name,
        intro: data.intro || profile.intro,
        productLines: data.productLines || profile.productLines,
        scenes: data.scenes || profile.scenes,
        sources: data.sources || profile.sources,
      });
      setIsDialogOpen(false);
      alert(`完成！共抓取分析了 ${data.count || 0} 个产品系列。请检查后保存。`);
    } catch (error: unknown) {
      console.error("Crawl failed", error);
      const message = error instanceof Error ? error.message : "未知错误";
      alert(`抓取失败: ${message}`);
    } finally {
      setCrawling(false);
      setCrawlStep("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      alert("保存成功！");
    } catch (error) {
      console.error("Failed to save brand profile", error);
      alert("保存失败！");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#0071e3]" />
          <p className="text-sm text-zinc-500">正在加载品牌底座...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
          <Database className="h-6 w-6 mr-2 text-[#0071e3]" />
          品牌知识底座
        </h2>
        <div className="flex items-center gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#0071e3] text-[#0071e3] hover:bg-[#0071e3]/10">
                <Globe className="h-4 w-4 mr-2" />
                从官网抓取
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>从官网自动构建</DialogTitle>
                <DialogDescription>
                  输入公司官网的产品中心或关于我们 URL，AI 将自动分析并填充品牌底座信息。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="url">官网 URL</Label>
                  <Input
                    id="url"
                    value={crawlUrl}
                    onChange={(e) => setCrawlUrl(e.target.value)}
                    placeholder="https://www.example.com/products"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCrawl} 
                  disabled={crawling || !crawlUrl}
                  className="bg-[#0071e3] text-white hover:bg-[#0071e3]/90 w-full"
                >
                  {crawling ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {crawlStep || "正在处理..."}</>
                  ) : (
                    <><Wand2 className="h-4 w-4 mr-2" /> 开始自动构建</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={handleSave} disabled={saving} className="bg-[#0071e3] hover:bg-[#0071e3]/90 border-none text-white">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            保存更新
          </Button>
        </div>
      </div>

      <Card className="apple-card">
        <CardHeader>
          <CardTitle className="text-lg">品牌核心信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">品牌名称</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="例如：华为"
              className="rounded-[12px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="intro">品牌标准介绍</Label>
            <Textarea
              id="intro"
              value={profile.intro}
              onChange={(e) => setProfile({ ...profile, intro: e.target.value })}
              placeholder="请输入品牌的官方定位和标准介绍..."
              className="rounded-[12px] min-h-[120px]"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="apple-card">
          <CardHeader>
            <CardTitle className="text-lg">产品与场景</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productLines">产品线</Label>
              <Textarea
                id="productLines"
                value={profile.productLines}
                onChange={(e) => setProfile({ ...profile, productLines: e.target.value })}
                placeholder="列出品牌的核心产品系列..."
                className="rounded-[12px] min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scenes">典型应用场景</Label>
              <Textarea
                id="scenes"
                value={profile.scenes}
                onChange={(e) => setProfile({ ...profile, scenes: e.target.value })}
                placeholder="描述产品的主要使用场景..."
                className="rounded-[12px] min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="apple-card">
          <CardHeader>
            <CardTitle className="text-lg">规范与数据</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forbidden">禁止表述</Label>
              <Textarea
                id="forbidden"
                value={profile.forbidden}
                onChange={(e) => setProfile({ ...profile, forbidden: e.target.value })}
                placeholder="列出内容创作中严禁出现的词汇或观点..."
                className="rounded-[12px] min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sources">可引用数据来源</Label>
              <Textarea
                id="sources"
                value={profile.sources}
                onChange={(e) => setProfile({ ...profile, sources: e.target.value })}
                placeholder="列出品牌认可的数据、报告或案例来源..."
                className="rounded-[12px] min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
