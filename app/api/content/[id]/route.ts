import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import articleStore from "@/lib/article-store";
import contentReview from "@/lib/content-review";

const { buildContentDetail, mergeContentUpdatePayload, buildContentVersionPayload } = articleStore as {
  buildContentDetail: (item: Record<string, any>) => Record<string, any>;
  mergeContentUpdatePayload: (existing: Record<string, any>, incoming: Record<string, any>) => Record<string, any>;
  buildContentVersionPayload: (input: Record<string, any>) => Record<string, any>;
};
const { buildPublishChecks, buildBrandCheck } = contentReview as {
  buildPublishChecks: (options: { title: string; content: string; brandCheck: Record<string, any> }) => Record<string, any>;
  buildBrandCheck: (content: string, brandProfile: Record<string, unknown> | null | undefined) => Record<string, any>;
};

const contentInclude = { versions: { orderBy: { versionNumber: "desc" } }, sampleEntry: true };

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const item = await db.contentTask.findUnique({ where: { id: params.id }, include: contentInclude });
    if (!item) {
      return NextResponse.json({ error: "内容不存在" }, { status: 404 });
    }
    return NextResponse.json(buildContentDetail(item));
  } catch (error) {
    console.error("[CONTENT_GET_ERROR]", error);
    return NextResponse.json({ error: "获取内容详情失败" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const existing = await db.contentTask.findUnique({ where: { id: params.id }, include: contentInclude });
    if (!existing) {
      return NextResponse.json({ error: "内容不存在" }, { status: 404 });
    }

    if (typeof body.restoreVersionId === "string" && body.restoreVersionId) {
      const version = await db.contentVersion.findFirst({ where: { id: body.restoreVersionId, taskId: params.id } });
      if (!version) {
        return NextResponse.json({ error: "版本不存在" }, { status: 404 });
      }
      const restored = await db.contentTask.update({
        where: { id: params.id },
        data: {
          title: version.snapshotTitle,
          content: version.snapshotContent,
          lastEditedAt: new Date(),
        },
        include: contentInclude,
      });
      const nextVersionNumber = (restored.versions?.[0]?.versionNumber || 0) + 1;
      await db.contentVersion.create({
        data: buildContentVersionPayload({
          taskId: params.id,
          title: version.snapshotTitle,
          content: version.snapshotContent,
          source: "restore",
          actor: "AI助手",
          versionNumber: nextVersionNumber,
        }),
      });
      const latest = await db.contentTask.findUnique({ where: { id: params.id }, include: contentInclude });
      return NextResponse.json(buildContentDetail(latest));
    }

    const merged = mergeContentUpdatePayload(existing, {
      title: typeof body.title === "string" ? body.title : existing.title,
      content: typeof body.content === "string" ? body.content : existing.content,
      lastEditedAt: new Date(),
    });

    const brandProfile = await db.brandProfile.findFirst();
    const brandCheck = buildBrandCheck(merged.content || "", brandProfile);
    const publishCheck = buildPublishChecks({
      title: merged.title || "",
      content: merged.content || "",
      brandCheck,
    });

    const lastVersionNumber = existing.versions?.[0]?.versionNumber || 0;

    await db.contentTask.update({
      where: { id: params.id },
      data: {
        title: merged.title,
        content: merged.content,
        lastEditedAt: merged.lastEditedAt,
        publishCheck: { ...publishCheck, brandCheck },
      },
      include: contentInclude,
    });

    if (merged.title !== existing.title || merged.content !== existing.content) {
      await db.contentVersion.create({
        data: buildContentVersionPayload({
          taskId: params.id,
          title: merged.title,
          content: merged.content,
          source: "manual_save",
          actor: "AI助手",
          versionNumber: lastVersionNumber + 1,
        }),
      });
    }

    const latest = await db.contentTask.findUnique({ where: { id: params.id }, include: contentInclude });
    return NextResponse.json(buildContentDetail(latest));
  } catch (error) {
    console.error("[CONTENT_PATCH_ERROR]", error);
    return NextResponse.json({ error: "更新内容失败" }, { status: 500 });
  }
}
