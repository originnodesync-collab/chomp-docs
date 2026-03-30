"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (nickname.trim().length < 2) {
      setError("닉네임은 2자 이상이어야 합니다");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // 1. Supabase Auth 회원가입
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      console.error("Signup error:", authError);
      if (authError.message === "User already registered") {
        setError("이미 가입된 이메일입니다");
      } else if (authError.message.includes("email")) {
        setError("유효하지 않은 이메일 주소입니다");
      } else {
        setError(`회원가입 실패: ${authError.message}`);
      }
      setLoading(false);
      return;
    }

    // 2. users 테이블에 프로필 생성
    if (authData.user) {
      const { error: profileError } = await supabase.from("users").insert({
        auth_id: authData.user.id,
        email,
        nickname: nickname.trim(),
      });

      if (profileError) {
        setError("프로필 생성에 실패했습니다: " + profileError.message);
        setLoading(false);
        return;
      }
    }

    // 세션이 확실히 설정될 때까지 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text text-center mb-1">
          회원가입
        </h1>
        <p className="text-sm text-text-sub text-center mb-8">
          쩝쩝박사가 되어보세요
        </p>

        <form onSubmit={handleSignup} className="flex flex-col gap-3">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임 (2자 이상)"
            required
            className="bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta"
          />
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
            placeholder="비밀번호 (6자 이상)"
            required
            className="bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cta text-white font-semibold py-3 rounded-xl disabled:opacity-50 active:scale-[0.97] transition-transform"
          >
            {loading ? "가입 중..." : "가입하기"}
          </button>
        </form>

        <p className="text-center text-sm text-text-sub mt-6">
          이미 계정이 있나요?{" "}
          <Link href="/auth/login" className="text-cta font-semibold">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
