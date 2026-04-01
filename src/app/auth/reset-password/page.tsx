"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    if (error) {
      setError("이메일 전송에 실패했습니다. 이메일 주소를 확인해주세요.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text text-center mb-1">비밀번호 재설정</h1>
        <p className="text-sm text-text-sub text-center mb-8">
          가입한 이메일 주소를 입력하면 재설정 링크를 보내드립니다
        </p>

        {sent ? (
          <div className="bg-surface border border-border rounded-xl p-6 text-center">
            <p className="text-3xl mb-3">📬</p>
            <p className="font-semibold text-text mb-2">이메일을 확인해주세요</p>
            <p className="text-sm text-text-sub mb-4">
              <strong>{email}</strong>로 비밀번호 재설정 링크를 발송했습니다.
              메일이 오지 않으면 스팸함을 확인해주세요.
            </p>
            <Link
              href="/auth/login"
              className="text-sm text-cta font-semibold"
            >
              로그인 페이지로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소"
              required
              className="bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cta text-white font-semibold py-3 rounded-xl disabled:opacity-50 active:scale-[0.97] transition-transform"
            >
              {loading ? "전송 중..." : "재설정 링크 받기"}
            </button>
            <Link
              href="/auth/login"
              className="text-center text-sm text-text-sub hover:text-cta transition-colors"
            >
              ← 로그인으로 돌아가기
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
