import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import taskWorkflow from "@/lib/task-workflow";

const { getRecommendedTaskAction } = taskWorkflow as {
  getRecommendedTaskAction: (status: string, aiReview?: Record<string, any>, publishCheck?: Record<string, any>) => Record<string, any> | null;
};

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

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return new NextResponse("Task ID is required", { status: 400 });
    }

    const task = await db.contentTask.findUnique({
      where: { id },
      include: {
        taskEvents: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    return NextResponse.json(withQualityFields(task));
  } catch (error) {
    console.error("[TASK_GET_BY_ID_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
