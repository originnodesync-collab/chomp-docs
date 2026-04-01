import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { addPoints } from "@/lib/points";
import { BOARD_CATEGORIES } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") || "전체";
  const sort = searchParams.get("sort") || "latest"; // latest | popular
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select("*, user:users(id, nickname, active_title, profile_image_url)", { count: "exact" })
    .eq("is_hidden", false);

  if (category !== "전체") {
    query = query.eq("category", category);
  }

  if (sort === "popular") {
    query = query.order("like_count", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, count } = await query.range(offset, offset + limit - 1);

  return NextResponse.json({
    posts: data || [],
    total: count || 0,
    page,
    hasMore: (count || 0) > offset + limit,
  });
}

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

  const body = await request.json();
  const { category, title, content, image_url } = body;

  if (!category || !BOARD_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "올바른 카테고리를 선택해주세요" }, { status: 400 });
  }
  if (!title?.trim() || title.trim().length < 2) {
    return NextResponse.json({ error: "제목은 2자 이상 입력해주세요" }, { status: 400 });
  }
  if (!content?.trim() || content.trim().length < 5) {
    return NextResponse.json({ error: "내용은 5자 이상 입력해주세요" }, { status: 400 });
  }
  if (title.trim().length > 100) {
    return NextResponse.json({ error: "제목은 100자 이내로 입력해주세요" }, { status: 400 });
  }
  if (content.trim().length > 5000) {
    return NextResponse.json({ error: "내용은 5000자 이내로 입력해주세요" }, { status: 400 });
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      user_id: dbUser.id,
      category,
      title: title.trim(),
      content: content.trim(),
      image_url: image_url || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "게시글 등록에 실패했습니다" }, { status: 500 });
  }

  // 댓글 포인트 규칙 재사용 (3P, 하루 최대 15P)
  await addPoints(supabase, dbUser.id, "COMMENT");

  return NextResponse.json({ post });
}
