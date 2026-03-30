import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import topicSuggestions from "@/lib/topic-suggestions";

const { getTopicSuggestions } = topicSuggestions as {
  getTopicSuggestions: (filters?: {
    scene?: string;
    channel?: string;
    groupName?: string;
    limit?: number;
  }) => Promise<unknown[]>;
};

function getRole() {
  return cookies().get("gf_role")?.value || "";
}

function canReadSuggestions() {
  const role = getRole();
  return role === "admin" || role === "editor";
}

export async function GET(req: Request) {
  if (!canReadSuggestions()) {
    return NextResponse.json({ error: "\u65e0\u6743\u9650\u8bbf\u95ee\u63a8\u8350\u9009\u9898" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const scene = (url.searchParams.get("scene") || "").trim();
    const channel = (url.searchParams.get("channel") || "").trim();
    const groupName = (url.searchParams.get("groupName") || "").trim();
    const limit = Number(url.searchParams.get("limit") || 5);

    const items = await getTopicSuggestions({
      scene: scene || undefined,
      channel: channel || undefined,
      groupName: groupName || undefined,
      limit: Number.isFinite(limit) ? limit : 5,
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[TOPIC_SUGGESTIONS_GET_ERROR]", error);
    return NextResponse.json({ error: "\u83b7\u53d6\u63a8\u8350\u9009\u9898\u5931\u8d25" }, { status: 500 });
  }
}
