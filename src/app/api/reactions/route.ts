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

  const { recipe_id, type } = await request.json();

  if (!recipe_id || !["like", "dislike"].includes(type)) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  // 유저 ID 가져오기
  const { data: dbUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: "유저를 찾을 수 없습니다" }, { status: 404 });
  }

  // 이미 반응했는지 확인
  const { data: existing } = await supabase
    .from("recipe_reactions")
    .select("id, type")
    .eq("recipe_id", recipe_id)
    .eq("user_id", dbUser.id)
    .single();

  if (existing) {
    // 같은 반응이면 취소
    if (existing.type === type) {
      await supabase.from("recipe_reactions").delete().eq("id", existing.id);

      // 레시피 카운트 감소
      const field = type === "like" ? "like_count" : "dislike_count";
      const { data: recipe } = await supabase
        .from("recipes")
        .select(field)
        .eq("id", recipe_id)
        .single();

      if (recipe) {
        await supabase
          .from("recipes")
          .update({ [field]: Math.max(0, (recipe as Record<string, number>)[field] - 1) })
          .eq("id", recipe_id);
      }

      return NextResponse.json({ action: "removed" });
    }

    // 다른 반응이면 변경
    await supabase
      .from("recipe_reactions")
      .update({ type })
      .eq("id", existing.id);

    // 카운트 조정
    const { data: recipe } = await supabase
      .from("recipes")
      .select("like_count, dislike_count")
      .eq("id", recipe_id)
      .single();

    if (recipe) {
      if (type === "like") {
        await supabase
          .from("recipes")
          .update({
            like_count: recipe.like_count + 1,
            dislike_count: Math.max(0, recipe.dislike_count - 1),
          })
          .eq("id", recipe_id);
      } else {
        await supabase
          .from("recipes")
          .update({
            like_count: Math.max(0, recipe.like_count - 1),
            dislike_count: recipe.dislike_count + 1,
          })
          .eq("id", recipe_id);
      }
    }

    return NextResponse.json({ action: "changed", type });
  }

  // 새 반응 등록
  const { error } = await supabase.from("recipe_reactions").insert({
    recipe_id,
    user_id: dbUser.id,
    type,
  });

  if (error) {
    return NextResponse.json({ error: "반응 등록에 실패했습니다" }, { status: 500 });
  }

  // 레시피 카운트 증가
  const field = type === "like" ? "like_count" : "dislike_count";
  const { data: recipe } = await supabase
    .from("recipes")
    .select(field)
    .eq("id", recipe_id)
    .single();

  if (recipe) {
    await supabase
      .from("recipes")
      .update({ [field]: (recipe as Record<string, number>)[field] + 1 })
      .eq("id", recipe_id);
  }

  // 포인트 지급
  await addPoints(supabase, dbUser.id, "REACTION");

  // 영국음식 편입 체크
  const ukStatus = await checkUkFood(supabase, recipe_id);

  // 레시피 작성자에게 좋아요 포인트
  if (type === "like") {
    const { data: recipeData } = await supabase
      .from("recipes")
      .select("user_id")
      .eq("id", recipe_id)
      .single();

    if (recipeData?.user_id) {
      await addPoints(supabase, recipeData.user_id, "RECIPE_LIKED");
    }
  }

  // 업적 체크 (반응한 유저 + 레시피 작성자)
  await checkAchievements(supabase, dbUser.id);

  return NextResponse.json({ action: "added", type, ukStatus });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkUkFood(supabase: any, recipeId: number) {
  const { data: recipe } = await supabase
    .from("recipes")
    .select("like_count, dislike_count, is_uk_food")
    .eq("id", recipeId)
    .single();

  if (!recipe) return;

  const total = recipe.like_count + recipe.dislike_count;
  const shouldBeUk = total >= 5 && recipe.dislike_count / total > 0.7;

  if (shouldBeUk !== recipe.is_uk_food) {
    await supabase
      .from("recipes")
      .update({ is_uk_food: shouldBeUk })
      .eq("id", recipeId);
    return shouldBeUk ? "became_uk" : "left_uk";
  }
  return null;
}
