import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/log";

function isAdmin() {
  const role = cookies().get("gf_role")?.value;
  return role === "admin";
}

// 获取所有用户
export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ users });
}

// 新增用户
export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    const { name, email, password, role } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码必填" }, { status: 400 });
    }
    const exists = await db.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "该邮箱已存在" }, { status: 400 });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: { name: name || null, email, password: hash, role: role || "viewer" },
    });
    await logActivity(cookies().get("gf_user")?.value || "admin", "USER_CREATE", `创建用户: ${email}`);
    return NextResponse.json({ success: true, user });
  } catch (e) {
    console.error("[USERS_POST]", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 修改角色
export async function PATCH(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    const { id, role } = await req.json();
    await db.user.update({ where: { id }, data: { role } });
    await logActivity(cookies().get("gf_user")?.value || "admin", "USER_ROLE_CHANGE", `修改 ${id} 角色为 ${role}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[USERS_PATCH]", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 删除用户
export async function DELETE(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    const { id } = await req.json();
    await db.user.delete({ where: { id } });
    await logActivity(cookies().get("gf_user")?.value || "admin", "USER_DELETE", `删除用户: ${id}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[USERS_DELETE]", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
