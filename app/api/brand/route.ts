import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import brandProfileUtils from "@/lib/brand-profile";

export const dynamic = "force-dynamic";

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

const BRAND_FIELDS = [
  { key: "name", label: "\u54c1\u724c\u540d\u79f0" },
  { key: "intro", label: "\u54c1\u724c\u7b80\u4ecb" },
  { key: "productLines", label: "\u4ea7\u54c1\u7ebf\u4e0e\u4ee3\u8868\u578b\u53f7" },
  { key: "scenes", label: "\u5178\u578b\u5e94\u7528\u573a\u666f" },
  { key: "forbidden", label: "\u7981\u6b62\u8868\u8ff0" },
  { key: "sources", label: "\u53ef\u5f15\u7528\u6765\u6e90" },
] as const;

type BrandFieldKey = (typeof BRAND_FIELDS)[number]["key"];

type BrandMetaRow = {
  fieldKey: string;
  updatedAt: Date;
  updatedBy: string | null;
  sourceType: string;
  sourceLabel: string | null;
};

function getCurrentUser() {
  return cookies().get("gf_user")?.value || "unknown";
}

async function ensureBrandProfile() {
  let brandProfile = await db.brandProfile.findFirst({
    include: {
      fieldMeta: true,
    },
  });

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
      include: {
        fieldMeta: true,
      },
    });
  }

  const existingMetaKeys = new Set(brandProfile.fieldMeta.map((item) => item.fieldKey));
  const missingMeta = BRAND_FIELDS.filter((field) => !existingMetaKeys.has(field.key)).map((field) => ({
    brandProfileId: brandProfile!.id,
    fieldKey: field.key,
    updatedAt: brandProfile!.updatedAt,
    updatedBy: "system",
    sourceType: "system",
    sourceLabel: "\u521d\u59cb\u5316\u54c1\u724c\u8d44\u6599",
  }));

  if (missingMeta.length > 0) {
    await (db as any).brandFieldMeta.createMany({ data: missingMeta });
    brandProfile = await db.brandProfile.findUniqueOrThrow({
      where: { id: brandProfile.id },
      include: { fieldMeta: true },
    });
  }

  return brandProfile;
}

function buildFieldMetaMap(fieldMeta: BrandMetaRow[]) {
  const metaMap: Record<string, { updatedAt: string; updatedBy: string | null; sourceType: string; sourceLabel: string | null }> = {};
  for (const item of fieldMeta) {
    metaMap[item.fieldKey] = {
      updatedAt: item.updatedAt.toISOString(),
      updatedBy: item.updatedBy,
      sourceType: item.sourceType,
      sourceLabel: item.sourceLabel,
    };
  }
  return metaMap;
}

export async function GET() {
  try {
    const brandProfile = await ensureBrandProfile();
    const profile = normalizeBrandProfilePayload(brandProfile);

    return NextResponse.json({
      ...profile,
      fieldMeta: buildFieldMetaMap(brandProfile.fieldMeta),
    });
  } catch (error) {
    console.error("[BRAND_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const values = normalizeBrandProfilePayload(await req.json());
    const brandProfile = await ensureBrandProfile();
    const user = getCurrentUser();
    const changedFields = BRAND_FIELDS.filter((field) => {
      const key = field.key as BrandFieldKey;
      return (brandProfile[key] ?? "") !== values[key];
    });

    const updatedProfile = await db.brandProfile.update({
      where: { id: brandProfile.id },
      data: values,
      include: {
        fieldMeta: true,
      },
    });

    if (changedFields.length > 0) {
      const changedAt = new Date();
      const manualSourceLabel = "\u624b\u52a8\u4fdd\u5b58";

      await Promise.all(
        changedFields.map((field) =>
          (db as any).brandFieldMeta.upsert({
            where: {
              brandProfileId_fieldKey: {
                brandProfileId: brandProfile.id,
                fieldKey: field.key,
              },
            },
            update: {
              updatedAt: changedAt,
              updatedBy: user,
              sourceType: "manual",
              sourceLabel: manualSourceLabel,
            },
            create: {
              brandProfileId: brandProfile.id,
              fieldKey: field.key,
              updatedAt: changedAt,
              updatedBy: user,
              sourceType: "manual",
              sourceLabel: manualSourceLabel,
            },
          }),
        ),
      );

      for (const field of changedFields) {
        await (db as any).brandChangeLog.create({
          data: {
            brandProfileId: brandProfile.id,
            fieldKey: field.key,
            oldValue: (brandProfile[field.key as BrandFieldKey] ?? "") as string,
            newValue: values[field.key as BrandFieldKey] ?? "",
            changeType: "manual_update",
            changedBy: user,
            sourceLabel: manualSourceLabel,
            createdAt: changedAt,
          },
        });
      }
    }

    const refreshed = await db.brandProfile.findUniqueOrThrow({
      where: { id: updatedProfile.id },
      include: {
        fieldMeta: true,
      },
    });

    return NextResponse.json({
      ...normalizeBrandProfilePayload(refreshed),
      fieldMeta: buildFieldMetaMap(refreshed.fieldMeta),
    });
  } catch (error) {
    console.error("[BRAND_PUT]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Error" }, { status: 500 });
  }
}
