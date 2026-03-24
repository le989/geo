import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  cookies().delete("gf_auth");
  cookies().delete("gf_role");
  cookies().delete("gf_user");
  return NextResponse.json({ success: true });
}