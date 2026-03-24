import { db } from "@/lib/db";
import { NextResponse } from "next/server";

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
      where: { id: id },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASK_GET_BY_ID_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
