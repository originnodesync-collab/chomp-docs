"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { INVENTORY_CATEGORIES } from "@/lib/constants";

interface InventoryItem {
  id: number;
  category: string;
  ingredient: { id: number; name: string };
}

export default function FridgePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIngredient, setNewIngredient] = useState("");
  const [newCategory, setNewCategory] = useState("채소");

  useEffect(() => {
    if (!user) return;
    fetchItems();
  }, [user]);

  async function fetchItems() {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_inventory")
      .select("id, category, ingredient:ingredients(id, name)")
      .eq("user_id", user!.id)
      .order("category");
    setItems((data as unknown as InventoryItem[]) || []);
    setLoading(false);
  }

  const addItem = async () => {
    if (!newIngredient.trim() || !user) return;
    const supabase = createClient();

    // 재료 찾거나 생성
    let { data: existing } = await supabase
      .from("ingredients").select("id").eq("name", newIngredient.trim()).single();

    if (!existing) {
      const { data: created } = await supabase
        .from("ingredients").insert({ name: newIngredient.trim() }).select("id").single();
      existing = created;
    }

    if (existing) {
      await supabase.from("user_inventory").insert({
        user_id: user.id,
        ingredient_id: existing.id,
        category: newCategory,
      });
      setNewIngredient("");
      fetchItems();
    }
  };

  const removeItem = async (id: number) => {
    const supabase = createClient();
    await supabase.from("user_inventory").delete().eq("id", id);
    setItems(items.filter(i => i.id !== id));
  };

  const handleCookWithFridge = () => {
    const names = items.map(i => i.ingredient?.name).filter(Boolean);
    if (names.length === 0) return;
    router.push(`/cook/results?ingredients=${encodeURIComponent(names.join(","))}`);
  };

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

  // 카테고리별 그룹
  const grouped = INVENTORY_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  return (
    <>
      <Header level={user.level} />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text">🧊 냉장고</h2>
          {items.length > 0 && (
            <button onClick={handleCookWithFridge}
              className="bg-cta text-white text-xs px-3 py-1.5 rounded-full font-semibold">
              이 재료로 요리하기
            </button>
          )}
        </div>

        {/* 재료 추가 */}
        <div className="flex gap-2 mb-4">
          <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
            className="bg-surface border border-border rounded-lg px-2 py-2 text-sm w-24">
            {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="text" value={newIngredient} onChange={(e) => setNewIngredient(e.target.value)}
            placeholder="재료명" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cta" />
          <button onClick={addItem} disabled={!newIngredient.trim()}
            className="bg-cta text-white px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-40">
            추가
          </button>
        </div>

        {/* 냉장고 인벤토리 */}
        {loading ? (
          <div className="animate-pulse"><div className="h-40 bg-surface border border-border rounded-xl" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🧊</p>
            <p className="text-text-sub text-sm">냉장고가 비어있습니다</p>
            <p className="text-text-sub text-xs mt-1">재료를 추가해보세요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {INVENTORY_CATEGORIES.map(cat => {
              const catItems = grouped[cat];
              if (catItems.length === 0) return null;
              return (
                <div key={cat} className="bg-surface border border-border rounded-xl p-3">
                  <p className="text-xs font-semibold text-text-sub mb-2">{cat} ({catItems.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {catItems.map(item => (
                      <button key={item.id} onClick={() => removeItem(item.id)}
                        className="inline-flex items-center gap-1 bg-base border border-border text-sm px-3 py-1 rounded-full text-text hover:border-red-300 hover:text-red-500 transition-colors">
                        {item.ingredient?.name}
                        <span className="text-xs opacity-50">✕</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <BottomTabBar />
    </>
  );
}
