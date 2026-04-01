"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { BOARD_CATEGORIES, BOARD_CATEGORY_LABELS } from "@/lib/constants";
import { ACHIEVEMENTS } from "@/lib/constants";

interface PostUser {
  id: number;
  nickname: string;
  active_title: string | null;
}

interface Post {
  id: number;
  category: string;
  title: string;
  content: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  user: PostUser | null;
}

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("전체");
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchPosts = useCallback(async (reset = false) => {
    setLoading(true);
    const currentPage = reset ? 1 : page;
    const res = await fetch(
      `/api/posts?category=${encodeURIComponent(category)}&sort=${sort}&page=${currentPage}`
    );
    const data = await res.json();
    if (reset) {
      setPosts(data.posts || []);
      setPage(1);
    } else {
      setPosts((prev) => [...prev, ...(data.posts || [])]);
    }
    setHasMore(data.hasMore || false);
    setLoading(false);
  }, [category, sort, page]);

  useEffect(() => {
    fetchPosts(true);
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort]);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text">🏛️ 요리연구학회</h2>
          <Link
            href="/community/new"
            className="bg-cta text-white text-xs px-4 py-2 rounded-full font-semibold active:scale-[0.97] transition-transform"
          >
            글쓰기
          </Link>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          {["전체", ...BOARD_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                category === cat
                  ? "bg-cta text-white"
                  : "bg-surface border border-border text-text-sub"
              }`}
            >
              {cat === "전체" ? "전체" : BOARD_CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        {/* 정렬 */}
        <div className="flex gap-2 mb-4">
          {(["latest", "popular"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                sort === s
                  ? "text-cta font-semibold"
                  : "text-text-sub"
              }`}
            >
              {s === "latest" ? "최신순" : "인기순"}
            </button>
          ))}
        </div>

        {/* 게시글 목록 */}
        {loading && posts.length === 0 ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-surface border border-border rounded-xl p-4 h-20" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-text-sub text-sm">아직 게시글이 없습니다</p>
            <p className="text-text-sub text-xs mt-1">첫 글을 올려보세요!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="block bg-surface border border-border rounded-xl p-4 hover:border-cta/30 transition-colors active:scale-[0.99]"
              >
                {/* 카테고리 + 시간 */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs bg-cta/10 text-cta px-2 py-0.5 rounded-full font-semibold">
                    {BOARD_CATEGORY_LABELS[post.category] || post.category}
                  </span>
                  <span className="text-xs text-text-sub">{formatTime(post.created_at)}</span>
                </div>

                {/* 제목 */}
                <p className="text-sm font-semibold text-text mb-1 line-clamp-2">
                  {post.title}
                </p>

                {/* 미리보기 */}
                <p className="text-xs text-text-sub line-clamp-1 mb-2">
                  {post.content}
                </p>

                {/* 작성자 + 통계 */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-sub">
                    {post.user?.active_title && (
                      <span className="text-cta mr-1">
                        [{ACHIEVEMENTS[post.user.active_title as keyof typeof ACHIEVEMENTS]?.title || post.user.active_title}]
                      </span>
                    )}
                    {post.user?.nickname || "탈퇴한 유저"}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-text-sub">
                    <span>❤️ {post.like_count}</span>
                    <span>💬 {post.comment_count}</span>
                    <span>👁️ {post.view_count}</span>
                  </div>
                </div>
              </Link>
            ))}

            {/* 더 보기 */}
            {hasMore && (
              <button
                onClick={() => {
                  setPage((p) => p + 1);
                  fetchPosts(false);
                }}
                disabled={loading}
                className="w-full py-3 text-sm text-text-sub hover:text-cta transition-colors disabled:opacity-40"
              >
                {loading ? "불러오는 중..." : "더 보기"}
              </button>
            )}
          </div>
        )}
      </main>
      <BottomTabBar />
    </>
  );
}
