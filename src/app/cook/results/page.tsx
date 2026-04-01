"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { CATEGORY1_OPTIONS, DIFFICULTY_OPTIONS } from "@/lib/constants";
import type { Recipe } from "@/types/database";

interface RecipeResult extends Recipe {
  matchScore?: number;
  matchRate?: number;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "쉬움",
  normal: "보통",
  hard: "어려움",
};

const SOURCE_LABELS: Record<string, string> = {
  foodsafety: "식약처",
  mafra: "농림부",
  nongsaro: "농사로",
  visitkorea: "한국관광",
  heritage: "전통",
  user: "유저",
};

function ResultsContent() {
  const searchParams = useSearchParams();
  const ingredients = searchParams.get("ingredients");
  const query = searchParams.get("q");

  const [recipes, setRecipes] = useState<RecipeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // 필터 상태 (URL 파라미터로 초기화)
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchParams.get("category") || ""
  );
  const [difficultyFilter, setDifficultyFilter] = useState<string>("");
  const [sort, setSort] = useState<"popular" | "latest">("popular");

  const fetchRecipes = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      let url = "";

      if (ingredients) {
        // 재료 매칭: 필터는 클라이언트 사이드
        url = `/api/recipes/match?ingredients=${encodeURIComponent(ingredients)}`;
        const res = await fetch(url);
        const data = await res.json();
        setRecipes(data.recipes || []);
        setTotal(data.recipes?.length || 0);
        setHasMore(false);
      } else if (query !== null) {
        const params = new URLSearchParams({
          q: query,
          sort,
          page: String(currentPage),
        });
        if (categoryFilter) params.set("category", categoryFilter);
        if (difficultyFilter) params.set("difficulty", difficultyFilter);

        url = `/api/recipes/search?${params}`;
        const res = await fetch(url);
        const data = await res.json();

        if (reset) {
          setRecipes(data.recipes || []);
          setPage(1);
        } else {
          setRecipes((prev) => [...prev, ...(data.recipes || [])]);
        }
        setTotal(data.total || 0);
        setHasMore(data.hasMore || false);
      }
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [ingredients, query, sort, categoryFilter, difficultyFilter, page]);

  // 필터/정렬 변경 시 리셋
  useEffect(() => {
    setPage(1);
    fetchRecipes(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredients, query, sort, categoryFilter, difficultyFilter]);

  // 재료 매칭 시 클라이언트 필터
  const filtered = ingredients
    ? recipes.filter((r) => {
        if (categoryFilter && r.category1 !== categoryFilter) return false;
        if (difficultyFilter && r.difficulty !== difficultyFilter) return false;
        return true;
      })
    : recipes;

  const searchLabel = ingredients
    ? `재료 ${ingredients.split(",").length}개로 검색`
    : query
    ? `"${query}" 검색 결과`
    : "레시피 탐색";

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
      <h2 className="text-lg font-bold text-text mb-1">{searchLabel}</h2>
      <p className="text-sm text-text-sub mb-4">
        {loading ? "검색 중..." : `${ingredients ? filtered.length : total}개 레시피`}
      </p>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
        <button
          onClick={() => setCategoryFilter("")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            !categoryFilter ? "bg-cta text-white" : "bg-surface border border-border text-text-sub"
          }`}
        >
          전체
        </button>
        {CATEGORY1_OPTIONS.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat === categoryFilter ? "" : cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              categoryFilter === cat ? "bg-cta text-white" : "bg-surface border border-border text-text-sub"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 난이도 + 정렬 */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {/* 난이도 */}
        <div className="flex gap-1 shrink-0">
          {DIFFICULTY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDifficultyFilter(d === difficultyFilter ? "" : d)}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                difficultyFilter === d
                  ? "bg-cta/20 text-cta font-semibold"
                  : "text-text-sub"
              }`}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-border shrink-0" />
        {/* 정렬 (텍스트 검색일 때만) */}
        {!ingredients && (
          <div className="flex gap-1 shrink-0">
            {(["popular", "latest"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  sort === s ? "text-cta font-semibold" : "text-text-sub"
                }`}
              >
                {s === "popular" ? "인기순" : "최신순"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 결과 리스트 */}
      {loading && filtered.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 animate-pulse">
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
            {difficultyFilter
              ? "난이도 정보는 유저 등록 레시피에만 있어요. 필터를 해제해보세요!"
              : "다른 검색어나 필터로 시도해보세요"}
          </p>
          {difficultyFilter && (
            <button
              onClick={() => setDifficultyFilter("")}
              className="mt-3 text-xs text-cta font-semibold"
            >
              난이도 필터 해제
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {filtered.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipe/${recipe.id}`}
                className="block bg-surface border border-border rounded-xl overflow-hidden hover:border-cta/30 transition-colors active:scale-[0.99]"
              >
                <div className="flex">
                  {recipe.image_url && (
                    <div className="w-24 h-24 shrink-0 bg-border relative">
                      <Image
                        src={recipe.image_url}
                        alt={recipe.title}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  )}
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-text line-clamp-1">{recipe.title}</p>
                      {recipe.matchRate !== undefined && (
                        <span className="shrink-0 text-xs bg-cta/10 text-cta px-2 py-0.5 rounded-full">
                          {recipe.matchRate}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-text-sub flex-wrap">
                      <span>{recipe.category1}</span>
                      {recipe.difficulty && (
                        <>
                          <span>·</span>
                          <span>{DIFFICULTY_LABELS[recipe.difficulty]}</span>
                        </>
                      )}
                      {recipe.cook_time_min && (
                        <>
                          <span>·</span>
                          <span>{recipe.cook_time_min}분</span>
                        </>
                      )}
                      {recipe.calories && (
                        <>
                          <span>·</span>
                          <span>{Math.round(recipe.calories)}kcal</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-sub">
                      <span>❤️ {recipe.like_count}</span>
                      {recipe.is_uk_food && <span>🇬🇧</span>}
                      {recipe.source && recipe.source !== "user" && (
                        <span className="bg-border/60 px-1.5 py-0.5 rounded text-text-sub/70">
                          {SOURCE_LABELS[recipe.source] || recipe.source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 더 보기 (텍스트 검색만) */}
          {!ingredients && hasMore && (
            <button
              onClick={() => {
                setPage((p) => p + 1);
                fetchRecipes(false);
              }}
              disabled={loading}
              className="w-full mt-4 py-3 text-sm text-text-sub hover:text-cta transition-colors disabled:opacity-40"
            >
              {loading ? "불러오는 중..." : "더 보기"}
            </button>
          )}
        </>
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
