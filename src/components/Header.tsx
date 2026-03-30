"use client";

import { LEVELS } from "@/lib/constants";

interface HeaderProps {
  level?: number;
}

export default function Header({ level = 1 }: HeaderProps) {
  const levelInfo = LEVELS[level - 1] || LEVELS[0];

  return (
    <header className="sticky top-0 bg-base border-b border-border z-40">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
        <h1 className="text-lg font-bold text-text">
          쩝쩝박사들의 연구노트
        </h1>
        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-full px-3 py-1">
          <span className="text-sm">{levelInfo.name}</span>
        </div>
      </div>
    </header>
  );
}
