import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

function canManageSamples() {
  const role = cookies().get("gf_role")?.value;
  return role === "admin" || role === "editor";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get("channel");
    const scene = searchParams.get("scene");
    const exemplar = searchParams.get("exemplar");
    const items = await db.contentSample.findMany({
      where: {
        active: true,
        ...(channel ? { channel } : {}),
        ...(scene && scene !== "????" ? { scene } : {}),
        ...(exemplar === "true" ? { exemplar: true } : {}),
      },
      orderBy: [{ exemplar: "desc" }, { updatedAt: "desc" }],
      include: { task: true },
      take: 50,
    });

    return NextResponse.json(
      items.map((item) => ({
        id: item.id,
        taskId: item.taskId,
        title: item.title,
        channel: item.channel,
        scene: item.scene,
        reason: item.reason || "",
        createdBy: item.createdBy,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        active: item.active,
        exemplar: item.exemplar,
        excerpt: String(item.task?.content || "").replace(/s+/g, " ").trim().slice(0, 140),
      }))
    );
  } catch (error) {
    console.error("[SAMPLES_LIST_ERROR]", error);
    return NextResponse.json({ error: "???????" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!canManageSamples()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const taskId = typeof body.taskId === "string" ? body.taskId : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const exemplar = typeof body.exemplar === "boolean" ? body.exemplar : false;
    if (!taskId) {
      return NextResponse.json({ error: "???? ID" }, { status: 400 });
    }

    const task = await db.contentTask.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: "?????" }, { status: 404 });
    }

    const createdBy = cookies().get("gf_user")?.value || "AI??";
    const sample = await db.contentSample.upsert({
      where: { taskId },
      update: {
        title: task.title,
        channel: task.channel,
        scene: task.scene,
        reason: reason || undefined,
        active: true,
        exemplar,
      },
      create: {
        taskId,
        title: task.title,
        channel: task.channel,
        scene: task.scene,
        reason: reason || undefined,
        createdBy,
        active: true,
        exemplar,
      },
    });

    return NextResponse.json({ success: true, sample });
  } catch (error) {
    console.error("[SAMPLES_CREATE_ERROR]", error);
    return NextResponse.json({ error: "???????" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!canManageSamples()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const taskId = typeof body.taskId === "string" ? body.taskId : "";
    if (!taskId) {
      return NextResponse.json({ error: "???? ID" }, { status: 400 });
    }

    const updates = {};
    if (typeof body.active === "boolean") {
      updates.active = body.active;
    }
    if (typeof body.exemplar === "boolean") {
      updates.exemplar = body.exemplar;
    }
    if (typeof body.reason === "string") {
      updates.reason = body.reason.trim() || null;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "????????" }, { status: 400 });
    }

    const sample = await db.contentSample.update({
      where: { taskId },
      data: updates,
    });

    return NextResponse.json({ success: true, sample });
  } catch (error) {
    console.error("[SAMPLES_PATCH_ERROR]", error);
    return NextResponse.json({ error: "???????" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!canManageSamples()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json({ error: "???? ID" }, { status: 400 });
    }

    await db.contentSample.update({
      where: { taskId },
      data: { active: false, exemplar: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SAMPLES_DELETE_ERROR]", error);
    return NextResponse.json({ error: "???????" }, { status: 500 });
  }
}
