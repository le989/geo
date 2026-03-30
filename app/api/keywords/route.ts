export const dynamic = "force-dynamic";

﻿import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

function isAdmin() {
  return cookies().get("gf_role")?.value === "admin";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const search = (url.searchParams.get("search") || "").trim();
    const includeAll = url.searchParams.get("all") === "1" && isAdmin();

    const items = await db.keywordAsset.findMany({
      where: {
        ...(includeAll ? {} : { active: true }),
        ...(search
          ? {
              OR: [
                { keyword: { contains: search, mode: "insensitive" } },
                { scene: { contains: search, mode: "insensitive" } },
                { groupName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("[KEYWORDS_GET_ERROR]", error);
    return NextResponse.json({ error: "获取关键词失败" }, { status: 500 });
  }
}
