import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export async function DELETE(
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

  // 본인 댓글인지 확인
  const { data: comment } = await supabase
    .from("post_comments")
    .select("id, user_id, post_id")
    .eq("id", id)
    .single();

  if (!comment || comment.user_id !== dbUser.id) {
    return NextResponse.json({ error: "삭제 권한이 없습니다" }, { status: 403 });
  }

  await supabase.from("post_comments").delete().eq("id", id);

  // comment_count 감소
  const { data: post } = await supabase
    .from("posts").select("comment_count").eq("id", comment.post_id).single();

  if (post) {
    await supabase
      .from("posts")
      .update({ comment_count: Math.max(0, post.comment_count - 1) })
      .eq("id", comment.post_id);
  }

  return NextResponse.json({ success: true });
}
