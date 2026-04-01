"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { BOARD_CATEGORIES, BOARD_CATEGORY_LABELS } from "@/lib/constants";
import { fetchWithAuth } from "@/lib/api";
import { useUser } from "@/hooks/useUser";

export default function CommunityNewPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [category, setCategory] = useState<string>(BOARD_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (loading) return null;

  if (!user) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-3xl mb-3">🔒</p>
            <p className="text-text-sub mb-4">로그인이 필요합니다</p>
            <button
              onClick={() => router.push("/auth/login")}
              className="bg-cta text-white px-6 py-2 rounded-xl text-sm font-semibold"
            >
              로그인하기
            </button>
          </div>
        </main>
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || title.trim().length < 2) {
      setError("제목은 2자 이상 입력해주세요");
      return;
    }
    if (!content.trim() || content.trim().length < 5) {
      setError("내용은 5자 이상 입력해주세요");
      return;
    }

    setSubmitting(true);

    const res = await fetchWithAuth("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, title: title.trim(), content: content.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "등록에 실패했습니다");
      setSubmitting(false);
      return;
    }

    router.push(`/community/${data.post.id}`);
  };

  return (
    <>
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="text-text-sub hover:text-text transition-colors"
          >
            ←
          </button>
          <h2 className="text-xl font-bold text-text">글쓰기</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 카테고리 */}
          <div>
            <label className="text-xs font-semibold text-text-sub mb-2 block">카테고리</label>
            <div className="flex gap-2 flex-wrap">
              {BOARD_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    category === cat
                      ? "bg-cta text-white"
                      : "bg-surface border border-border text-text-sub hover:border-cta/30"
                  }`}
                >
                  {BOARD_CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="text-xs font-semibold text-text-sub mb-2 block">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요 (2~100자)"
              maxLength={100}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta"
            />
            <p className="text-right text-xs text-text-sub mt-1">{title.length}/100</p>
          </div>

          {/* 내용 */}
          <div>
            <label className="text-xs font-semibold text-text-sub mb-2 block">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요 (5~5000자)"
              maxLength={5000}
              rows={10}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta resize-none"
            />
            <p className="text-right text-xs text-text-sub mt-1">{content.length}/5000</p>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim()}
            className="w-full bg-cta text-white font-semibold py-3.5 rounded-xl text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {submitting ? "등록 중..." : "게시글 올리기"}
          </button>
        </form>
      </main>
    </>
  );
}
