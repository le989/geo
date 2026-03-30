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

export async function logOperation(
  userEmail: string,
  action: string,
  detail?: string
) {
  try {
    await db.operationLog.create({
      data: { userEmail, action, detail },
    });
  } catch (e) {
    console.error("[LOG_OPERATION]", e);
  }
}


export async function logTaskEvent(
  taskId: string,
  actor: string,
  action: string,
  note?: string
) {
  try {
    await db.taskEvent.create({
      data: { taskId, actor, action, note },
    });
  } catch (e) {
    console.error("[LOG_TASK_EVENT]", e);
  }
}
