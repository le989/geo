import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "邮箱与密码必填" }, { status: 400 });
    }

    let user = await db.user.findUnique({ where: { email } });
    
    // 如果没有任何用户，创建默认管理员
    if (!user) {
      const hash = await bcrypt.hash(password, 10);
      user = await db.user.create({
        data: {
          email: "admin@geo-factory.com",
          password: hash,
          role: "admin",
          name: "默认管理员",
        },
      });
      // 新创建的用户直接登录成功
      const res = NextResponse.json({ success: true, role: user.role, name: user.name || "" });
      cookies().set("gf_auth", "true", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
      cookies().set("gf_role", user.role, { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
      cookies().set("gf_user", user.email, { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
      return res;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

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