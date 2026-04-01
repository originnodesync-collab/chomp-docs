import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const postId = parseInt(id);

  // 게시글 존재 확인
  const { data: post } = await supabase
    .from("posts").select("id, like_count").eq("id", postId).single();

  if (!post) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
  }

  // 기존 좋아요 확인
  const { data: existing } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", dbUser.id)
    .single();

  let action: "liked" | "unliked";
  let newCount: number;

  if (existing) {
    // 좋아요 취소
    await supabase.from("post_likes").delete().eq("id", existing.id);
    newCount = Math.max(0, post.like_count - 1);
    action = "unliked";
  } else {
    // 좋아요 추가
    await supabase.from("post_likes").insert({ post_id: postId, user_id: dbUser.id });
    newCount = post.like_count + 1;
    action = "liked";
  }

  await supabase.from("posts").update({ like_count: newCount }).eq("id", postId);

  return NextResponse.json({ action, like_count: newCount });
}
