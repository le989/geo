import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/log";

export async function POST() {
  const userEmail = cookies().get("gf_user")?.value || "unknown";
  await logActivity(decodeURIComponent(userEmail), "LOGOUT");
  cookies().delete("gf_auth");
  cookies().delete("gf_role");
  cookies().delete("gf_user");
  return NextResponse.json({ success: true });
}