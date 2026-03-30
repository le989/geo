import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto";
import { logOperation } from "@/lib/log";
import { ensurePresetModels } from "@/lib/models";

function requireModelManager() {
  const role = cookies().get("gf_role")?.value;
  if (role !== "admin" && role !== "editor") {
    throw new Error("forbidden");
  }
}

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function GET() {
  try {
    requireModelManager();
    await ensurePresetModels();

    const since = monthStart();
    const aggAll = await db.modelUsage.groupBy({
      by: ["modelConfigId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _avg: { durationMs: true },
    });
    const aggSuccess = await db.modelUsage.groupBy({
      by: ["modelConfigId"],
      where: { createdAt: { gte: since }, success: true },
      _count: { _all: true },
    });

    const allMap = new Map<string, { count: number; avgMs: number | null }>();
    for (const item of aggAll) {
      allMap.set(item.modelConfigId, { count: item._count._all, avgMs: item._avg.durationMs ?? null });
    }

    const okMap = new Map<string, number>();
    for (const item of aggSuccess) {
      okMap.set(item.modelConfigId, item._count._all);
    }

    const modelsRaw = await db.modelConfig.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        provider: true,
        baseURL: true,
        modelName: true,
        isDefault: true,
        isActive: true,
        createdAt: true,
        apiKey: true,
        complianceScore: true,
        complianceStatus: true,
        complianceTestedAt: true,
      },
    });

    const models = modelsRaw.map((model) => {
      const stat = allMap.get(model.id);
      const okCount = okMap.get(model.id) ?? 0;
      const count = stat?.count ?? 0;
      const avgMs = stat?.avgMs ?? null;
      const successRate = count > 0 ? Math.round((okCount / count) * 100) : null;
      const fullKey = decryptApiKey(model.apiKey);
      const maskedKey = fullKey
        ? fullKey.length <= 7
          ? `****${fullKey.slice(-4)}`
          : `${fullKey.slice(0, 3)}****${fullKey.slice(-4)}`
        : "";

      return {
        id: model.id,
        name: model.name,
        provider: model.provider,
        baseURL: model.baseURL,
        modelName: model.modelName,
        isDefault: model.isDefault,
        isActive: model.isActive,
        createdAt: model.createdAt,
        status: model.isActive && Boolean(model.apiKey) ? "可用" : "不可用",
        maskedKey,
        complianceScore: model.complianceScore,
        complianceStatus: model.complianceStatus,
        complianceTestedAt: model.complianceTestedAt,
        stats: {
          callsThisMonth: count,
          avgDurationMs: avgMs ? Math.round(avgMs) : null,
          successRate,
        },
      };
    });

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ error: "无权限或服务器错误" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    requireModelManager();
    const body = await req.json();
    const { name, provider, baseURL, apiKey, modelName, isDefault } = body;
    if (!name || !provider || !baseURL || !modelName) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const encrypted = apiKey ? encryptApiKey(apiKey) : "";
    const created = await db.modelConfig.create({
      data: {
        name,
        provider,
        baseURL,
        apiKey: encrypted,
        modelName,
        isDefault: Boolean(isDefault),
        isActive: Boolean(encrypted),
      },
    });

    if (isDefault) {
      await db.modelConfig.updateMany({ where: { id: { not: created.id } }, data: { isDefault: false } });
    }

    const user = cookies().get("gf_user")?.value || "unknown";
    await logOperation(user, "MODEL_CREATE", `创建模型: ${name} (${provider}/${modelName})`);
    return NextResponse.json({ id: created.id });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    requireModelManager();
    const body = await req.json();
    const { id, name, provider, baseURL, apiKey, modelName, isDefault, isActive } = body;
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof name === "string") data.name = name;
    if (typeof provider === "string") data.provider = provider;
    if (typeof baseURL === "string") data.baseURL = baseURL;
    if (typeof modelName === "string") data.modelName = modelName;
    if (typeof isActive === "boolean") data.isActive = isActive;

    if (typeof apiKey === "string") {
      const encrypted = apiKey ? encryptApiKey(apiKey) : "";
      data.apiKey = encrypted;
      data.isActive = Boolean(encrypted);
      const user = cookies().get("gf_user")?.value || "unknown";
      await logOperation(user, "MODEL_UPDATE_KEY", `更新模型 Key: ${id}`);
    }

    if (isDefault === true) {
      await db.modelConfig.updateMany({ data: { isDefault: false } });
      data.isDefault = true;
      const user = cookies().get("gf_user")?.value || "unknown";
      await logOperation(user, "MODEL_SET_DEFAULT", `设为默认: ${id}`);
    } else if (isDefault === false) {
      data.isDefault = false;
    }

    await db.modelConfig.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    requireModelManager();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    await db.modelConfig.delete({ where: { id } });
    const user = cookies().get("gf_user")?.value || "unknown";
    await logOperation(user, "MODEL_DELETE", `删除模型: ${id}`);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
