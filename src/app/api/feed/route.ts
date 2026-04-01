import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const offset = (page - 1) * 20;

  const { data, error } = await supabase.rpc("get_feed", {
    user_id_param: dbUser.id,
    page_offset: offset,
  });

  if (error) {
    return NextResponse.json({ error: "피드를 불러오지 못했습니다" }, { status: 500 });
  }

  const items = data || [];
  const hasMore = items.length === 20;

  return NextResponse.json({ items, hasMore });
}
