/**
 * 식약처 COOKRCP01 API → Supabase DB 수집 스크립트
 * 실행: npx tsx scripts/collect-recipes.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_KEY = process.env.FOODSAFETY_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const API_BASE = `http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/COOKRCP01/json`;

interface RawRecipe {
  RCP_SEQ: string;
  RCP_NM: string;
  RCP_PAT2: string;
  RCP_WAY2: string;
  RCP_PARTS_DTLS: string;
  ATT_FILE_NO_MAIN: string;
  ATT_FILE_NO_MK: string;
  HASH_TAG: string;
  INFO_ENG: string;
  MANUAL01: string; MANUAL02: string; MANUAL03: string; MANUAL04: string; MANUAL05: string;
  MANUAL06: string; MANUAL07: string; MANUAL08: string; MANUAL09: string; MANUAL10: string;
  MANUAL11: string; MANUAL12: string; MANUAL13: string; MANUAL14: string; MANUAL15: string;
  MANUAL16: string; MANUAL17: string; MANUAL18: string; MANUAL19: string; MANUAL20: string;
  MANUAL_IMG01: string; MANUAL_IMG02: string; MANUAL_IMG03: string; MANUAL_IMG04: string; MANUAL_IMG05: string;
  MANUAL_IMG06: string; MANUAL_IMG07: string; MANUAL_IMG08: string; MANUAL_IMG09: string; MANUAL_IMG10: string;
  MANUAL_IMG11: string; MANUAL_IMG12: string; MANUAL_IMG13: string; MANUAL_IMG14: string; MANUAL_IMG15: string;
  MANUAL_IMG16: string; MANUAL_IMG17: string; MANUAL_IMG18: string; MANUAL_IMG19: string; MANUAL_IMG20: string;
}

// 재료 파싱: "연두부 75g(3/4모), 칵테일새우 20g(5마리)" → [{name, amount, is_main}]
function parseIngredients(raw: string): { name: string; amount: string; is_main: boolean }[] {
  if (!raw?.trim()) return [];

  const results: { name: string; amount: string; is_main: boolean }[] = [];
  const lines = raw.split("\n").filter(l => l.trim());

  let isMain = true;
  for (const line of lines) {
    // "·양념장 :" 같은 섹션 헤더 → 부재료로 전환
    if (/^[·•\-]|양념|소스|고명|부재료/i.test(line.trim())) {
      isMain = false;
    }

    // 재료명이 아닌 라인 건너뛰기 (요리명만 있는 첫줄 등)
    const items = line.split(/[,，]/).map(s => s.trim()).filter(s => s.length > 0);

    for (const item of items) {
      // "재료명 수량" 패턴 파싱
      const match = item.match(/^([가-힣a-zA-Z\s]+?)\s*([\d/.]+\s*[가-힣a-zA-Z()\/\s]*)?$/);
      if (match) {
        const name = match[1].trim();
        const amount = match[2]?.trim() || "";

        // 너무 짧거나 섹션 헤더인 건 건너뛰기
        if (name.length < 1 || /^[\d\s]+$/.test(name)) continue;
        if (/양념장|소스류|부재료|주재료|인분/.test(name)) continue;

        results.push({ name, amount, is_main: isMain });
      }
    }

    // 첫 번째 빈 줄 이후는 부재료
    if (line.trim() === "") isMain = false;
  }

  return results;
}

// 조리 단계 파싱
function parseSteps(recipe: RawRecipe): { step_number: number; description: string; image_url: string | null }[] {
  const steps: { step_number: number; description: string; image_url: string | null }[] = [];

  for (let i = 1; i <= 20; i++) {
    const key = `MANUAL${String(i).padStart(2, "0")}` as keyof RawRecipe;
    const imgKey = `MANUAL_IMG${String(i).padStart(2, "0")}` as keyof RawRecipe;

    const desc = recipe[key]?.trim();
    if (!desc) continue;

    // 앞의 번호 제거 ("1. 손질된..." → "손질된...")
    const cleaned = desc.replace(/^\d+\.\s*/, "").replace(/[a-z]$/, "").trim();
    if (!cleaned) continue;

    steps.push({
      step_number: steps.length + 1,
      description: cleaned,
      image_url: recipe[imgKey]?.trim() || null,
    });
  }

  return steps;
}

