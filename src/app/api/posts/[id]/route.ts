import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from("posts")
    .select("*, user:users(id, nickname, active_title, profile_image_url)")
    .eq("id", id)
    .eq("is_hidden", false)
    .single();

  if (error || !post) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
  }

  // 조회수 증가 (fire-and-forget)
  supabase.from("posts").update({ view_count: post.view_count + 1 }).eq("id", id);

  return NextResponse.json({ post });
}

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

  // 본인 게시글인지 확인
  const { data: post } = await supabase
    .from("posts").select("id, user_id").eq("id", id).single();

  if (!post || post.user_id !== dbUser.id) {
    return NextResponse.json({ error: "삭제 권한이 없습니다" }, { status: 403 });
  }

  await supabase.from("posts").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
