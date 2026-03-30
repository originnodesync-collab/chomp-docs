/**
 * 주요 재료 동의어 등록 스크립트
 * 실행: npx tsx --env-file=.env.local scripts/add-synonyms.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 동의어 매핑: [대표 이름, ...동의어들]
const SYNONYM_GROUPS = [
  // 육류
  ["돼지고기", "돈육", "돼지", "pork"],
  ["소고기", "쇠고기", "우육", "beef"],
  ["닭고기", "닭", "치킨", "chicken"],
  ["삼겹살", "삼겹"],
  ["다짐육", "다진고기", "간고기", "다진 고기"],
  ["목살", "돼지목살"],
  ["닭가슴살", "닭 가슴살", "치킨 가슴살"],
  ["닭다리", "닭 다리", "닭다리살"],
  ["베이컨", "bacon"],
  ["소시지", "sausage", "비엔나소시지"],

  // 해산물
  ["새우", "shrimp", "칵테일새우"],
  ["오징어", "squid"],
  ["참치", "참치캔", "tuna"],
  ["연어", "salmon"],
  ["고등어", "mackerel"],
  ["멸치", "anchovy"],
  ["조개", "바지락", "clam"],
  ["꽃게", "게"],
  ["미역", "seaweed"],
  ["김", "해태"],

  // 채소
  ["양파", "onion"],
  ["감자", "potato"],
  ["당근", "carrot"],
  ["대파", "파", "green onion", "scallion"],
  ["마늘", "garlic", "다진 마늘", "다진마늘"],
  ["배추", "chinese cabbage"],
  ["시금치", "spinach"],
  ["고추", "청양고추", "청고추", "홍고추", "풋고추"],
  ["양배추", "cabbage"],
  ["무", "radish"],
  ["콩나물", "bean sprouts"],
  ["버섯", "mushroom", "표고버섯", "새송이버섯", "팽이버섯", "양송이버섯"],
  ["애호박", "호박", "zucchini"],
  ["브로콜리", "broccoli"],
  ["깻잎", "perilla"],
  ["상추", "lettuce"],
  ["토마토", "tomato", "방울토마토"],
  ["오이", "cucumber"],
  ["피망", "bell pepper", "파프리카"],
  ["생강", "ginger", "다진 생강", "다진생강"],
  ["셀러리", "celery"],
  ["부추", "chive"],
  ["쪽파", "실파"],
  ["미나리", "water parsley"],
  ["숙주", "숙주나물"],

  // 과일
  ["사과", "apple"],
  ["배", "pear"],
  ["레몬", "lemon"],
  ["오렌지", "orange"],

  // 유제품/계란
  ["달걀", "계란", "egg", "달걀노른자", "달걀흰자"],
  ["우유", "milk"],
  ["치즈", "cheese", "모짜렐라치즈", "슬라이스치즈", "크림치즈"],
  ["버터", "butter", "무염버터"],
  ["생크림", "cream", "whipping cream"],
  ["요거트", "yogurt", "요구르트"],

  // 소스/양념
  ["간장", "soy sauce", "진간장", "국간장", "양조간장", "저염간장"],
  ["고추장", "gochujang", "red pepper paste"],
  ["된장", "doenjang", "soybean paste"],
  ["식초", "vinegar", "식초"],
  ["굴소스", "oyster sauce"],
  ["케첩", "ketchup", "토마토케첩"],
  ["마요네즈", "mayo", "mayonnaise"],
  ["참기름", "sesame oil"],
  ["들기름", "perilla oil"],
  ["올리브유", "올리브오일", "olive oil"],
  ["식용유", "cooking oil", "포도씨유", "카놀라유"],
  ["맛술", "미림", "mirin"],
  ["요리당", "물엿", "올리고당"],
  ["토마토소스", "tomato sauce"],
  ["카레가루", "카레분", "curry"],

  // 조미료
  ["소금", "salt", "천일염", "꽃소금"],
  ["설탕", "sugar", "백설탕", "흑설탕"],
  ["후추", "pepper", "후춧가루", "black pepper"],
  ["고춧가루", "red pepper flakes", "고운 고춧가루", "굵은 고춧가루"],
  ["깨", "참깨", "sesame", "통깨"],
  ["전분", "녹말", "감자전분", "옥수수전분", "starch"],

  // 곡류/면
  ["밀가루", "flour", "중력분", "강력분", "박력분"],
  ["빵가루", "bread crumbs", "panko"],
  ["밥", "rice", "쌀밥", "잡곡밥", "현미밥"],
  ["쌀", "rice"],
  ["국수", "noodle", "소면"],
  ["라면", "ramen", "라면사리"],
  ["두부", "tofu", "연두부", "순두부", "부침두부"],

  // 냉동/가공
  ["만두", "dumpling"],
  ["떡", "rice cake", "떡볶이떡", "가래떡"],
  ["어묵", "fishcake", "fish cake"],
  ["햄", "ham", "스팸"],
];

async function main() {
  console.log("🧂 재료 동의어 등록 시작...");

  let added = 0;
  let skipped = 0;

  for (const group of SYNONYM_GROUPS) {
    const mainName = group[0];

    // 대표 재료 찾기
    const { data: ingredient } = await supabase
      .from("ingredients")
      .select("id")
      .eq("name", mainName)
      .single();

    if (!ingredient) {
      // 대표 재료가 없으면 생성
      const { data: created } = await supabase
        .from("ingredients")
        .insert({ name: mainName })
        .select("id")
        .single();

      if (!created) {
        console.log(`❌ ${mainName} 생성 실패`);
        continue;
      }

      // 기존 동의어에 자기 자신 추가
      await supabase.from("ingredient_synonyms").insert({
        ingredient_id: created.id,
        synonym: mainName,
      });

      // 나머지 동의어 추가
      for (let i = 1; i < group.length; i++) {
        const { error } = await supabase.from("ingredient_synonyms").insert({
          ingredient_id: created.id,
          synonym: group[i],
        });
        if (!error) added++;
        else skipped++;
      }
    } else {
      // 동의어 추가 (중복 제거)
      for (const synonym of group) {
        const { data: existing } = await supabase
          .from("ingredient_synonyms")
          .select("id")
          .eq("ingredient_id", ingredient.id)
          .eq("synonym", synonym)
          .single();

        if (!existing) {
          const { error } = await supabase.from("ingredient_synonyms").insert({
            ingredient_id: ingredient.id,
            synonym,
          });
          if (!error) added++;
          else skipped++;
        } else {
          skipped++;
        }
      }
    }
  }

  console.log(`\n✅ 동의어 등록 완료!`);
  console.log(`➕ 추가: ${added}개`);
  console.log(`⏭️ 건너뜀(이미 있음): ${skipped}개`);
  console.log(`📦 총 그룹: ${SYNONYM_GROUPS.length}개`);
}

main().catch(console.error);
