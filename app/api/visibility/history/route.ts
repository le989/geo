import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

function getRole() {
  return cookies().get("gf_role")?.value || "";
}

function canReadTask(role: string, status?: string | null) {
  if (role === "admin" || role === "editor") return true;
  if (role === "viewer") return status === "COMPLETED";
  return false;
}

function toDateKey(date: string | Date) {
  return new Date(date).toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const role = getRole();
  if (!role) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId") || "";
    const keyword = searchParams.get("keyword") || undefined;
    const platform = searchParams.get("platform") || undefined;

    const task = taskId
      ? await db.contentTask.findUnique({
          where: { id: taskId },
          select: { id: true, title: true, status: true, channel: true, scene: true },
        })
      : null;

    if (taskId && !task) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    if (task && !canReadTask(role, task.status)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const rows = await (db as any).visibilityQueryResult.findMany({
      where: {
        ...(taskId ? { taskId } : {}),
        ...(keyword ? { keyword } : {}),
        ...(platform ? { platform } : {}),
        ...(role === "viewer"
          ? {
              task: {
                status: "COMPLETED",
              },
            }
          : {}),
      },
      orderBy: [{ queriedAt: "desc" }],
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            channel: true,
            scene: true,
          },
        },
      },
    });

    const trendMap: Record<string, Record<string, { total: number; mentioned: number }>> = {};
    for (const row of rows) {
      const dateKey = toDateKey(row.queriedAt);
      if (!trendMap[dateKey]) trendMap[dateKey] = {};
      if (!trendMap[dateKey][row.platform]) trendMap[dateKey][row.platform] = { total: 0, mentioned: 0 };
      trendMap[dateKey][row.platform].total += 1;
      if (row.mentioned) trendMap[dateKey][row.platform].mentioned += 1;
    }

    const platformTrend = Object.keys(trendMap)
      .sort()
      .map((date) => {
        const entry: Record<string, string | number> = { date };
        Object.entries(trendMap[date]).forEach(([key, value]) => {
          entry[key] = value.total ? Math.round((value.mentioned / value.total) * 100) : 0;
        });
        return entry;
      });

    return NextResponse.json({
      task,
      items: rows.map((row: any) => ({
        id: row.id,
        taskId: row.taskId,
        taskTitle: row.task?.title || "",
        keyword: row.keyword,
        platform: row.platform,
        mentionCount: row.mentionCount,
        mentioned: row.mentioned,
        isFirstScreen: row.isFirstScreen,
        sentiment: row.sentiment,
        cached: row.cached,
        queriedAt: row.queriedAt,
        responseText: row.responseText || "",
      })),
      platformTrend,
    });
  } catch (error) {
    console.error("[VISIBILITY_HISTORY_ERROR]", error);
    return NextResponse.json({ error: "获取 AI 可见性历史失败" }, { status: 500 });
  }
}
