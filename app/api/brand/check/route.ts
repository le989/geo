import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import brandGuard from "@/lib/brand-guard";

const { analyzeBrandUsage } = brandGuard as {
  analyzeBrandUsage: (content: string, profile: Record<string, unknown> | null | undefined) => {
    references: Array<{ type: string; label: string; excerpt: string }>;
    risks: Array<{ term: string; reason: string }>;
    referenceCount: number;
    riskCount: number;
    suggestedSources: string[];
  };
};

export async function POST(req: Request) {
  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: "缺少正文内容" }, { status: 400 });
    }

    const brandProfile = await db.brandProfile.findFirst();
    const result = analyzeBrandUsage(content, brandProfile);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[BRAND_CHECK_ERROR]", error);
    return NextResponse.json({ error: "品牌检查失败" }, { status: 500 });
  }
}
