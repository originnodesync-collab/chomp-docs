import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addPoints } from "@/lib/points";
import { checkAchievements } from "@/lib/achievements";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from("users").select("id").eq("auth_id", user.id).single();

  if (!dbUser) {
    return NextResponse.json({ error: "유저를 찾을 수 없습니다" }, { status: 404 });
  }

  // 하루 제한 체크
  const today = new Date().toISOString().split("T")[0];
  const { count } = await supabase
    .from("recipe_cook_photos")
    .select("*", { count: "exact", head: true })
    .eq("user_id", dbUser.id)
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`);

  if (count && count >= 5) {
    return NextResponse.json({ error: "하루 최대 5장까지 업로드할 수 있습니다" }, { status: 429 });
  }

  const { recipe_id, image_url, is_failed } = await request.json();

  if (!recipe_id || !image_url) {
    return NextResponse.json({ error: "필수 정보가 부족합니다" }, { status: 400 });
  }

  const { data: photo, error } = await supabase
    .from("recipe_cook_photos")
    .insert({
      recipe_id,
      user_id: dbUser.id,
      image_url,
      is_failed: is_failed || false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "업로드에 실패했습니다" }, { status: 500 });
  }

  await addPoints(supabase, dbUser.id, "PHOTO_UPLOAD");
  await checkAchievements(supabase, dbUser.id);

  return NextResponse.json({ photo });
}
