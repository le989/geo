import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import articleStore from "@/lib/article-store";
import topicSuggestions from "@/lib/topic-suggestions";

export const dynamic = "force-dynamic";

const { buildContentListItem } = articleStore as {
  buildContentListItem: (item: Record<string, any>) => Record<string, any>;
};

const { getTopicSuggestions } = topicSuggestions as {
  getTopicSuggestions: (filters?: {
    scene?: string;
    channel?: string;
    groupName?: string;
    limit?: number;
  }) => Promise<unknown[]>;
};

function getRole() {
  return cookies().get("gf_role")?.value || "";
}

function getUser() {
  const raw = cookies().get("gf_user")?.value || "";
  return raw ? decodeURIComponent(raw) : "";
}

function unauthorized() {
  return NextResponse.json({ error: "\u672a\u767b\u5f55\u6216\u65e0\u6743\u9650" }, { status: 401 });
}

function isPendingStatus(status: string) {
  return ["PENDING_GENERATE", "GENERATING", "PENDING_REVIEW", "NEEDS_REVISION"].includes(status);
}

async function loadEditorHome(userEmail: string) {
  const [suggestions, tasks, recentEdited] = await Promise.all([
    getTopicSuggestions({ limit: 5 }),
    db.contentTask.findMany({
      where: {
        status: { in: ["PENDING_GENERATE", "GENERATING", "PENDING_REVIEW", "NEEDS_REVISION"] },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 6,
      include: { sampleEntry: true },
    }),
    db.contentTask.findMany({
      where: {
        OR: [
          { owner: userEmail || undefined },
          { owner: "AI Assistant" },
        ],
      },
      orderBy: [{ lastEditedAt: "desc" }, { updatedAt: "desc" }],
      take: 6,
      include: { sampleEntry: true },
    }),
  ]);

  return {
    role: "editor",
    suggestions,
    pendingItems: tasks.map((item) => buildContentListItem(item)),
    recentEdited: recentEdited.map((item) => buildContentListItem(item)),
    quickActions: [
      { label: "\u5feb\u901f\u751f\u6210", href: "/workbench/factory" },
      { label: "\u6587\u7ae0\u5217\u8868", href: "/workbench/articles" },
      { label: "\u4efb\u52a1\u770b\u677f", href: "/workbench/tasks" },
    ],
  };
}

async function loadAdminHome() {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const [suggestions, tasks, contents, highRiskItems, monitorSummary] = await Promise.all([
    getTopicSuggestions({ limit: 5 }),
    db.contentTask.findMany({ orderBy: [{ createdAt: "desc" }], include: { sampleEntry: true } }),
    db.contentTask.findMany({ orderBy: [{ updatedAt: "desc" }], take: 6, include: { sampleEntry: true } }),
    db.contentTask.findMany({
      where: {
        OR: [
          { aiReview: { path: ["status"], equals: "high_risk" } },
          { publishCheck: { path: ["status"], equals: "fail" } },
        ],
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 6,
      include: { sampleEntry: true },
    }),
    db.monitorResult.count({ where: { runAt: { gte: weekStart } } }),
  ]);

  const overview = {
    totalTasks: tasks.length,
    pendingTasks: tasks.filter((task) => isPendingStatus(task.status)).length,
    highRiskTasks: highRiskItems.length,
    publishedThisWeek: tasks.filter((task) => task.status === "COMPLETED" && task.publishedAt && task.publishedAt >= weekStart).length,
    createdThisWeek: tasks.filter((task) => task.createdAt >= weekStart).length,
    monitorRunsThisWeek: monitorSummary,
  };

  return {
    role: "admin",
    suggestions,
    overview,
    highRiskItems: highRiskItems.map((item) => buildContentListItem(item)),
    latestContents: contents.map((item) => buildContentListItem(item)),
    quickActions: [
      { label: "\u4efb\u52a1\u770b\u677f", href: "/workbench/tasks" },
      { label: "\u6587\u7ae0\u5217\u8868", href: "/workbench/articles" },
      { label: "\u6a21\u578b\u7ba1\u7406", href: "/workbench/models" },
      { label: "\u54c1\u724c\u76d1\u6d4b", href: "/workbench/monitor" },
    ],
  };
}

async function loadViewerHome() {
  const items = await db.contentTask.findMany({
    where: { status: "COMPLETED" },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 12,
    include: { sampleEntry: true },
  });

  return {
    role: "viewer",
    publishedItems: items.map((item) => buildContentListItem(item)),
  };
}

export async function GET() {
  const role = getRole();
  const userEmail = getUser();

  if (!role) {
    return unauthorized();
  }

  try {
    if (role === "admin") {
      return NextResponse.json(await loadAdminHome());
    }

    if (role === "editor") {
      return NextResponse.json(await loadEditorHome(userEmail));
    }

    if (role === "viewer") {
      return NextResponse.json(await loadViewerHome());
    }

    return unauthorized();
  } catch (error) {
    console.error("[WORKBENCH_HOME_ERROR]", error);
    return NextResponse.json({ error: "\u83b7\u53d6\u5de5\u4f5c\u53f0\u9996\u9875\u6570\u636e\u5931\u8d25" }, { status: 500 });
  }
}
