import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensurePresetModels } from "@/lib/models";

export async function GET() {
  await ensurePresetModels();
  const models = await db.modelConfig.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      provider: true,
      modelName: true,
      isDefault: true,
    },
  });
  return NextResponse.json({ models });
}

