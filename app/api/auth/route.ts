import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const correctPassword = process.env.WORKBENCH_PASSWORD;

    if (!correctPassword) {
      console.error("WORKBENCH_PASSWORD not configured in environment variables");
      return NextResponse.json({ error: "服务器配置错误" }, { status: 500 });
    }

    if (password === correctPassword) {
      // 验证成功，设置 cookie
      // 在实际生产中，这里应该使用更安全的加密 token，这里简化处理
      const response = NextResponse.json({ success: true });
      
      cookies().set("workbench_auth", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 天有效
        path: "/",
      });

      return response;
    } else {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }
  } catch (error) {
    console.error("[AUTH_POST_ERROR]", error);
    return NextResponse.json({ error: "内部错误" }, { status: 500 });
  }
}
