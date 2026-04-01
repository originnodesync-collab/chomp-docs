import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from("users").select("id").eq("auth_id", user.id).single();

  if (!dbUser) {
    return NextResponse.json({ error: "유저를 찾을 수 없습니다" }, { status: 404 });
  }

  const { target_type, target_id } = await request.json();

  if (!target_type || !target_id || !["recipe", "comment", "photo", "post", "post_comment"].includes(target_type)) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  // 신고 등록
  await supabase.from("reports").insert({
    reporter_id: dbUser.id,
    target_type,
    target_id,
  });

  // 동일 target 5회 누적 체크 → 자동 숨김
  const { count } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("target_type", target_type)
    .eq("target_id", target_id)
    .eq("status", "pending");

  if (count && count >= 5) {
    await supabase
      .from("reports")
      .update({ status: "hidden" })
      .eq("target_type", target_type)
      .eq("target_id", target_id);
  }

  return NextResponse.json({ success: true });
}