async function main() {
  console.log("🔬 식약처 레시피 수집 시작...");

  // 기존 공식 레시피 삭제 (재실행 시 중복 방지)
  const { count: existingCount } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true })
    .eq("is_official", true);

  if (existingCount && existingCount > 0) {
    console.log(`⚠️ 기존 공식 레시피 ${existingCount}개 삭제 중...`);
    // recipe_steps, recipe_ingredients는 ON DELETE CASCADE로 자동 삭제
    await supabase.from("recipes").delete().eq("is_official", true);
  }

  // 재료 캐시 (이름 → id)
  const ingredientCache = new Map<string, number>();

  async function getOrCreateIngredient(name: string): Promise<number> {
    const cached = ingredientCache.get(name);
    if (cached) return cached;

    // 기존 재료 검색
    const { data: existing } = await supabase
      .from("ingredients")
      .select("id")
      .eq("name", name)
      .single();

    if (existing) {
      ingredientCache.set(name, existing.id);
      return existing.id;
    }

    // 새로 생성
    const { data: created } = await supabase
      .from("ingredients")
      .insert({ name })
      .select("id")
      .single();

    if (created) {
      ingredientCache.set(name, created.id);

      // 동의어도 등록 (자기 자신)
      await supabase.from("ingredient_synonyms").insert({
        ingredient_id: created.id,
        synonym: name,
      });

      return created.id;
    }

    throw new Error(`재료 생성 실패: ${name}`);
  }

  let totalRecipes = 0;
  let totalSteps = 0;
  let totalIngredients = 0;

  // 100개씩 나눠서 수집 (총 1,146개)
  for (let start = 1; start <= 1146; start += 100) {
    const end = Math.min(start + 99, 1146);
    console.log(`📥 ${start}~${end} 수집 중...`);

    const res = await fetch(`${API_BASE}/${start}/${end}`);
    const data = await res.json();

    const rows: RawRecipe[] = data.COOKRCP01?.row || [];

    for (const raw of rows) {
      // 1. 레시피 등록
      const category1 = raw.RCP_PAT2?.trim() || "기타";
      const category2 = raw.RCP_WAY2?.trim() || null;

      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .insert({
          title: raw.RCP_NM?.trim() || "제목 없음",
          category1,
          category2,
          image_url: raw.ATT_FILE_NO_MAIN?.trim() || raw.ATT_FILE_NO_MK?.trim() || null,
          is_official: true,
          user_id: null,
        })
        .select("id")
        .single();

      if (recipeError || !recipe) {
        console.error(`❌ 레시피 등록 실패: ${raw.RCP_NM}`, recipeError?.message);
        continue;
      }

      totalRecipes++;

      // 2. 조리 단계 등록
      const steps = parseSteps(raw);
      if (steps.length > 0) {
        const stepsToInsert = steps.map(s => ({
          recipe_id: recipe.id,
          section: "cook" as const, // 공식 레시피는 전부 cook
          step_number: s.step_number,
          description: s.description,
          image_url: s.image_url,
        }));

        await supabase.from("recipe_steps").insert(stepsToInsert);
        totalSteps += steps.length;
      }

      // 3. 재료 등록
      const ingredients = parseIngredients(raw.RCP_PARTS_DTLS);
      for (const ing of ingredients) {
        try {
          const ingredientId = await getOrCreateIngredient(ing.name);

          await supabase.from("recipe_ingredients").insert({
            recipe_id: recipe.id,
            ingredient_id: ingredientId,
            amount: ing.amount || null,
            is_main: ing.is_main,
          });

          totalIngredients++;
        } catch {
          // 재료 파싱 실패 무시
        }
      }
    }

    // API 과부하 방지
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("\n✅ 수집 완료!");
  console.log(`📋 레시피: ${totalRecipes}개`);
  console.log(`📝 조리 단계: ${totalSteps}개`);
  console.log(`🥕 재료 연결: ${totalIngredients}개`);
  console.log(`🧂 재료 마스터: ${ingredientCache.size}개`);
}

main().catch(console.error);
