/**
 * 농림수산식품교육문화정보원 레시피 API → Supabase DB 수집 스크립트
 *
 * 실행: npx tsx scripts/collect-mafra.ts
 *
 * API 키 발급 (무료):
 *   https://data.mafra.go.kr → 회원가입 → 오픈API → 이용 신청
 *   신청 API: 레시피 기본정보 / 재료정보 / 과정정보 (3개 세트)
 *
 * 환경변수:
 *   MAFRA_API_KEY=발급받은키  (없으면 'sample' 키로 제한 실행)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MAFRA_API_KEY = process.env.MAFRA_API_KEY || "sample";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE_URL = `http://211.237.50.150:7080/openapi/${MAFRA_API_KEY}/json`;

// API Grid ID 상수
const GRID_RECIPE  = "Grid_20150827000000000226_1"; // 레시피 기본정보
const GRID_IRDNT   = "Grid_20150827000000000227_1"; // 재료정보
const GRID_STEP    = "Grid_20150827000000000228_1"; // 과정정보

// ─── 타입 정의 ───────────────────────────────────────────────

interface MafraRecipe {
  RECIPE_ID: string;
  RECIPE_NM_KO: string;
  SUMRY: string;          // 요약 설명
  NATION_NM: string;      // 국가명
  TY_NM: string;          // 요리 종류명
  COOKING_TIME: string;   // 조리시간 (예: "30분")
  CALORIE: string;        // 칼로리
  QNT: string;            // 인분 (예: "4인분")
  LEVEL_NM: string;       // 난이도 (예: "초급")
  PC_NM: string;          // 가격대
}

interface MafraIngredient {
  RECIPE_ID: string;
  IRDNT_SN: string;       // 재료 순번
  IRDNT_NM: string;       // 재료명
  IRDNT_CPCTY: string;    // 분량
  IRDNT_TY_CODE: string;  // 재료 타입 코드 (1=주재료, 2=부재료, 3=양념)
  IRDNT_TY_NM: string;    // 재료 타입명
}

interface MafraStep {
  RECIPE_ID: string;
  COOKING_NO: string;           // 단계 번호
  COOKING_DC: string;           // 단계 설명
  STEP_TIP: string;             // 단계 팁
  STRE_STEP_IMAGE_URL: string;  // 단계 이미지 URL
}

// ─── 매핑 테이블 ──────────────────────────────────────────────

const DIFFICULTY_MAP: Record<string, "easy" | "normal" | "hard"> = {
  "초급": "easy",
  "중급": "normal",
  "고급": "hard",
  "쉬움": "easy",
  "보통": "normal",
  "어려움": "hard",
};

/** MAFRA TY_NM → 우리 DB category1 */
function mapCategory(tyNm: string): string {
  if (!tyNm) return "기타";
  const t = tyNm.trim();
  if (/국|탕|찌개|전골|수프/.test(t)) return "국&찌개";
  if (/밥|죽|면|떡|만두|파스타|리조또/.test(t)) return "일품";
  if (/반찬|나물|볶음|조림|구이|전|튀김|무침|찜|절임/.test(t)) return "반찬";
  if (/후식|디저트|케이크|쿠키|빵|음료|차|주스|음청/.test(t)) return "후식";
  return "기타";
}

// ─── API 헬퍼 ────────────────────────────────────────────────

async function fetchAll<T>(gridId: string, pageSize = 500): Promise<T[]> {
  const all: T[] = [];
  let start = 1;

  while (true) {
    const end = start + pageSize - 1;
    const url = `${BASE_URL}/${gridId}/${start}/${end}`;
    console.log(`  📡 ${start}~${end} 요청 중...`);

    let data: Record<string, { list_total_count?: number; row?: T[] }>;
    try {
      const res = await fetch(url);
      data = await res.json();
    } catch (e) {
      console.error(`  ❌ 요청 실패: ${url}`, e);
      break;
    }

    const grid = data[gridId];
    if (!grid || !grid.row) {
      console.warn(`  ⚠️  응답 없음 또는 grid 키 불일치`);
      break;
    }

    const rows = grid.row;
    all.push(...rows);

    const total = grid.list_total_count || 0;
    console.log(`  → 누적 ${all.length}건 수집 (API 총계: ${total})`);

    // total이 0으로 오는 API 버그 대응: 받은 rows가 pageSize보다 적으면 마지막 페이지
    if (rows.length < pageSize) break;
    // total이 정상적으로 오면 초과 여부 체크
    if (total > 0 && all.length >= total) break;

    start += pageSize;
    await new Promise(r => setTimeout(r, 300)); // API 과부하 방지
  }

  return all;
}

// ─── 재료 캐시 ───────────────────────────────────────────────

const ingredientCache = new Map<string, number>();

async function getOrCreateIngredient(name: string): Promise<number> {
  const cached = ingredientCache.get(name);
  if (cached) return cached;

  const { data: existing } = await supabase
    .from("ingredients")
    .select("id")
    .eq("name", name)
    .single();

  if (existing) {
    ingredientCache.set(name, existing.id);
    return existing.id;
  }

  const { data: created } = await supabase
    .from("ingredients")
    .insert({ name })
    .select("id")
    .single();

  if (!created) throw new Error(`재료 생성 실패: ${name}`);

  ingredientCache.set(name, created.id);
  await supabase.from("ingredient_synonyms").insert({
    ingredient_id: created.id,
    synonym: name,
  });

  return created.id;
}

// ─── 메인 ────────────────────────────────────────────────────

