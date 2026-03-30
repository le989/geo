import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import brandAnnotations from "@/lib/brand-annotations";

const { analyzeBrandAnnotations } = brandAnnotations as {
  analyzeBrandAnnotations: (content: string, brandProfile: Record<string, unknown> | null | undefined) => {
    annotations: Array<{
      id: string;
      type: string;
      level: string;
      start: number;
      end: number;
      text: string;
      message: string;
    }>;
    metrics: {
      brandMentionCount: number;
      sceneCovered: number;
      sceneTotal: number;
      forbiddenCount: number;
      sourceCount: number;
    };
  };
};

function requireReadableRole() {
  const auth = cookies().get("gf_auth")?.value === "true";
  const role = cookies().get("gf_role")?.value;
  if (!auth || !role) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  if (!["admin", "editor", "viewer"].includes(role)) {
    return { ok: false as const, status: 403, error: "forbidden" };
  }
  return { ok: true as const, role };
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = requireReadableRole();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const articleId = params?.id;
    const content = typeof body?.content === "string" ? body.content : "";

    if (!articleId) {
      return NextResponse.json({ error: "missing_article_id" }, { status: 400 });
    }

    const article = await db.contentTask.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        status: true,
        content: true,
      },
    });

    if (!article) {
      return NextResponse.json({ error: "article_not_found" }, { status: 404 });
    }

    if (auth.role === "viewer" && article.status !== "COMPLETED") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const brandProfile = await db.brandProfile.findFirst();
    const result = analyzeBrandAnnotations(content || article.content || "", brandProfile);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[BRAND_ANNOTATIONS_ERROR]", error);
    return NextResponse.json({ error: "brand_annotations_failed" }, { status: 500 });
  }
}
