import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { decryptApiKey } from "@/lib/crypto";

export async function GET(req: Request) {
  const role = cookies().get("gf_role")?.value;
  if (role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "\u7f3a\u5c11 id" }, { status: 400 });
  }

  const model = await db.modelConfig.findUnique({ where: { id }, select: { apiKey: true } });
  if (!model) {
    return NextResponse.json({ error: "\u6a21\u578b\u4e0d\u5b58\u5728" }, { status: 404 });
  }

  const key = decryptApiKey(model.apiKey);
  return NextResponse.json({ apiKey: key || "" });
}
