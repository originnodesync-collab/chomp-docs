"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useWakeLock } from "@/hooks/useWakeLock";
import { SECTION_LABELS } from "@/lib/constants";
import ExperimentTimer from "@/components/ExperimentTimer";
import type { Recipe, RecipeStep, RecipeIngredient, Ingredient } from "@/types/database";

interface IngredientWithName extends RecipeIngredient {
  ingredient: Ingredient;
}

export default function ExperimentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // 화면 꺼짐 방지
  useWakeLock();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [allSteps, setAllSteps] = useState<RecipeStep[]>([]);
  const [ingredients, setIngredients] = useState<IngredientWithName[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
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
      if (stepsRes.data) setAllSteps(stepsRes.data);
      if (ingredientsRes.data) setIngredients(ingredientsRes.data as IngredientWithName[]);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <p className="text-text-sub">실험 준비 중...</p>
      </div>
    );
  }

  if (!recipe || allSteps.length === 0) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6">
        <p className="text-3xl mb-3">📭</p>
        <p className="text-text-sub mb-4">조리 단계가 없습니다</p>
        <button
          onClick={() => router.back()}
          className="text-cta text-sm font-semibold"
        >
          돌아가기
        </button>
      </div>
    );
  }

  // 완료 화면
  if (completed) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6">
        <div className="text-center">
          {/* 도장 애니메이션 — 코럴색 도장 찍히는 효과 */}
          <style>{`
            @keyframes stamp {
              0% { transform: scale(3) rotate(-20deg); opacity: 0; }
              50% { transform: scale(0.9) rotate(-12deg); opacity: 1; }
              70% { transform: scale(1.1) rotate(-10deg); }
              100% { transform: scale(1) rotate(-12deg); opacity: 1; }
            }
            .stamp-animation { animation: stamp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
          `}</style>
          <div className="relative inline-block mb-6 stamp-animation">
            <div className="w-36 h-36 border-[5px] border-cta rounded-full flex items-center justify-center bg-cta/5 rotate-[-12deg] shadow-lg"
              style={{ borderStyle: "double" }}>
              <span className="text-cta font-black text-2xl leading-tight text-center drop-shadow-sm">
                실험
                <br />
                성공!
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-text mb-2">
            {recipe.title}
          </h2>
          <p className="text-sm text-text-sub mb-8">
            모든 단계를 완료했습니다!
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <button
              onClick={() => router.push(`/photos/new?recipe_id=${id}`)}
              className="w-full bg-cta text-white font-semibold py-3 rounded-xl active:scale-[0.97] transition-transform"
            >
              📸 결과사진 올리기
            </button>
            <button
              onClick={() => router.push(`/recipe/${id}`)}
              className="w-full bg-surface border border-border text-text font-semibold py-3 rounded-xl active:scale-[0.97] transition-transform"
            >
              레시피로 돌아가기
            </button>
            <button
              onClick={() => router.push("/")}
              className="text-text-sub text-sm"
            >
              홈으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentStep = allSteps[currentIndex];
  const totalSteps = allSteps.length;

  // 현재 단계가 속한 구간과 다음 단계의 구간 비교 (구간 전환 감지용)
  const nextStep = currentIndex < totalSteps - 1 ? allSteps[currentIndex + 1] : null;
  const isSectionChange = nextStep && nextStep.section !== currentStep.section;

  // 진행바용 구간 구분선 위치 계산
  const sectionBreaks: number[] = [];
  for (let i = 1; i < allSteps.length; i++) {
    if (allSteps[i].section !== allSteps[i - 1].section) {
      sectionBreaks.push((i / totalSteps) * 100);
    }
  }

  const progressPercent = ((currentIndex + 1) / totalSteps) * 100;

  const goNext = async () => {
    if (currentIndex < totalSteps - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 마지막 단계 완료
      setCompleted(true);

      // experiment_logs에 기록 (로그인 유저만)
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dbUser } = await supabase
            .from("users")
            .select("id")
            .eq("auth_id", user.id)
            .single();
          if (dbUser) {
            await supabase.from("experiment_logs").insert({
              recipe_id: Number(id),
              user_id: dbUser.id,
            });
          }
        }
      } catch {
        // 비로그인이면 무시
      }
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* 상단바 */}
      <header className="sticky top-0 bg-base border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <button
              onClick={() => {
                if (confirm("실험을 중단하시겠습니까?")) router.back();
              }}
              className="text-text-sub text-sm"
            >
              ✕ 나가기
            </button>
            <span className="text-sm font-semibold text-cta">
              {SECTION_LABELS[currentStep.section] || currentStep.section}
            </span>
            <button
              onClick={() => setShowIngredients(!showIngredients)}
              className="text-text-sub text-sm"
            >
              🥕 재료
            </button>
          </div>

          {/* 진행바 */}
          <div className="relative w-full h-2 bg-border rounded-full mb-2">
            <div
              className="h-full bg-cta rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
            {/* 구간 구분선 */}
            {sectionBreaks.map((pos, i) => (
              <div
                key={i}
                className="absolute top-0 w-0.5 h-full bg-text-sub/40"
                style={{ left: `${pos}%` }}
              />
            ))}
          </div>
          <p className="text-xs text-text-sub text-center mb-2">
            {currentIndex + 1} / {totalSteps}
          </p>
        </div>
      </header>

      {/* 재료 오버레이 */}
      {showIngredients && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={() => setShowIngredients(false)}
        >
          <div
            className="w-full max-w-lg mx-auto bg-surface rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-text">전체 재료</h3>
              <button
                onClick={() => setShowIngredients(false)}
                className="text-text-sub"
              >
                ✕
              </button>
            </div>
            {ingredients.map((item) => (
              <div
                key={item.id}
                className="flex justify-between py-2 border-b border-border last:border-0 text-sm"
              >
                <span className="text-text">
                  {item.is_main && "⭐ "}
                  {item.ingredient?.name}
                </span>
                <span className="text-text-sub">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 본문 */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {/* 구간 전환 알림 */}
        {currentIndex > 0 &&
          allSteps[currentIndex].section !== allSteps[currentIndex - 1].section && (
            <div className="bg-cta/10 border border-cta/20 rounded-xl px-4 py-3 mb-4 text-center">
              <p className="text-sm font-semibold text-cta">
                📋 구간 전환: {SECTION_LABELS[currentStep.section]}
              </p>
            </div>
          )}

        {/* 단계 번호 */}
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 bg-cta text-white text-lg font-bold rounded-full flex items-center justify-center">
            {currentStep.step_number}
          </span>
          <span className="text-xs text-text-sub">
            {SECTION_LABELS[currentStep.section]}
          </span>
        </div>

        {/* 단계 설명 (큰 글씨) */}
        <p className="text-lg leading-relaxed text-text mb-4">
          {currentStep.description}
        </p>

        {/* 팁 */}
        {currentStep.tip && (
          <div className="bg-surface border border-border rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-text-sub">💡 {currentStep.tip}</p>
          </div>
        )}

        {/* 단계 이미지 */}
        {currentStep.image_url && (
          <img
            src={currentStep.image_url}
            alt={`Step ${currentStep.step_number}`}
            className="w-full rounded-xl mb-4"
          />
        )}

        {/* 타이머 */}
        {currentStep.timer_seconds && (
          <ExperimentTimer seconds={currentStep.timer_seconds} />
        )}
      </main>

      {/* 하단 네비게이션 */}
      <footer className="sticky bottom-0 bg-base border-t border-border z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-3">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="flex-1 bg-surface border border-border text-text font-semibold py-3 rounded-xl disabled:opacity-30 active:scale-[0.97] transition-transform"
          >
            ← 이전
          </button>
          <button
            onClick={goNext}
            className="flex-1 bg-cta text-white font-semibold py-3 rounded-xl active:scale-[0.97] transition-transform"
          >
            {currentIndex === totalSteps - 1 ? (
              "🎉 실험 완료!"
            ) : isSectionChange ? (
              <>다음 구간 →</>
            ) : (
              "다음 →"
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
