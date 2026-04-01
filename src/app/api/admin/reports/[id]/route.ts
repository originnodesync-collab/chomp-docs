import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return null;

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, role")
    .eq("auth_id", user.id)
    .single();

  if (!dbUser || dbUser.role !== "admin") return null;
  return { supabase, dbUser };
}

// PATCH: 신고 상태 변경 (hidden | dismissed)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const { supabase } = admin;
  const { status, target_type, target_id } = await request.json();

  if (!["hidden", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "잘못된 상태값입니다" }, { status: 400 });
  }

  // 신고 상태 업데이트
  const { error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "업데이트에 실패했습니다" }, { status: 500 });
  }

  // hidden 처리: 실제 콘텐츠도 숨김
  if (status === "hidden" && target_type && target_id) {
    const tableMap: Record<string, string> = {
      recipe: "recipes",
      comment: "comments",
      photo: "recipe_cook_photos",
      post: "posts",
      post_comment: "post_comments",
    };
    const table = tableMap[target_type];

    if (table) {
      const hiddenField = ["comments", "post_comments"].includes(table)
        ? "is_hidden"
        : table === "recipe_cook_photos"
        ? null
        : "is_hidden";

      if (hiddenField) {
        await supabase.from(table).update({ [hiddenField]: true }).eq("id", target_id);
      }
    }
  }

  return NextResponse.json({ success: true });
}
