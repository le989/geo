"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, BarChart3, Clock, Loader2, Filter, AlertCircle, Globe } from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { cn } from "@/lib/utils";

const PLATFORM_COLORS: { [key: string]: string } = {
  "知乎": "#0071e3",
  "百家号": "#ff4d4f",
  "今日头条": "#faad14",
  "搜狐号": "#52c41a",
  "默认": "#8884d8"
};

type MonitorChartEntry = Record<string, string | number>;
type MonitorStats = {
  chartData: MonitorChartEntry[];
  overallRate: number;
  platforms: string[];
};

export default function MonitorPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [dateFilter, setDateFilter] = useState("7"); // "today", "7", "30"

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/monitor/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch monitor stats", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    };
    init();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0071e3]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">品牌监测中心</h2>
          <p className="text-sm text-zinc-500 mt-1">实时掌握品牌在主流平台的提及率与正面率</p>
        </div>
        <Button className="bg-[#0071e3] hover:bg-[#0071e3]/90 border-none text-white rounded-full">
          <Search className="h-4 w-4 mr-2" /> 立即运行全网监测
        </Button>
      </div>

      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="apple-card border-none shadow-sm bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">综合提及率</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-white">
                  {stats?.overallRate || 0}%
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs text-blue-600/60 mt-4 flex items-center">
              较上周同期 <span className="font-bold mx-1">+5%</span> 
            </p>
          </CardContent>
        </Card>

        <Card className="apple-card border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">监测问题数</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">12</p>
              </div>
              <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-2xl text-slate-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">每日自动运行 2 次</p>
          </CardContent>
        </Card>

        <Card className="apple-card border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">覆盖平台</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stats?.platforms?.length || 4}
                </p>
              </div>
              <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-2xl text-slate-600">
                <Globe className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">包含知乎、百家号、头条等</p>
          </CardContent>
        </Card>
      </div>

      {/* 历史趋势图 */}
      <Card className="apple-card border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-[#0071e3]" />
              提及率变化趋势
            </CardTitle>
            <CardDescription>最近30天各平台监测数据</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full mt-4">
            {(stats?.chartData?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                    }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" height={36} />
                  {stats?.platforms?.map((platform: string) => (
                    <Line
                      key={platform}
                      type="monotone"
                      dataKey={platform}
                      stroke={PLATFORM_COLORS[platform] || PLATFORM_COLORS["默认"]}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
                <p>暂无趋势数据，请运行监测后查看</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 监测明细 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">监测明细</h3>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-400" />
            <div className="flex gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-slate-200 dark:border-zinc-800">
              {[
                { label: "今天", value: "today" },
                { label: "最近7天", value: "7" },
                { label: "最近30天", value: "30" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setDateFilter(f.value)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-md transition-all",
                    dateFilter === f.value 
                      ? "bg-[#0071e3] text-white shadow-sm" 
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Card className="apple-card border-none shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 text-slate-500 font-medium">
                  <th className="px-6 py-4">监测时间</th>
                  <th className="px-6 py-4">平台</th>
                  <th className="px-6 py-4">提及</th>
                  <th className="px-6 py-4">位置</th>
                  <th className="px-6 py-4">产品准确性</th>
                  <th className="px-6 py-4">事实错误</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-zinc-800/50">
                <tr className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 text-slate-400">2024-03-24 10:30</td>
                  <td className="px-6 py-4 font-medium">知乎</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                      是
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-zinc-400">第 1 名</td>
                  <td className="px-6 py-4 text-green-600">准确</td>
                  <td className="px-6 py-4 text-slate-400">—</td>
                </tr>
                {/* 更多行... */}
              </tbody>
            </table>
            <div className="p-10 flex flex-col items-center justify-center text-zinc-400">
              <Search className="h-8 w-8 mb-2 opacity-10" />
              <p className="text-xs">仅显示示例数据，实际数据请运行监测后获取</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
