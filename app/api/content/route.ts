import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import articleStore from "@/lib/article-store";

const { buildContentListItem } = articleStore as {
  buildContentListItem: (item: Record<string, any>) => Record<string, any>;
};

export async function GET() {
  try {
    const items = await db.contentTask.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { sampleEntry: true },
    });
    return NextResponse.json(items.map((item) => buildContentListItem(item)));
  } catch (error) {
    console.error("[CONTENT_LIST_ERROR]", error);
    return NextResponse.json({ error: "获取内容列表失败" }, { status: 500 });
  }
}
