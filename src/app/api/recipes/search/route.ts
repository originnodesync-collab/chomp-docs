import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const difficulty = searchParams.get("difficulty") || "";
  const sort = searchParams.get("sort") || "popular"; // popular | latest
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // q도 없고 category도 없으면 아무것도 반환하지 않음
  const hasQ = q.length > 0;
  if (!hasQ && !category) {
    return NextResponse.json({ recipes: [], hasMore: false, total: 0 });
  }

  const supabase = await createClient();

  // 재료 synonym 검색: 쿼리가 재료명과 매칭되는지 확인
  let ingredientRecipeIds: number[] | null = null;
  if (hasQ) {
    const { data: synonymData } = await supabase
      .from("ingredient_synonyms")
      .select("ingredient_id")
      .ilike("synonym", `%${q}%`);

    if (synonymData && synonymData.length > 0) {
      const ingredientIds = synonymData.map((s) => s.ingredient_id);
      const { data: riData } = await supabase
        .from("recipe_ingredients")
        .select("recipe_id")
        .in("ingredient_id", ingredientIds);

      if (riData && riData.length > 0) {
        ingredientRecipeIds = riData.map((r) => r.recipe_id);
      }
    }
  }

  // 메인 쿼리 구성
  let query = supabase
    .from("recipes")
    .select("*", { count: "exact" });

  // 텍스트 검색: title ILIKE OR ingredient 매칭된 recipe id
  if (hasQ) {
    if (ingredientRecipeIds && ingredientRecipeIds.length > 0) {
      // title 검색 + ingredient 검색 합집합 (or 조건)
      query = query.or(
        `title.ilike.%${q}%,id.in.(${ingredientRecipeIds.join(",")})`
      );
    } else {
      query = query.ilike("title", `%${q}%`);
    }
  }

  // 카테고리 필터
  if (category) {
    query = query.eq("category1", category);
  }

  // 난이도 필터
  if (difficulty && ["easy", "normal", "hard"].includes(difficulty)) {
    query = query.eq("difficulty", difficulty);
  }

  // 정렬
  if (sort === "latest") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("like_count", { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ recipes: [], error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    recipes: data || [],
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
  });
}
