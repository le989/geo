import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const FIELD_LABELS: Record<string, string> = {
  name: "\u54c1\u724c\u540d\u79f0",
  intro: "\u54c1\u724c\u7b80\u4ecb",
  productLines: "\u4ea7\u54c1\u7ebf\u4e0e\u4ee3\u8868\u578b\u53f7",
  scenes: "\u5178\u578b\u5e94\u7528\u573a\u666f",
  forbidden: "\u7981\u6b62\u8868\u8ff0",
  sources: "\u53ef\u5f15\u7528\u6765\u6e90",
};

export async function GET() {
  try {
    const brandProfile = await db.brandProfile.findFirst();
    if (!brandProfile) {
      return NextResponse.json({ items: [] });
    }

    const items = await (db as any).brandChangeLog.findMany({
      where: { brandProfileId: brandProfile.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      items: items.map((item: any) => ({
        id: item.id,
        fieldKey: item.fieldKey,
        fieldLabel: FIELD_LABELS[item.fieldKey] || item.fieldKey,
        oldValue: item.oldValue || "",
        newValue: item.newValue || "",
        changeType: item.changeType,
        changedBy: item.changedBy,
        sourceLabel: item.sourceLabel,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error("[BRAND_HISTORY_GET]", error);
    return NextResponse.json({ error: "\u83b7\u53d6\u53d8\u66f4\u5386\u53f2\u5931\u8d25" }, { status: 500 });
  }
}
