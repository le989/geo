import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
import complianceLib from "@/lib/model-compliance";

const { getLatestComplianceReport } = complianceLib;

function requireModelManager() {
  const role = cookies().get("gf_role")?.value;
  if (role !== "admin" && role !== "editor") {
    throw new Error("forbidden");
  }
}

export async function GET(req: Request) {
  try {
    requireModelManager();
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get("modelId")?.trim() || "";

    if (!modelId) {
      return NextResponse.json({ error: "modelId 为必填项" }, { status: 400 });
    }

    const report = await getLatestComplianceReport(modelId);
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    console.error("[MODEL_COMPLIANCE_GET_ERROR]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "获取模型合规测试结果失败" }, { status: 500 });
  }
}
