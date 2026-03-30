"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import type { Recipe } from "@/types/database";

export default function MyRecipesPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [saved, setSaved] = useState<Recipe[]>([]);
  const [tab, setTab] = useState<"mine" | "saved">("mine");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const supabase = createClient();

      const [myRes, savedRes] = await Promise.all([
        supabase.from("recipes").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
        supabase.from("user_saved_recipes").select("recipe:recipes(*)").eq("user_id", user!.id).order("created_at", { ascending: false }),
      ]);

      setRecipes(myRes.data || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSaved(savedRes.data?.map((s: any) => s.recipe).filter(Boolean) as Recipe[] || []);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  if (userLoading) return null;
  if (!user) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-3xl mb-3">🔒</p>
            <p className="text-text-sub mb-4">로그인이 필요합니다</p>
            <button onClick={() => router.push("/auth/login")} className="bg-cta text-white px-6 py-2 rounded-xl text-sm font-semibold">로그인하기</button>
          </div>
        </main>
        <BottomTabBar />
      </>
    );
  }

  const displayRecipes = tab === "mine" ? recipes : saved;

  return (
    <>
      <Header level={user.level} />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("mine")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${tab === "mine" ? "bg-cta text-white" : "bg-surface border border-border text-text-sub"}`}>
            내가 등록한 레시피
          </button>
          <button onClick={() => setTab("saved")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${tab === "saved" ? "bg-cta text-white" : "bg-surface border border-border text-text-sub"}`}>
            저장한 레시피
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse flex flex-col gap-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-surface border border-border rounded-xl" />)}
          </div>
        ) : displayRecipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-text-sub text-sm">
              {tab === "mine" ? "등록한 레시피가 없습니다" : "저장한 레시피가 없습니다"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayRecipes.map(recipe => (
              <Link key={recipe.id} href={`/recipe/${recipe.id}`}
                className="block bg-surface border border-border rounded-xl p-4 hover:border-cta/30 transition-colors">
                <p className="font-semibold text-sm text-text mb-1">{recipe.title}</p>
                <div className="flex items-center gap-2 text-xs text-text-sub">
                  <span>{recipe.category1}</span>
                  <span>·</span>
                  <span>❤️ {recipe.like_count}</span>
                  {recipe.is_uk_food && <span>🇬🇧</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <BottomTabBar />
    </>
  );
}
