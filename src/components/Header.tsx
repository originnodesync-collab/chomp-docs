"use client";

import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { LEVELS } from "@/lib/constants";

export default function Header() {
  const { user, loading } = useUser();
  const levelInfo = user ? (LEVELS[user.level - 1] || LEVELS[0]) : LEVELS[0];

  return (
    <header className="sticky top-0 bg-base border-b border-border z-40">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
        <Link href="/" className="text-lg font-bold text-text">
          쩝쩝박사들의 연구노트
        </Link>
        {loading ? (
          <div className="w-20 h-8 bg-border/30 rounded-full animate-pulse" />
        ) : user ? (
          <Link href="/mypage" className="flex items-center gap-1.5 bg-surface border border-border rounded-full px-3 py-1">
            <span className="text-sm">{levelInfo.name}</span>
          </Link>
        ) : (
          <Link href="/auth/login" className="bg-cta text-white text-sm font-semibold px-4 py-1.5 rounded-full">
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
