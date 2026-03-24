import { logActivity } from "@/lib/log";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

async function ensureDefaultAdmin() {
  const count = await db.user.count();
  if (count === 0) {
    const hash = await bcrypt.hash("GeoFactory2024", 10);
    await db.user.create({
      data: {
        email: "admin@geo-factory.com",
        password: hash,
        role: "admin",
        name: "默认管理员",
      },
    });
  }
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "邮箱与密码必填" }, { status: 400 });
    }

    // 如果没有任何用户，初始化默认管理员
    await ensureDefaultAdmin();

    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "账号不存在" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    await logActivity(user.email, "LOGIN", `角色: ${user.role}`);
    const res = NextResponse.json({ success: true, role: user.role, name: user.name || "" });
    cookies().set("gf_auth", "true", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
    cookies().set("gf_role", user.role, { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
    cookies().set("gf_user", user.email, { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
    return res;
  } catch (e) {
    console.error("[AUTH_LOGIN]", e);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