async function main() {
  console.log("🌾 농림수산식품교육문화정보원 레시피 수집 시작\n");

  if (MAFRA_API_KEY === "sample") {
    console.log("⚠️  MAFRA_API_KEY 미설정 — sample 키 사용 중 (소량만 반환됨)");
    console.log("   실제 수집: https://data.mafra.go.kr 에서 API 키 발급 후 .env.local에 추가\n");
  }

  // ── 1. 전체 데이터 수집 ──────────────────────────────────────
  console.log("1️⃣  레시피 기본정보 수집...");
  const recipes = await fetchAll<MafraRecipe>(GRID_RECIPE);
  console.log(`   → ${recipes.length}개\n`);

  console.log("2️⃣  재료정보 수집...");
  const ingredients = await fetchAll<MafraIngredient>(GRID_IRDNT);
  console.log(`   → ${ingredients.length}건\n`);

  console.log("3️⃣  과정정보 수집...");
  const steps = await fetchAll<MafraStep>(GRID_STEP);
  console.log(`   → ${steps.length}건\n`);

  // ── 2. RECIPE_ID 기준 인덱싱 ──────────────────────────────
  const ingredientMap = new Map<string, MafraIngredient[]>();
  for (const ing of ingredients) {
    const arr = ingredientMap.get(ing.RECIPE_ID) ?? [];
    arr.push(ing);
    ingredientMap.set(ing.RECIPE_ID, arr);
  }

  const stepMap = new Map<string, MafraStep[]>();
  for (const step of steps) {
    const arr = stepMap.get(step.RECIPE_ID) ?? [];
    arr.push(step);
    stepMap.set(step.RECIPE_ID, arr);
  }

  // ── 3. 기존 mafra 레시피 삭제 (재실행 시 중복 방지) ─────────
  const { count: existingCount } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true })
    .eq("source", "mafra");

  if (existingCount && existingCount > 0) {
    console.log(`⚠️  기존 mafra 레시피 ${existingCount}개 삭제 중...`);
    await supabase.from("recipes").delete().eq("source", "mafra");
    console.log("   삭제 완료\n");
  }

  // ── 4. DB 삽입 ───────────────────────────────────────────────
  console.log("4️⃣  DB 삽입 중...\n");
  let inserted = 0;
  let skipped = 0;

  for (const r of recipes) {
    const recipeSteps = (stepMap.get(r.RECIPE_ID) ?? [])
      .sort((a, b) => Number(a.COOKING_NO) - Number(b.COOKING_NO));

    // 조리 단계가 없으면 스킵 (품질 관리)
    if (recipeSteps.length === 0) {
      skipped++;
      continue;
    }

    // 필드 변환
    const cookTimeMin = r.COOKING_TIME
      ? parseInt(r.COOKING_TIME.replace(/[^\d]/g, "")) || null
      : null;
    const servings = r.QNT
      ? parseInt(r.QNT.replace(/[^\d]/g, "")) || 2
      : 2;
    const calories = r.CALORIE
      ? parseFloat(r.CALORIE.replace(/[^\d.]/g, "")) || null
      : null;
    const difficulty = r.LEVEL_NM
      ? (DIFFICULTY_MAP[r.LEVEL_NM.trim()] ?? null)
      : null;
    const category1 = mapCategory(r.TY_NM ?? "");

    // 레시피 삽입
    const { data: recipe, error } = await supabase
      .from("recipes")
      .insert({
        title:        r.RECIPE_NM_KO?.trim() || "제목 없음",
        category1,
        category2:    r.TY_NM?.trim() || null,
        description:  r.SUMRY?.trim()?.slice(0, 100) || null,
        difficulty,
        cook_time_min: cookTimeMin,
        servings,
        calories,
        is_official:  true,
        source:       "mafra",
        user_id:      null,
      })
      .select("id")
      .single();

    if (error || !recipe) {
      console.error(`❌ 레시피 삽입 실패: ${r.RECIPE_NM_KO}`, error?.message);
      skipped++;
      continue;
    }

    // 조리 단계 삽입
    const stepsToInsert = recipeSteps
      .map((s, idx) => ({
        recipe_id:   recipe.id,
        section:     "cook" as const,
        step_number: idx + 1,
        description: s.COOKING_DC?.trim() || "",
        image_url:   s.STRE_STEP_IMAGE_URL?.trim() || null,
        tip:         s.STEP_TIP?.trim() || null,
      }))
      .filter(s => s.description.length > 0);

    if (stepsToInsert.length > 0) {
      await supabase.from("recipe_steps").insert(stepsToInsert);
    }

    // 재료 삽입
    const recipeIngredients = ingredientMap.get(r.RECIPE_ID) ?? [];
    for (const ing of recipeIngredients) {
      const name = ing.IRDNT_NM?.trim();
      if (!name || name.length < 1) continue;

      try {
        const ingredientId = await getOrCreateIngredient(name);
        // IRDNT_TY_CODE: "3060001"=주재료, "3060002"=부재료, "3060003"=양념
        // IRDNT_TY_NM: "주재료" 로도 확인
        const isMain = ing.IRDNT_TY_CODE === "3060001" || ing.IRDNT_TY_NM === "주재료";

        await supabase.from("recipe_ingredients").insert({
          recipe_id:     recipe.id,
          ingredient_id: ingredientId,
          amount:        ing.IRDNT_CPCTY?.trim() || null,
          is_main:       isMain,
        });
      } catch {
        // 개별 재료 실패는 무시
      }
    }

    inserted++;
    if (inserted % 50 === 0) {
      console.log(`   ✅ ${inserted}개 완료...`);
    }
  }

  console.log("\n🎉 수집 완료!");
  console.log(`  ✅ 삽입: ${inserted}개`);
  console.log(`  ⏭️  스킵: ${skipped}개 (조리 단계 없음)`);
  console.log(`  🥕 재료 신규 등록: ${ingredientCache.size}개`);
}

main().catch(console.error);
