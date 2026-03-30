"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";

export default function ByNamePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const params = new URLSearchParams();
    params.set("q", query.trim());
    router.push(`/cook/results?${params.toString()}`);
  };

  return (
    <>
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-6 pb-24">
        <h2 className="text-xl font-bold text-text mb-1">요리명으로 찾기</h2>
        <p className="text-sm text-text-sub mb-6">
          먹고 싶은 요리 이름을 검색해보세요
        </p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 김치찌개, 제육볶음"
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="bg-cta text-white px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-[0.97] transition-transform"
          >
            검색
          </button>
        </form>

        {/* 인기 검색어 (임시) */}
        <div className="mt-8">
          <p className="text-sm font-semibold text-text mb-3">인기 검색어</p>
          <div className="flex flex-wrap gap-2">
            {["김치찌개", "제육볶음", "된장찌개", "계란말이", "불고기", "떡볶이", "비빔밥", "잡채"].map(
              (keyword) => (
                <button
                  key={keyword}
                  onClick={() => {
                    setQuery(keyword);
                    const params = new URLSearchParams();
                    params.set("q", keyword);
                    router.push(`/cook/results?${params.toString()}`);
                  }}
                  className="bg-surface border border-border px-3 py-1.5 rounded-full text-sm text-text-sub hover:border-cta/40 transition-colors"
                >
                  {keyword}
                </button>
              )
            )}
          </div>
        </div>
      </main>
      <BottomTabBar />
    </>
  );
}
