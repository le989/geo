import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { logOperation } from "@/lib/log";
import complianceLib from "@/lib/model-compliance";

const { runModelComplianceBenchmark } = complianceLib;

function requireModelManager() {
  const role = cookies().get("gf_role")?.value;
  if (role !== "admin" && role !== "editor") {
    throw new Error("forbidden");
  }
}

export async function POST(req: Request) {
  try {
    requireModelManager();
    const body = await req.json();
    const modelId = typeof body.modelId === "string" ? body.modelId.trim() : "";

    if (!modelId) {
      return NextResponse.json({ error: "modelId 为必填项" }, { status: 400 });
    }

    const summary = await runModelComplianceBenchmark(modelId);

    const benchmarkRows = summary.results.map((item) => ({
      modelId,
      promptKey: item.promptKey,
      promptText: item.promptText,
      responseText: item.responseText,
      forbiddenHit: item.forbiddenHit,
      brandAccurate: item.brandAccurate,
      score: item.score,
      runBatchId: summary.batchId,
    }));

    await (db as any).modelComplianceBenchmark.createMany({
      data: benchmarkRows,
    });

    await (db as any).modelConfig.update({
      where: { id: modelId },
      data: {
        complianceScore: summary.overallScore,
        complianceStatus: summary.status,
        complianceTestedAt: new Date(),
      },
    });

    const user = cookies().get("gf_user")?.value || "unknown";
    await logOperation(user, "MODEL_COMPLIANCE_RUN", `运行模型合规测试: ${summary.model.name} (${summary.model.provider}/${summary.model.modelName})`);

    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    console.error("[MODEL_COMPLIANCE_RUN_ERROR]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "运行模型合规测试失败" }, { status: 500 });
  }
}
