import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from("users").select("id, points, level").eq("auth_id", user.id).single();

  if (!dbUser) {
    return NextResponse.json({ error: "유저를 찾을 수 없습니다" }, { status: 404 });
  }

  const { recipe_id } = await request.json();

  // 본인 레시피인지 확인
  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, user_id")
    .eq("id", recipe_id)
    .eq("user_id", dbUser.id)
    .single();

  if (!recipe) {
    return NextResponse.json({ error: "삭제할 수 없습니다" }, { status: 403 });
  }

  // 해당 레시피로 받은 포인트 계산 (등록 10P + 받은 좋아요 2P씩)
  const { data: pointLogs } = await supabase
    .from("point_logs")
    .select("amount")
    .eq("user_id", dbUser.id)
    .like("reason", `%RECIPE_REGISTER%`);

  // 레시피 삭제 (CASCADE로 steps, ingredients, reactions, comments 자동 삭제)
  await supabase.from("recipes").delete().eq("id", recipe_id);

  // 포인트 회수 (등록 포인트 10P)
  const { calculateLevel } = await import("@/lib/constants");
  const newPoints = Math.max(0, dbUser.points - 10);
  const newLevel = calculateLevel(newPoints);

  await supabase.from("users").update({ points: newPoints, level: newLevel }).eq("id", dbUser.id);

  await supabase.from("point_logs").insert({
    user_id: dbUser.id,
    amount: -10,
    reason: "RECIPE_DELETE",
  });

  return NextResponse.json({ success: true });
}
