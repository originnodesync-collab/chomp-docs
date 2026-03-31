import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { addPoints } from "@/lib/points";
import { checkAchievements } from "@/lib/achievements";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { recipe_id, content } = await request.json();

  if (!recipe_id || !content?.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });
  }

  if (content.trim().length > 300) {
    return NextResponse.json({ error: "댓글은 300자 이내로 작성해주세요" }, { status: 400 });
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: "유저를 찾을 수 없습니다" }, { status: 404 });
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      recipe_id,
      user_id: dbUser.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "댓글 등록에 실패했습니다" }, { status: 500 });
  }

  await addPoints(supabase, dbUser.id, "COMMENT");
  await checkAchievements(supabase, dbUser.id);

  return NextResponse.json({ comment });
}

export async function GET(request: NextRequest) {
  const recipeId = request.nextUrl.searchParams.get("recipe_id");
  if (!recipeId) {
    return NextResponse.json({ comments: [] });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("*, user:users(nickname, active_title, profile_image_url)")
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ comments: data || [] });
}
