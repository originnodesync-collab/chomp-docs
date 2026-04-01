import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { addPoints } from "@/lib/points";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("post_comments")
    .select("*, user:users(id, nickname, active_title, profile_image_url)")
    .eq("post_id", id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true });

  const all = data || [];

  // 2depth 트리 구성
  const topLevel = all.filter((c) => c.parent_id === null);
  const replies = all.filter((c) => c.parent_id !== null);

  const threaded = topLevel.map((comment) => ({
    ...comment,
    replies: replies.filter((r) => r.parent_id === comment.id),
  }));

  return NextResponse.json({ comments: threaded });
}

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

  const { content, parent_id } = await request.json();
  const postId = parseInt(id);

  if (!content?.trim() || content.trim().length < 1) {
    return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });
  }
  if (content.trim().length > 500) {
    return NextResponse.json({ error: "댓글은 500자 이내로 작성해주세요" }, { status: 400 });
  }

  // 게시글 존재 확인
  const { data: post } = await supabase
    .from("posts").select("id, comment_count").eq("id", postId).single();

  if (!post) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
  }

  // 대댓글 depth 제한
  if (parent_id) {
    const { data: parentComment } = await supabase
      .from("post_comments")
      .select("id, parent_id")
      .eq("id", parent_id)
      .eq("post_id", postId)
      .single();

    if (!parentComment) {
      return NextResponse.json({ error: "존재하지 않는 댓글입니다" }, { status: 404 });
    }
    if (parentComment.parent_id !== null) {
      return NextResponse.json({ error: "대댓글에는 답글을 달 수 없습니다" }, { status: 400 });
    }
  }

  const { data: comment, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: postId,
      user_id: dbUser.id,
      content: content.trim(),
      parent_id: parent_id ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "댓글 등록에 실패했습니다" }, { status: 500 });
  }

  // comment_count 증가
  await supabase
    .from("posts")
    .update({ comment_count: post.comment_count + 1 })
    .eq("id", postId);

  // 포인트 지급
  await addPoints(supabase, dbUser.id, "COMMENT");

  return NextResponse.json({ comment });
}
