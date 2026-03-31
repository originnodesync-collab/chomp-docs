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

  const { title_code } = await request.json();

  // null이면 칭호 해제
  if (title_code === null) {
    await supabase.from("users").update({ active_title: null }).eq("id", dbUser.id);
    return NextResponse.json({ success: true, active_title: null });
  }

  // 해당 업적을 가지고 있는지 확인
  const { data: achievement } = await supabase
    .from("user_achievements")
    .select("id")
    .eq("user_id", dbUser.id)
    .eq("achievement_code", title_code)
    .single();

  if (!achievement) {
    return NextResponse.json({ error: "아직 달성하지 않은 업적입니다" }, { status: 400 });
  }

  await supabase.from("users").update({ active_title: title_code }).eq("id", dbUser.id);

  return NextResponse.json({ success: true, active_title: title_code });
}
