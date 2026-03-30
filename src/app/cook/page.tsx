"use client";

import Link from "next/link";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";

export default function CookPage() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-6 pb-24">
        <h2 className="text-xl font-bold text-text mb-2">요리하러가기</h2>
        <p className="text-sm text-text-sub mb-8">
          어떤 방법으로 레시피를 찾을까요?
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/cook/by-ingredient"
            className="block bg-surface border border-border rounded-xl p-5 hover:border-cta/40 transition-all active:scale-[0.98]"
          >
            <span className="text-3xl block mb-3">🥕</span>
            <p className="font-semibold text-text text-lg">재료로 찾기</p>
            <p className="text-sm text-text-sub mt-1">
              냉장고에 있는 재료를 선택하면 만들 수 있는 레시피를 찾아드려요
            </p>
          </Link>

          <Link
            href="/cook/by-name"
            className="block bg-surface border border-border rounded-xl p-5 hover:border-cta/40 transition-all active:scale-[0.98]"
          >
            <span className="text-3xl block mb-3">🔍</span>
            <p className="font-semibold text-text text-lg">요리명으로 찾기</p>
            <p className="text-sm text-text-sub mt-1">
              먹고 싶은 요리 이름을 검색해서 레시피를 찾아보세요
            </p>
          </Link>
        </div>
      </main>
      <BottomTabBar />
    </>
  );
}
