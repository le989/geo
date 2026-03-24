import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export async function GET() {
  const role = cookies().get("gf_role")?.value;
  if (role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const logs = await db.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ logs });
}