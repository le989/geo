import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import brandProfileUtils from "@/lib/brand-profile";

const { DEFAULT_BRAND_NAME, normalizeBrandProfilePayload } = brandProfileUtils as {
  DEFAULT_BRAND_NAME: string;
  normalizeBrandProfilePayload: (values: Record<string, unknown>) => {
    name: string;
    intro: string;
    productLines: string;
    scenes: string;
    forbidden: string;
    sources: string;
  };
};

const FIELD_KEYS = ["name", "intro", "productLines", "scenes", "forbidden", "sources"] as const;
type BrandFieldKey = (typeof FIELD_KEYS)[number];

function getCurrentUser() {
  return cookies().get("gf_user")?.value || "unknown";
}

async function ensureBrandProfile() {
  let brandProfile = await db.brandProfile.findFirst();
  if (!brandProfile) {
    brandProfile = await db.brandProfile.create({
      data: {
        name: DEFAULT_BRAND_NAME,
        intro: "",
        productLines: "",
        scenes: "",
        forbidden: "",
        sources: "",
      },
    });
  }
  return brandProfile;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const preview = normalizeBrandProfilePayload(body.preview || {});
    const sourceLabel = typeof body.sourceLabel === "string" && body.sourceLabel.trim() ? body.sourceLabel.trim() : "官网更新确认";
    const requestedFields = Array.isArray(body.fields) ? body.fields.filter((item: unknown): item is BrandFieldKey => typeof item === "string" && FIELD_KEYS.includes(item as BrandFieldKey)) : [];

    if (requestedFields.length === 0) {
      return NextResponse.json({ error: "请至少选择一个要应用的字段" }, { status: 400 });
    }

    const brandProfile = await ensureBrandProfile();
    const user = getCurrentUser();
    const changedAt = new Date();
    const patch: Partial<Record<BrandFieldKey, string>> = {};
    const changeLogs: Array<{
      brandProfileId: string;
      fieldKey: BrandFieldKey;
      oldValue: string;
      newValue: string;
      changeType: string;
      changedBy: string;
      sourceLabel: string;
      createdAt: Date;
    }> = [];

    for (const fieldKey of requestedFields) {
      const oldValue = (brandProfile[fieldKey] ?? "") as string;
      const newValue = preview[fieldKey] ?? "";
      if (oldValue === newValue) continue;
      patch[fieldKey] = newValue;
      changeLogs.push({
        brandProfileId: brandProfile.id,
        fieldKey,
        oldValue,
        newValue,
        changeType: "crawl_confirmed",
        changedBy: user,
        sourceLabel,
        createdAt: changedAt,
      });
    }

    if (Object.keys(patch).length === 0) {
      const latest = await db.brandProfile.findUniqueOrThrow({ where: { id: brandProfile.id } });
      return NextResponse.json({
        profile: normalizeBrandProfilePayload(latest),
        appliedFields: [],
      });
    }

    await db.brandProfile.update({
      where: { id: brandProfile.id },
      data: patch,
    });

    await Promise.all(
      Object.keys(patch).map((fieldKey) =>
        (db as any).brandFieldMeta.upsert({
          where: {
            brandProfileId_fieldKey: {
              brandProfileId: brandProfile.id,
              fieldKey,
            },
          },
          update: {
            updatedAt: changedAt,
            updatedBy: user,
            sourceType: "crawl",
            sourceLabel,
          },
          create: {
            brandProfileId: brandProfile.id,
            fieldKey,
            updatedAt: changedAt,
            updatedBy: user,
            sourceType: "crawl",
            sourceLabel,
          },
        }),
      ),
    );

    if (changeLogs.length > 0) {
      await (db as any).brandChangeLog.createMany({ data: changeLogs });
    }

    const refreshed = await db.brandProfile.findUniqueOrThrow({
      where: { id: brandProfile.id },
      include: { fieldMeta: true },
    });

    const fieldMeta = Object.fromEntries(
      refreshed.fieldMeta.map((item) => [
        item.fieldKey,
        {
          updatedAt: item.updatedAt.toISOString(),
          updatedBy: item.updatedBy,
          sourceType: item.sourceType,
          sourceLabel: item.sourceLabel,
        },
      ]),
    );

    return NextResponse.json({
      profile: normalizeBrandProfilePayload(refreshed),
      fieldMeta,
      appliedFields: Object.keys(patch),
    });
  } catch (error) {
    console.error("[BRAND_CRAWL_APPLY_ERROR]", error);
    return NextResponse.json({ error: "应用官网变更失败" }, { status: 500 });
  }
}
