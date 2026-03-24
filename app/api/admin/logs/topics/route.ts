import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

function isAdmin() {
  return cookies().get("gf_role")?.value === "admin";
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const { topic, scene, channel, priority } = await req.json();
    if (!topic) return NextResponse.json({ error: "选题内容不能为空" }, { status: 400 });
    const newTopic = await db.topicTemplate.create({
      data: { topic, scene, channel, priority, active: true },
    });
    return NextResponse.json({ success: true, topic: newTopic });
  } catch (e) {
    console.error("[TOPICS_POST]", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const { id, active } = await req.json();
    await db.topicTemplate.update({ where: { id }, data: { active } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[TOPICS_PATCH]", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const { id } = await req.json();
    await db.topicTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[TOPICS_DELETE]", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}