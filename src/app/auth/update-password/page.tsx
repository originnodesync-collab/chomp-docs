"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.");
      setLoading(false);
      return;
    }

    router.push("/mypage");
  };

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text text-center mb-1">새 비밀번호 설정</h1>
        <p className="text-sm text-text-sub text-center mb-8">
          새로운 비밀번호를 입력해주세요
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="새 비밀번호 (6자 이상)"
            required
            minLength={6}
            className="bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="비밀번호 확인"
            required
            className="bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cta text-white font-semibold py-3 rounded-xl disabled:opacity-50 active:scale-[0.97] transition-transform"
          >
            {loading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </div>
  );
}
