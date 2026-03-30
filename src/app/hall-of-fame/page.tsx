"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { createClient } from "@/lib/supabase/client";
import type { Recipe } from "@/types/database";

type Tab = "chomp" | "uk";
type Period = "weekly" | "monthly" | "alltime";

export default function HallOfFamePage() {
  const [tab, setTab] = useState<Tab>("chomp");
  const [period, setPeriod] = useState<Period>("alltime");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      setLoading(true);
      const supabase = createClient();

      let query = supabase.from("recipes").select("*");

      if (tab === "uk") {
        query = query.eq("is_uk_food", true).order("dislike_count", { ascending: false });
      } else {
        query = query.order("like_count", { ascending: false });
      }

      if (period === "weekly") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte("created_at", weekAgo.toISOString());
      } else if (period === "monthly") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte("created_at", monthAgo.toISOString());
      }

      const { data } = await query.limit(20);
      setRecipes(data || []);
      setLoading(false);
    }
    fetchRanking();
  }, [tab, period]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <>
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        {/* 탭: 쩝쩝 / 영국음식 */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("chomp")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === "chomp" ? "bg-cta text-white" : "bg-surface border border-border text-text-sub"}`}>
            🏆 쩝쩝 명예의 전당
          </button>
          <button onClick={() => setTab("uk")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === "uk" ? "bg-cta text-white" : "bg-surface border border-border text-text-sub"}`}>
            🇬🇧 영국음식 전당
          </button>
        </div>

        {/* 기간 필터 */}
        <div className="flex gap-2 mb-4">
          {([["weekly", "주간"], ["monthly", "월간"], ["alltime", "역대"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${period === key ? "bg-text text-base" : "bg-surface border border-border text-text-sub"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* 주간 보상 안내 */}
        <div className="bg-surface border border-border rounded-xl p-3 mb-4 text-xs text-text-sub">
          📢 매주 월요일 TOP5에 포인트 지급: 1위 50P / 2위 30P / 3위 20P / 4위 10P / 5위 5P
        </div>

        {/* 랭킹 리스트 */}
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-surface border border-border rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-border rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-text-sub text-sm">연구 데이터 없음</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {recipes.map((recipe, idx) => (
              <Link key={recipe.id} href={`/recipe/${recipe.id}`}
                className={`flex items-center px-4 py-3 hover:bg-base transition-colors ${idx < recipes.length - 1 ? "border-b border-border" : ""}`}>
                <span className="w-8 text-center font-bold text-sm">
                  {idx < 3 ? medals[idx] : idx + 1}
                </span>
                <div className="flex-1 ml-2">
                  <p className="text-sm font-medium text-text line-clamp-1">{recipe.title}</p>
                  <p className="text-xs text-text-sub">{recipe.category1}</p>
                </div>
                <span className="text-xs text-text-sub">
                  {tab === "uk" ? `👎 ${recipe.dislike_count}` : `❤️ ${recipe.like_count}`}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <BottomTabBar />
    </>
  );
}
