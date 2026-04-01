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

  const { recipe_id, content, parent_id } = await request.json();

  if (!recipe_id || !content?.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });
  }

  if (content.trim().length > 300) {
    return NextResponse.json({ error: "댓글은 300자 이내로 작성해주세요" }, { status: 400 });
  }

  // parent_id가 있으면 유효한 원댓글인지 확인 (대댓글의 대댓글 방지)
  if (parent_id) {
    const { data: parentComment } = await supabase
      .from("comments")
      .select("id, parent_id")
      .eq("id", parent_id)
      .eq("recipe_id", recipe_id)
      .single();

    if (!parentComment) {
      return NextResponse.json({ error: "존재하지 않는 댓글입니다" }, { status: 404 });
    }
    if (parentComment.parent_id !== null) {
      return NextResponse.json({ error: "대댓글에는 답글을 달 수 없습니다" }, { status: 400 });
    }
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
      parent_id: parent_id ?? null,
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

  // 전체 댓글을 한 번에 가져온 후 클라이언트에서 트리 구성
  const { data } = await supabase
    .from("comments")
    .select("*, user:users(id, nickname, active_title, profile_image_url)")
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: true })
    .limit(200);

  const allComments = data || [];

  // 원댓글 + 대댓글 트리 구조로 변환
  const topLevel = allComments.filter((c) => c.parent_id === null);
  const replies = allComments.filter((c) => c.parent_id !== null);

  const threaded = topLevel.map((comment) => ({
    ...comment,
    replies: replies.filter((r) => r.parent_id === comment.id),
  }));

  return NextResponse.json({ comments: threaded });
}
