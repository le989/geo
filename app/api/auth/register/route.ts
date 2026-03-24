import { logActivity } from "@/lib/log";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "所有字段必填" }, { status: 400 });
    }
    const exists = await db.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 400 });
    }
    const hash = await bcrypt.hash(password, 10);
    await db.user.create({
      data: { name, email, password: hash, role: "viewer" },
    });
    await logActivity(email, "REGISTER", `姓名: ${name}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[AUTH_REGISTER]", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}