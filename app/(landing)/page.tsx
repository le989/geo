import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Factory, Search, Kanban, Database } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-zinc-950 px-4 text-center">
      <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-[#0071e3]/10 text-[#0071e3] mb-8">
        GEO工厂 v1.0 现已发布
      </div>
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
        基于 GEO 理论的<br />品牌内容生产工厂
      </h1>
      <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10 leading-relaxed">
        GEO工厂帮助品牌在 AI 搜索时代重新构建内容生产流程，通过品牌知识底座确保内容的专业性与合规性。
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mb-20">
        <Button asChild size="lg" className="bg-[#0071e3] hover:bg-[#0071e3]/90 text-white rounded-full px-8 border-none">
          <Link href="/workbench/brand">
            开始使用 <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-full px-8">
          <Link href="https://github.com">了解更多</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl w-full">
        {[
          { icon: Database, title: "品牌底座", desc: "构建品牌的 AI 知识核心" },
          { icon: Factory, title: "内容生产", desc: "基于 GEO 理论生成高质量内容" },
          { icon: Search, title: "品牌监测", desc: "实时掌握品牌在 AI 搜索中的表现" },
          { icon: Kanban, title: "任务看板", desc: "全流程可视化的内容管理" },
        ].map((item, index) => (
          <div key={index} className="flex flex-col items-center p-6 rounded-2xl bg-slate-50 dark:bg-zinc-900">
            <item.icon className="h-8 w-8 text-[#0071e3] mb-4" />
            <h3 className="font-bold text-lg mb-2">{item.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
