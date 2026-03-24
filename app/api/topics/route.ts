import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const topics = await db.topicTemplate.findMany({
      where: { active: true },
      orderBy: { scene: 'asc' },
    });
    return NextResponse.json(topics);
  } catch (error) {
    console.error("[TOPICS_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
