import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logOperation, logTaskEvent } from "@/lib/log";
import taskWorkflow from "@/lib/task-workflow";
import contentReview from "@/lib/content-review";

const { ALL_FILTER, isStatusTransitionAllowed, getRecommendedTaskAction, getTaskActionGuard } = taskWorkflow as {
  ALL_FILTER: string;
  isStatusTransitionAllowed: (currentStatus: string, nextStatus: string) => boolean;
  getRecommendedTaskAction: (status: string, aiReview?: Record<string, any>, publishCheck?: Record<string, any>) => Record<string, any> | null;
  getTaskActionGuard: (currentStatus: string, nextStatus: string, publishCheck?: Record<string, any>) => Record<string, any> | null;
};
const { buildPublishChecks, buildBrandCheck } = contentReview as {
  buildPublishChecks: (options: { title: string; content: string; brandCheck: Record<string, any> }) => Record<string, any>;
  buildBrandCheck: (content: string, brandProfile: Record<string, unknown> | null | undefined) => Record<string, any>;
};

function getActor() {
  const user = cookies().get("gf_user")?.value;
  return user ? decodeURIComponent(user) : "AI助手";
}

function withQualityFields(task: Record<string, any>) {
  const aiReview = task.aiReview || {};
  const publishCheck = task.publishCheck || {};
  return {
    ...task,
    aiReview,
    publishCheck,
    sourceType: task.sourceType || "manual",
    sourceLabel: task.sourceLabel || "",
    recommendation: getRecommendedTaskAction(task.status, aiReview, publishCheck),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get("channel");
    const status = searchParams.get("status");

    const tasks = await db.contentTask.findMany({
      where: {
        ...(channel && channel !== ALL_FILTER ? { channel } : {}),
        ...(status && status !== ALL_FILTER ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks.map((task) => withQualityFields(task)));
  } catch (error) {
    console.error("[TASKS_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, reviewNote, ...updates } = body;

    if (!id) {
      return new NextResponse("Task ID is required", { status: 400 });
    }

    const actor = getActor();
    const existing = await db.contentTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    const nextStatus = typeof updates.status === "string" ? updates.status : undefined;
    if (nextStatus && !isStatusTransitionAllowed(existing.status, nextStatus)) {
      return NextResponse.json({ error: `不允许从 ${existing.status} 流转到 ${nextStatus}` }, { status: 400 });
    }

    const normalizedReviewNote = typeof reviewNote === "undefined" ? undefined : String(reviewNote || "").trim();
    if (nextStatus === "NEEDS_REVISION" && !normalizedReviewNote) {
      return NextResponse.json({ error: "驳回返工时必须填写审核备注" }, { status: 400 });
    }

    const actionGuard = nextStatus ? getTaskActionGuard(existing.status, nextStatus, existing.publishCheck || {}) : null;
    if (actionGuard?.blocked) {
      return NextResponse.json({ error: actionGuard.message }, { status: 400 });
    }

    const data: Record<string, unknown> = { ...updates };
    if (typeof normalizedReviewNote !== "undefined") {
      data.reviewNote = normalizedReviewNote || null;
    }

    const nextTitle = typeof updates.title === "string" ? updates.title : existing.title;
    const nextContent = typeof updates.content === "string" ? updates.content : existing.content || "";
    if (typeof updates.title !== "undefined" || typeof updates.content !== "undefined") {
      const brandProfile = await db.brandProfile.findFirst();
      const brandCheck = buildBrandCheck(nextContent, brandProfile);
      const publishCheck = buildPublishChecks({
        title: nextTitle,
        content: nextContent,
        brandCheck,
      });
      data.publishCheck = { ...publishCheck, brandCheck };
      data.lastEditedAt = new Date();
    }

    if (nextStatus === "COMPLETED") {
      data.reviewedAt = new Date();
      data.reviewedBy = actor;
      data.publishedAt = existing.publishedAt ?? new Date();
    } else if (nextStatus === "NEEDS_REVISION") {
      data.reviewedAt = new Date();
      data.reviewedBy = actor;
      data.publishedAt = null;
    } else if (nextStatus === "PENDING_REVIEW") {
      data.publishedAt = null;
    }

    const task = await db.contentTask.update({ where: { id }, data });

    const changes: string[] = [];
    if (typeof updates.owner !== "undefined" && updates.owner !== existing.owner) {
      changes.push(`负责人：${existing.owner} -> ${updates.owner}`);
    }
    if (typeof nextStatus !== "undefined" && nextStatus !== existing.status) {
      changes.push(`状态：${existing.status} -> ${nextStatus}`);
    }
    if (typeof normalizedReviewNote !== "undefined") {
      changes.push(`审核备注：${normalizedReviewNote || "已清空"}`);
    }
    if (typeof updates.content !== "undefined" || typeof updates.title !== "undefined") {
      changes.push("内容已更新");
    }

    const detail = changes.join("；") || "任务已更新";
    const eventAction = nextStatus === "NEEDS_REVISION"
      ? "TASK_REJECTED"
      : nextStatus === "COMPLETED"
        ? "TASK_APPROVED"
        : "TASK_UPDATED";

    await logTaskEvent(id, actor, eventAction, detail);
    await logOperation(actor, "TASK_UPDATE", `任务 ${id}：${detail}`);

    return NextResponse.json(withQualityFields(task));
  } catch (error) {
    console.error("[TASKS_PATCH_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    let id: string | null = null;
    try {
      const body = await req.json();
      id = body?.id ?? null;
    } catch {
      const { searchParams } = new URL(req.url);
      id = searchParams.get("id");
    }

    if (!id) {
      return new NextResponse("Task ID is required", { status: 400 });
    }

    const actor = getActor();
    await db.contentTask.delete({ where: { id } });
    await logOperation(actor, "TASK_DELETE", `删除任务：${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TASKS_DELETE_ERROR]", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
