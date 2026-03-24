import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// 获取所有任务（带筛选）
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get("channel");
    const status = searchParams.get("status");

    const tasks = await db.contentTask.findMany({
      where: {
        ...(channel && channel !== "全部" ? { channel } : {}),
        ...(status && status !== "全部" ? { status } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[TASKS_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// 更新任务内容或状态
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return new NextResponse("Task ID is required", { status: 400 });
    }

    const task = await db.contentTask.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASKS_PATCH_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// 删除任务
export async function DELETE(req: Request) {
  try {
    let id: string | null = null;
    try {
      const body = await req.json();
      id = body?.id ?? null;
    } catch {
      // 兼容旧用法：从 query 获取
      const { searchParams } = new URL(req.url);
      id = searchParams.get("id");
    }

    if (!id) {
      return new NextResponse("Task ID is required", { status: 400 });
    }

    await db.contentTask.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TASKS_DELETE_ERROR]", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
