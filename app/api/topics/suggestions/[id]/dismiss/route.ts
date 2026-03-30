import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import topicSuggestions from "@/lib/topic-suggestions";

const { dismissTopicSuggestion } = topicSuggestions as {
  dismissTopicSuggestion: (id: string) => Promise<unknown>;
};

function getRole() {
  return cookies().get("gf_role")?.value || "";
}

function canManageSuggestions() {
  const role = getRole();
  return role === "admin" || role === "editor";
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!canManageSuggestions()) {
    return NextResponse.json({ error: "\u65e0\u6743\u9650\u64cd\u4f5c\u63a8\u8350\u9009\u9898" }, { status: 403 });
  }

  try {
    if (!params.id) {
      return NextResponse.json({ error: "\u7f3a\u5c11\u63a8\u8350\u9879 ID" }, { status: 400 });
    }

    const item = await dismissTopicSuggestion(params.id);
    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("[TOPIC_SUGGESTION_DISMISS_ERROR]", error);
    return NextResponse.json({ error: "\u5ffd\u7565\u63a8\u8350\u9009\u9898\u5931\u8d25" }, { status: 500 });
  }
}
