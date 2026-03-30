"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleOAuthLogin = async (provider: "google" | "kakao") => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text text-center mb-1">
          쩝쩝박사들의 연구노트
        </h1>
        <p className="text-sm text-text-sub text-center mb-8">
          로그인하고 실험을 시작하세요
        </p>

        {/* 소셜 로그인 */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={() => handleOAuthLogin("google")}
            className="w-full flex items-center justify-center gap-2 bg-white border border-border py-3 rounded-xl text-sm font-semibold text-text hover:bg-surface transition-colors"
          >
            <span>🔵</span> Google로 로그인
          </button>
          <button
            onClick={() => handleOAuthLogin("kakao")}
            className="w-full flex items-center justify-center gap-2 bg-[#FEE500] py-3 rounded-xl text-sm font-semibold text-[#191919] hover:bg-[#FDD835] transition-colors"
          >
            <span>💬</span> 카카오로 로그인
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-sub">또는</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* 이메일 로그인 */}
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            required
            className="bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            className="bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cta text-white font-semibold py-3 rounded-xl disabled:opacity-50 active:scale-[0.97] transition-transform"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-sm text-text-sub mt-6">
          아직 계정이 없나요?{" "}
          <Link href="/auth/signup" className="text-cta font-semibold">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
