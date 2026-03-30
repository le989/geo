import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import monitoring from "@/lib/monitoring";

const { buildMonitorStats } = monitoring as {
  buildMonitorStats: (results: Array<Record<string, any>>) => Record<string, any>;
};

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results = await db.monitorResult.findMany({
      where: {
        runAt: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        question: {
          select: {
            question: true,
          },
        },
      },
      orderBy: [{ runAt: "asc" }, { platform: "asc" }],
    });

    const stats = buildMonitorStats(results);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[MONITOR_STATS_ERROR]", error);
    return NextResponse.json({ error: "\u83b7\u53d6\u76d1\u6d4b\u7edf\u8ba1\u5931\u8d25" }, { status: 500 });
  }
}
