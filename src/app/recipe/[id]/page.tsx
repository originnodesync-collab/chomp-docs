"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { SECTION_LABELS } from "@/lib/constants";
import type { Recipe, RecipeStep, RecipeIngredient, Ingredient } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

interface IngredientWithName extends RecipeIngredient {
  ingredient: Ingredient;
}

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [ingredients, setIngredients] = useState<IngredientWithName[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecipe() {
      const supabase = createClient();

      const [recipeRes, stepsRes, ingredientsRes] = await Promise.all([
        supabase.from("recipes").select("*").eq("id", id).single(),
        supabase
          .from("recipe_steps")
          .select("*")
          .eq("recipe_id", id)
          .order("section")
          .order("step_number"),
        supabase
          .from("recipe_ingredients")
          .select("*, ingredient:ingredients(*)")
          .eq("recipe_id", id),
      ]);

      if (recipeRes.data) setRecipe(recipeRes.data);
      if (stepsRes.data) setSteps(stepsRes.data);
      if (ingredientsRes.data) setIngredients(ingredientsRes.data as IngredientWithName[]);
      setLoading(false);
    }
    fetchRecipe();
  }, [id]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-6 pb-24">
          <div className="animate-pulse">
            <div className="h-48 bg-border rounded-xl mb-4" />
            <div className="h-6 bg-border rounded w-2/3 mb-2" />
            <div className="h-4 bg-border rounded w-1/3" />
          </div>
        </main>
        <BottomTabBar />
      </>
    );
  }

  if (!recipe) {
    return (
      <>
        <Header />
        <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-16 pb-24 text-center">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-text-sub">레시피를 찾을 수 없습니다</p>
        </main>
        <BottomTabBar />
      </>
    );
  }

  const mainIngredients = ingredients.filter((i) => i.is_main);
  const subIngredients = ingredients.filter((i) => !i.is_main);

  // 구간별로 그룹핑
  const sections = ["prep", "cook", "finish"] as const;
  const stepsBySection = sections
    .map((s) => ({
      section: s,
      label: SECTION_LABELS[s],
      steps: steps.filter((step) => step.section === s),
    }))
    .filter((g) => g.steps.length > 0);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full pb-24">
        {/* 대표 이미지 */}
        {recipe.image_url && (
          <div className="w-full h-52 bg-border">
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="px-4 pt-4">
          {/* 제목 + 메타 */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h2 className="text-xl font-bold text-text">{recipe.title}</h2>
            {recipe.is_uk_food && <span className="text-lg">🇬🇧</span>}
          </div>

          <div className="flex items-center gap-2 text-sm text-text-sub mb-3">
            <span>{recipe.category1}</span>
            {recipe.category2 && (
              <>
                <span>·</span>
                <span>{recipe.category2}</span>
              </>
            )}
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
            <span>·</span>
            <span>{recipe.servings}인분</span>
          </div>

          {recipe.description && (
            <p className="text-sm text-text-sub mb-4">{recipe.description}</p>
          )}

          {/* 좋아요/싫어요 */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm text-text-sub">
              ❤️ {recipe.like_count}
            </span>
            <span className="text-sm text-text-sub">
              👎 {recipe.dislike_count}
            </span>
          </div>

          {/* 재료 */}
          {ingredients.length > 0 && (
            <section className="mb-6">
              <h3 className="font-bold text-text mb-3">재료</h3>
              <div className="bg-surface border border-border rounded-xl p-4">
                {mainIngredients.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-text-sub font-semibold mb-2">
                      주재료
                    </p>
                    {mainIngredients.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between py-1.5 border-b border-border last:border-0 text-sm"
                      >
                        <span className="text-text">
                          {item.ingredient?.name}
                        </span>
                        <span className="text-text-sub">{item.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
                {subIngredients.length > 0 && (
                  <div>
                    <p className="text-xs text-text-sub font-semibold mb-2">
                      부재료
                    </p>
                    {subIngredients.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between py-1.5 border-b border-border last:border-0 text-sm"
                      >
                        <span className="text-text">
                          {item.ingredient?.name}
                        </span>
                        <span className="text-text-sub">{item.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 조리 단계 */}
          {stepsBySection.length > 0 && (
            <section className="mb-6">
              <h3 className="font-bold text-text mb-3">조리 순서</h3>
              {stepsBySection.map((group) => (
                <div key={group.section} className="mb-4">
                  <p className="text-sm font-semibold text-cta mb-2">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-3">
                    {group.steps.map((step) => (
                      <div
                        key={step.id}
                        className="bg-surface border border-border rounded-xl p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 w-6 h-6 bg-cta/10 text-cta text-xs font-bold rounded-full flex items-center justify-center">
                            {step.step_number}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm text-text">
                              {step.description}
                            </p>
                            {step.timer_seconds && (
                              <p className="text-xs text-cta mt-1">
                                ⏱️ {Math.floor(step.timer_seconds / 60)}분{" "}
                                {step.timer_seconds % 60 > 0 &&
                                  `${step.timer_seconds % 60}초`}
                              </p>
                            )}
                            {step.tip && (
                              <p className="text-xs text-text-sub mt-1 bg-base rounded px-2 py-1">
                                💡 {step.tip}
                              </p>
                            )}
                          </div>
                        </div>
                        {step.image_url && (
                          <img
                            src={step.image_url}
                            alt={`Step ${step.step_number}`}
                            className="w-full rounded-lg mt-3"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* 실험 시작 버튼 */}
          <Link
            href={`/experiment/${recipe.id}`}
            className="block w-full bg-cta text-white text-center font-semibold py-3.5 rounded-xl text-base shadow-lg active:scale-[0.98] transition-transform mb-4"
          >
            🔬 실험 시작
          </Link>
        </div>
      </main>
      <BottomTabBar />
    </>
  );
}
