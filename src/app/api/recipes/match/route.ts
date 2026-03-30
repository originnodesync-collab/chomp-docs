import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const ingredientsParam = request.nextUrl.searchParams.get("ingredients");
  if (!ingredientsParam) {
    return NextResponse.json({ recipes: [] });
  }

  const ingredientNames = ingredientsParam.split(",").map((s) => s.trim());

  const supabase = await createClient();

  // 1. 재료명 → ingredient_id 매핑 (동의어 포함)
  const { data: synonymMatches } = await supabase
    .from("ingredient_synonyms")
    .select("ingredient_id")
    .in("synonym", ingredientNames);

  const { data: directMatches } = await supabase
    .from("ingredients")
    .select("id")
    .in("name", ingredientNames);

  const matchedIds = new Set<number>();
  synonymMatches?.forEach((s) => matchedIds.add(s.ingredient_id));
  directMatches?.forEach((d) => matchedIds.add(d.id));

  if (matchedIds.size === 0) {
    return NextResponse.json({ recipes: [] });
  }

  const idArray = Array.from(matchedIds);

  // 2. 매칭되는 recipe_ingredients 가져오기
  const { data: recipeIngredients } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id, ingredient_id, is_main")
    .in("ingredient_id", idArray);

  if (!recipeIngredients || recipeIngredients.length === 0) {
    return NextResponse.json({ recipes: [] });
  }

  // 3. 레시피별 점수 계산
  const scoreMap = new Map<number, { score: number; mainCount: number }>();

  recipeIngredients.forEach((ri) => {
    const prev = scoreMap.get(ri.recipe_id) || { score: 0, mainCount: 0 };
    const points = ri.is_main ? 10 : 3;
    prev.score += points;
    if (ri.is_main) prev.mainCount += 1;
    scoreMap.set(ri.recipe_id, prev);
  });

  // 주재료 1개 이상 매칭된 레시피만
  const qualifiedIds = Array.from(scoreMap.entries())
    .filter(([, v]) => v.mainCount >= 1)
    .sort((a, b) => {
      if (b[1].score !== a[1].score) return b[1].score - a[1].score;
      return b[1].mainCount - a[1].mainCount;
    })
    .slice(0, 30)
    .map(([id]) => id);

  if (qualifiedIds.length === 0) {
    return NextResponse.json({ recipes: [] });
  }

  // 4. 레시피 상세 가져오기
  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .in("id", qualifiedIds);

  // 5. 충족률 계산을 위해 전체 주재료 수 가져오기
  const { data: allMainIngredients } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id")
    .in("recipe_id", qualifiedIds)
    .eq("is_main", true);

  const totalMainMap = new Map<number, number>();
  allMainIngredients?.forEach((ri) => {
    totalMainMap.set(ri.recipe_id, (totalMainMap.get(ri.recipe_id) || 0) + 1);
  });

  // 점수순 정렬 + matchRate 추가
  const result = qualifiedIds
    .map((id) => {
      const recipe = recipes?.find((r) => r.id === id);
      if (!recipe) return null;
      const info = scoreMap.get(id)!;
      const totalMain = totalMainMap.get(id) || 1;
      return {
        ...recipe,
        matchScore: info.score,
        matchRate: Math.round((info.mainCount / totalMain) * 100),
      };
    })
    .filter(Boolean);

  return NextResponse.json({ recipes: result });
}
