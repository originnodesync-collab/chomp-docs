import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from("users").select("id").eq("auth_id", user.id).single();

  if (!dbUser) {
    return NextResponse.json({ error: "유저를 찾을 수 없습니다" }, { status: 404 });
  }

  const { recipe_id } = await request.json();

  // 이미 저장했는지 확인
  const { data: existing } = await supabase
    .from("user_saved_recipes")
    .select("id")
    .eq("user_id", dbUser.id)
    .eq("recipe_id", recipe_id)
    .single();

  if (existing) {
    // 저장 해제
    await supabase.from("user_saved_recipes").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  }

  // 저장
  await supabase.from("user_saved_recipes").insert({
    user_id: dbUser.id,
    recipe_id,
  });

  return NextResponse.json({ action: "saved" });
}
