import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import * as visibilityQuery from "@/lib/visibility-query";

const { VISIBILITY_PLATFORMS, runVisibilityQuery } = visibilityQuery;

type VisibilityPlatformKey = (typeof VISIBILITY_PLATFORMS)[number]["key"];

function getRole() {
  return cookies().get("gf_role")?.value || "";
}

function isWriteAllowed(role: string) {
  return role === "admin" || role === "editor";
}

export async function POST(req: Request) {
  const role = getRole();
  if (!isWriteAllowed(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
    const platforms: VisibilityPlatformKey[] = Array.isArray(body.platforms)
      ? body.platforms.filter((item: unknown): item is VisibilityPlatformKey => typeof item === "string")
      : [];

    if (!taskId || !keyword || platforms.length === 0) {
      return NextResponse.json({ error: "taskId、keyword 和 platforms 为必填项" }, { status: 400 });
    }

    const task = await db.contentTask.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, title: true, channel: true, scene: true },
    });

    if (!task) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    const supportedPlatforms = new Set<VisibilityPlatformKey>(VISIBILITY_PLATFORMS.map((item) => item.key));
    const uniquePlatforms: VisibilityPlatformKey[] = Array.from(new Set<VisibilityPlatformKey>(platforms)).filter((item) => supportedPlatforms.has(item));
    if (uniquePlatforms.length === 0) {
      return NextResponse.json({ error: "未选择有效平台" }, { status: 400 });
    }

    const items = await Promise.all(
      uniquePlatforms.map(async (platform) => {
        const result = await runVisibilityQuery({ taskId, keyword, platform });

        if (!result.cached) {
          await (db as any).visibilityQueryResult.create({
            data: {
              taskId,
              keyword,
              platform,
              prompt: result.prompt,
              responseText: result.responseText,
              mentioned: result.mentioned,
              mentionCount: result.mentionCount,
              isFirstScreen: result.isFirstScreen,
              sentiment: result.sentiment,
              cached: false,
              queriedAt: new Date(),
            },
          });
        }

        return {
          platform: result.platform,
          mentionCount: result.mentionCount,
          mentioned: result.mentioned,
          isFirstScreen: result.isFirstScreen,
          sentiment: result.sentiment,
          cached: result.cached,
          responseText: result.responseText,
        };
      })
    );

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        channel: task.channel,
        scene: task.scene,
      },
      keyword,
      items,
    });
  } catch (error) {
    console.error("[VISIBILITY_QUERY_ERROR]", error);
    return NextResponse.json({ error: "AI 可见性查询失败" }, { status: 500 });
  }
}
