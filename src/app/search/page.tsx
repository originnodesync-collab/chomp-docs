"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/cook/results?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-6 pb-24">
        <h2 className="text-xl font-bold text-text mb-4">검색</h2>
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="요리명, 재료로 검색"
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta" />
          <button type="submit" disabled={!query.trim()}
            className="bg-cta text-white px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-40">
            검색
          </button>
        </form>

        <div>
          <p className="text-sm font-semibold text-text mb-3">빠른 찾기</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "🥕 재료로 찾기", href: "/cook/by-ingredient" },
              { label: "🔍 요리명으로 찾기", href: "/cook/by-name" },
            ].map(item => (
              <button key={item.href} onClick={() => router.push(item.href)}
                className="bg-surface border border-border rounded-xl p-3 text-sm text-text hover:border-cta/30 transition-colors">
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </main>
      <BottomTabBar />
    </>
  );
}
