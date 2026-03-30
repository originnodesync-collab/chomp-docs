"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { CATEGORY1_OPTIONS } from "@/lib/constants";
import type { Recipe } from "@/types/database";

interface RecipeResult extends Recipe {
  matchScore?: number;
  matchRate?: number;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const ingredients = searchParams.get("ingredients");
  const query = searchParams.get("q");
  const [recipes, setRecipes] = useState<RecipeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecipes() {
      setLoading(true);
      try {
        let url = "";
        if (ingredients) {
          url = `/api/recipes/match?ingredients=${encodeURIComponent(ingredients)}`;
        } else if (query) {
          url = `/api/recipes/search?q=${encodeURIComponent(query)}`;
        }
        if (!url) return;

        const res = await fetch(url);
        const data = await res.json();
        setRecipes(data.recipes || []);
      } catch {
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    }
    fetchRecipes();
  }, [ingredients, query]);

  const filtered = categoryFilter
    ? recipes.filter((r) => r.category1 === categoryFilter)
    : recipes;

  const searchLabel = ingredients
    ? `재료 ${ingredients.split(",").length}개로 검색`
    : `"${query}" 검색 결과`;

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
      <h2 className="text-lg font-bold text-text mb-1">{searchLabel}</h2>
      <p className="text-sm text-text-sub mb-4">
        {loading ? "검색 중..." : `${filtered.length}개 레시피 발견`}
      </p>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors ${
            !categoryFilter
              ? "bg-cta text-white"
              : "bg-surface border border-border text-text-sub"
          }`}
        >
          전체
        </button>
        {CATEGORY1_OPTIONS.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors ${
              categoryFilter === cat
                ? "bg-cta text-white"
                : "bg-surface border border-border text-text-sub"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 결과 리스트 */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-xl p-4 animate-pulse"
            >
              <div className="h-4 bg-border rounded w-2/3 mb-2" />
              <div className="h-3 bg-border rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-text-sub text-sm">연구 데이터 없음</p>
          <p className="text-text-sub text-xs mt-1">
            다른 재료나 검색어로 시도해보세요
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipe/${recipe.id}`}
              className="block bg-surface border border-border rounded-xl overflow-hidden hover:border-cta/30 transition-colors active:scale-[0.99]"
            >
              <div className="flex">
                {recipe.image_url && (
                  <div className="w-24 h-24 shrink-0 bg-border">
                    <img
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-text line-clamp-1">
                      {recipe.title}
                    </p>
                    {recipe.matchRate !== undefined && (
                      <span className="shrink-0 text-xs bg-cta/10 text-cta px-2 py-0.5 rounded-full">
                        {recipe.matchRate}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-text-sub">
                    <span>{recipe.category1}</span>
                    {recipe.difficulty && (
                      <>
                        <span>·</span>
                        <span>
                          {recipe.difficulty === "easy"
                            ? "쉬움"
                            : recipe.difficulty === "normal"
                            ? "보통"
                            : "어려움"}
                        </span>
                      </>
                    )}
                    {recipe.cook_time_min && (
                      <>
                        <span>·</span>
                        <span>{recipe.cook_time_min}분</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-sub">
                    <span>❤️ {recipe.like_count}</span>
                    {recipe.is_uk_food && <span>🇬🇧</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export default function ResultsPage() {
  return (
    <>
      <Header />
      <Suspense
        fallback={
          <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
            <p className="text-text-sub text-sm">로딩 중...</p>
          </main>
        }
      >
        <ResultsContent />
      </Suspense>
      <BottomTabBar />
    </>
  );
}
