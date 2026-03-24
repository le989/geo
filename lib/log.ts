import { db } from "@/lib/db";

export async function logActivity(
  userEmail: string,
  action: string,
  detail?: string,
  ip?: string
) {
  try {
    await db.activityLog.create({
      data: { userEmail, action, detail, ip },
    });
  } catch (e) {
    console.error("[LOG_ACTIVITY]", e);
  }
}