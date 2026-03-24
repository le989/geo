import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 获取最近30天的数据
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results = await db.monitorResult.findMany({
      where: {
        runAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        platform: true,
        mentioned: true,
        runAt: true,
      },
      orderBy: {
        runAt: 'asc',
      },
    });

    // 按日期和平台分组统计
    const statsMap: { [date: string]: { [platform: string]: { total: number; mentioned: number } } } = {};

    results.forEach((res) => {
      const date = res.runAt.toISOString().split('T')[0];
      const platform = res.platform;

      if (!statsMap[date]) statsMap[date] = {};
      if (!statsMap[date][platform]) statsMap[date][platform] = { total: 0, mentioned: 0 };

      statsMap[date][platform].total += 1;
      if (res.mentioned) statsMap[date][platform].mentioned += 1;
    });

    // 转换为图表所需格式
    const chartData = Object.keys(statsMap).map((date) => {
      const platformsData = statsMap[date];
      const entry: Record<string, string | number> = { date };
      
      Object.keys(platformsData).forEach((platform) => {
        const { total, mentioned } = platformsData[platform];
        entry[platform] = Math.round((mentioned / total) * 100);
      });

      return entry;
    });

    // 计算顶部统计数据
    // 1. 获取所有平台的列表
    const platforms = Array.from(new Set(results.map(r => r.platform)));
    
    // 2. 计算最近一次监测的各平台提及率
    const latestDate = Object.keys(statsMap).sort().reverse()[0];
    let overallRate = 0;
    
    if (latestDate) {
      const latestData = statsMap[latestDate];
      const rates = Object.values(latestData).map(d => (d.mentioned / d.total) * 100);
      overallRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
    }

    return NextResponse.json({
      chartData,
      overallRate,
      platforms,
    });
  } catch (error) {
    console.error("[MONITOR_STATS_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
