"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { CATEGORY1_OPTIONS } from "@/lib/constants";

const QUICK_SEARCHES = [
  "김치찌개", "된장찌개", "불고기", "제육볶음",
  "계란후라이", "라면", "볶음밥", "비빔밥",
];

const CATEGORY_ICONS: Record<string, string> = {
  반찬: "🥗",
  "국&찌개": "🍲",
  일품: "🍱",
  후식: "🍮",
  기타: "🍽️",
};

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/cook/results?q=${encodeURIComponent(query.trim())}`);
  };

  const handleQuick = (term: string) => {
    router.push(`/cook/results?q=${encodeURIComponent(term)}`);
  };

  const handleCategory = (cat: string) => {
    router.push(`/cook/results?q=&category=${encodeURIComponent(cat)}`);
  };

  return (
    <>
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-6 pb-24">
        <h2 className="text-xl font-bold text-text mb-4">검색</h2>

        {/* 검색창 */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="요리명, 재료명으로 검색"
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="bg-cta text-white px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            검색
          </button>
        </form>

        {/* 빠른 찾기 */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-text mb-3">빠른 찾기</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "🥕 재료로 찾기", href: "/cook/by-ingredient" },
              { label: "🔍 요리명으로 찾기", href: "/cook/by-name" },
            ].map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="bg-surface border border-border rounded-xl p-3 text-sm text-text hover:border-cta/30 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 카테고리 탐색 */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-text mb-3">카테고리로 탐색</p>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY1_OPTIONS.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategory(cat)}
                className="bg-surface border border-border rounded-xl p-3 text-center hover:border-cta/30 transition-colors active:scale-[0.97]"
              >
                <p className="text-xl mb-1">{CATEGORY_ICONS[cat] || "🍽️"}</p>
                <p className="text-xs font-semibold text-text">{cat}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 빠른 검색어 */}
        <div>
          <p className="text-sm font-semibold text-text mb-3">인기 검색어</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => handleQuick(term)}
                className="px-3 py-1.5 bg-surface border border-border rounded-full text-sm text-text-sub hover:border-cta/30 hover:text-cta transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </main>
      <BottomTabBar />
    </>
  );
}
