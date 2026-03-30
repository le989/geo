export const dynamic = "force-dynamic";

﻿import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

function isAdmin() {
  return cookies().get("gf_role")?.value === "admin";
}

function forbidden() {
  return NextResponse.json({ error: "仅管理员可操作关键词词库" }, { status: 403 });
}

export async function POST(req: Request) {
  if (!isAdmin()) return forbidden();

  try {
    const { keyword, scene, groupName, priority, sourceType, sourceLabel } = await req.json();
    if (!String(keyword || "").trim()) {
      return NextResponse.json({ error: "关键词不能为空" }, { status: 400 });
    }

    const item = await db.keywordAsset.create({
      data: {
        keyword: String(keyword).trim(),
        scene: String(scene || "通用").trim() || "通用",
        groupName: String(groupName || "默认分组").trim() || "默认分组",
        priority: String(priority || "MEDIUM").trim() || "MEDIUM",
        sourceType: String(sourceType || "manual").trim() || "manual",
        sourceLabel: String(sourceLabel || "").trim() || null,
        status: "READY",
        active: true,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("[KEYWORDS_POST_ERROR]", error);
    return NextResponse.json({ error: "新增关键词失败" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAdmin()) return forbidden();

  try {
    const { id, active, priority, status, scene, groupName } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "缺少关键词 ID" }, { status: 400 });
    }

    const item = await db.keywordAsset.update({
      where: { id: String(id) },
      data: {
        ...(typeof active === "boolean" ? { active } : {}),
        ...(priority ? { priority: String(priority) } : {}),
        ...(status ? { status: String(status) } : {}),
        ...(scene ? { scene: String(scene) } : {}),
        ...(groupName ? { groupName: String(groupName) } : {}),
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("[KEYWORDS_PATCH_ERROR]", error);
    return NextResponse.json({ error: "更新关键词失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdmin()) return forbidden();

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "缺少关键词 ID" }, { status: 400 });
    }

    await db.keywordAsset.delete({ where: { id: String(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[KEYWORDS_DELETE_ERROR]", error);
    return NextResponse.json({ error: "删除关键词失败" }, { status: 500 });
  }
}
