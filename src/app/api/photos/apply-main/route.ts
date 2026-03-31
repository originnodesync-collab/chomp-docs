import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { checkAchievements } from "@/lib/achievements";

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

  const { photo_id, recipe_id } = await request.json();

  // 해당 사진이 해당 레시피의 좋아요 1위인지 확인
  const { data: topPhoto } = await supabase
    .from("recipe_cook_photos")
    .select("id, user_id, image_url")
    .eq("recipe_id", recipe_id)
    .order("like_count", { ascending: false })
    .limit(1)
    .single();

  if (!topPhoto || topPhoto.id !== photo_id) {
    return NextResponse.json({ error: "좋아요 1위 사진만 대표 이미지를 신청할 수 있습니다" }, { status: 400 });
  }

  if (topPhoto.user_id !== dbUser.id) {
    return NextResponse.json({ error: "본인의 사진만 신청할 수 있습니다" }, { status: 403 });
  }

  // 자동 교체 (MVP에서는 운영자 승인 없이 자동)
  await supabase
    .from("recipes")
    .update({ image_url: topPhoto.image_url })
    .eq("id", recipe_id);

  // contribution_badge 부여
  await supabase
    .from("users")
    .update({ contribution_badge: true })
    .eq("id", dbUser.id);

  // PHOTO_APPROVED 업적 부여
  const { data: existingAch } = await supabase
    .from("user_achievements")
    .select("id")
    .eq("user_id", dbUser.id)
    .eq("achievement_code", "PHOTO_APPROVED")
    .single();

  if (!existingAch) {
    await supabase.from("user_achievements").insert({
      user_id: dbUser.id,
      achievement_code: "PHOTO_APPROVED",
    });
  }

  await checkAchievements(supabase, dbUser.id);

  return NextResponse.json({ success: true });
}
