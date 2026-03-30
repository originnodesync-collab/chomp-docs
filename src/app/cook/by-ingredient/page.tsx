"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { INVENTORY_CATEGORIES } from "@/lib/constants";

// 임시 재료 데이터 (나중에 DB에서 가져옴)
const SAMPLE_INGREDIENTS: Record<string, string[]> = {
  채소: ["양파", "감자", "당근", "대파", "마늘", "배추", "시금치", "고추", "양배추", "무", "콩나물", "버섯", "애호박", "브로콜리", "깻잎"],
  과일: ["사과", "배", "레몬", "오렌지"],
  육류: ["돼지고기", "소고기", "닭고기", "삼겹살", "목살", "다짐육"],
  해산물: ["새우", "오징어", "조개", "참치캔", "멸치", "고등어", "연어"],
  "유제품/계란": ["달걀", "우유", "치즈", "버터", "생크림", "요거트"],
  "소스/양념": ["간장", "고추장", "된장", "식초", "굴소스", "케첩", "마요네즈", "참기름", "들기름"],
  조미료: ["소금", "설탕", "후추", "고춧가루", "깨", "미림", "맛술"],
  냉동식품: ["만두", "떡", "냉동밥", "어묵"],
  기타: ["두부", "라면", "국수", "떡볶이떡", "김", "밀가루", "빵가루"],
};

export default function ByIngredientPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("채소");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  const toggleIngredient = (name: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  const handleSearch = () => {
    if (selectedIngredients.length === 0) return;
    const params = new URLSearchParams();
    params.set("ingredients", selectedIngredients.join(","));
    router.push(`/cook/results?${params.toString()}`);
  };

  return (
    <>
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-32">
        <h2 className="text-xl font-bold text-text mb-1">재료 선택</h2>
        <p className="text-sm text-text-sub mb-4">
          냉장고에 있는 재료를 골라주세요
        </p>

        {/* 선택된 재료 표시 */}
        {selectedIngredients.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-3 mb-4">
            <p className="text-xs text-text-sub mb-2">
              선택된 재료 ({selectedIngredients.length}개)
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedIngredients.map((name) => (
                <button
                  key={name}
                  onClick={() => toggleIngredient(name)}
                  className="inline-flex items-center gap-1 bg-cta/10 text-cta text-sm px-3 py-1 rounded-full"
                >
                  {name}
                  <span className="text-xs">✕</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 카테고리 탭 */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {INVENTORY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors ${
                selectedCategory === cat
                  ? "bg-cta text-white"
                  : "bg-surface border border-border text-text-sub"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 재료 목록 */}
        <div className="flex flex-wrap gap-2">
          {(SAMPLE_INGREDIENTS[selectedCategory] || []).map((name) => {
            const isSelected = selectedIngredients.includes(name);
            return (
              <button
                key={name}
                onClick={() => toggleIngredient(name)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  isSelected
                    ? "bg-cta text-white"
                    : "bg-surface border border-border text-text hover:border-cta/40"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </main>

      {/* 검색 버튼 */}
      {selectedIngredients.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-3 z-40">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleSearch}
              className="w-full bg-cta text-white font-semibold py-3.5 rounded-xl text-base shadow-lg active:scale-[0.98] transition-transform"
            >
              🔬 이 재료로 실험 시작 ({selectedIngredients.length}개 선택)
            </button>
          </div>
        </div>
      )}

      <BottomTabBar />
    </>
  );
}
