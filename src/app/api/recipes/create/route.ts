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
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: "유저를 찾을 수 없습니다" }, { status: 404 });
  }

  // 하루 등록 제한 체크
  const today = new Date().toISOString().split("T")[0];
  const { count } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", dbUser.id)
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`);

  if (count && count >= 5) {
    return NextResponse.json({ error: "하루 최대 5개까지 등록할 수 있습니다" }, { status: 429 });
  }

  const body = await request.json();

  // 레시피 등록
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      title: body.title,
      category1: body.category1,
      category2: body.category2,
      difficulty: body.difficulty,
      cook_time_min: body.cook_time_min,
      servings: body.servings,
      description: body.description,
      image_url: body.image_url || null,
      is_official: false,
      user_id: dbUser.id,
    })
    .select()
    .single();

  if (recipeError || !recipe) {
    return NextResponse.json({ error: "레시피 등록에 실패했습니다" }, { status: 500 });
  }

  // 재료 등록
  if (body.ingredients?.length > 0) {
    for (const ing of body.ingredients) {
      // 재료 찾거나 생성
      let { data: existing } = await supabase
        .from("ingredients")
        .select("id")
        .eq("name", ing.name.trim())
        .single();

      if (!existing) {
        const { data: created } = await supabase
          .from("ingredients")
          .insert({ name: ing.name.trim() })
          .select("id")
          .single();
        existing = created;
      }

      if (existing) {
        await supabase.from("recipe_ingredients").insert({
          recipe_id: recipe.id,
          ingredient_id: existing.id,
          amount: ing.amount || null,
          is_main: ing.is_main,
        });
      }
    }
  }

  // 조리 단계 등록
  if (body.steps?.length > 0) {
    const stepsToInsert = body.steps.map((step: { section: string; description: string; step_number: number; timer_seconds: number | null; tip: string }) => ({
      recipe_id: recipe.id,
      section: step.section,
      step_number: step.step_number,
      description: step.description,
      timer_seconds: step.timer_seconds,
      tip: step.tip || null,
    }));

    await supabase.from("recipe_steps").insert(stepsToInsert);
  }

  // 포인트 지급
  await addPoints(supabase, dbUser.id, "RECIPE_REGISTER");

  // 업적 체크
  const newAchievements = await checkAchievements(supabase, dbUser.id);

  return NextResponse.json({ recipe, newAchievements });
}
