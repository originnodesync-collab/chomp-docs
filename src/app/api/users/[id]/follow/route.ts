import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

// GET: 팔로우 여부 + 팔로워/팔로잉 수 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const targetUserId = parseInt(id);
  const supabase = await createClient();
  const user = await getAuthUser();

  const [followerRes, followingRes] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", targetUserId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", targetUserId),
  ]);

  let isFollowing = false;

  if (user) {
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (dbUser) {
      const { data: existing } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", dbUser.id)
        .eq("following_id", targetUserId)
        .single();
      isFollowing = !!existing;
    }
  }

  return NextResponse.json({
    follower_count: followerRes.count || 0,
    following_count: followingRes.count || 0,
    is_following: isFollowing,
  });
}

// POST: 팔로우 토글
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const targetUserId = parseInt(id);
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: "유저를 찾을 수 없습니다" }, { status: 404 });
  }

  if (dbUser.id === targetUserId) {
    return NextResponse.json({ error: "자기 자신을 팔로우할 수 없습니다" }, { status: 400 });
  }

  // 대상 유저 존재 확인
  const { data: targetUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", targetUserId)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: "유저를 찾을 수 없습니다" }, { status: 404 });
  }

  // 기존 팔로우 확인
  const { data: existing } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", dbUser.id)
    .eq("following_id", targetUserId)
    .single();

  let action: "followed" | "unfollowed";

  if (existing) {
    await supabase.from("follows").delete().eq("id", existing.id);
    action = "unfollowed";
  } else {
    await supabase.from("follows").insert({
      follower_id: dbUser.id,
      following_id: targetUserId,
    });
    action = "followed";
  }

  // 팔로워 수 조회
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", targetUserId);

  return NextResponse.json({ action, follower_count: count || 0 });
}
