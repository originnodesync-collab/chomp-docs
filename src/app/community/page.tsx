"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { BOARD_CATEGORIES, BOARD_CATEGORY_LABELS, ACHIEVEMENTS } from "@/lib/constants";
import { useUser } from "@/hooks/useUser";

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

interface FeedItem {
  id: number;
  type: "recipe" | "post";
  title: string;
  image_url: string | null;
  created_at: string;
  author_nickname: string;
  author_id: number;
  author_active_title: string | null;
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
  const router = useRouter();
  const { user } = useUser();

  // 메인 탭: 게시판 | 피드
  const [mainTab, setMainTab] = useState<"board" | "feed">("board");

  // 게시판 상태
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [category, setCategory] = useState("전체");
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // 피드 상태
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(false);

  const fetchPosts = useCallback(async (reset = false) => {
    setLoadingPosts(true);
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
    setLoadingPosts(false);
  }, [category, sort, page]);

  const fetchFeed = useCallback(async (reset = false) => {
    if (!user) return;
    setLoadingFeed(true);
    const currentPage = reset ? 1 : feedPage;
    const res = await fetch(`/api/feed?page=${currentPage}`);
    if (!res.ok) {
      setLoadingFeed(false);
      return;
    }
    const data = await res.json();
    if (reset) {
      setFeedItems(data.items || []);
      setFeedPage(1);
    } else {
      setFeedItems((prev) => [...prev, ...(data.items || [])]);
    }
    setFeedHasMore(data.hasMore || false);
    setLoadingFeed(false);
  }, [user, feedPage]);

  useEffect(() => {
    fetchPosts(true);
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort]);

  useEffect(() => {
    if (mainTab === "feed") {
      fetchFeed(true);
      setFeedPage(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, user]);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text">🏛️ 요리연구학회</h2>
          {mainTab === "board" && (
            <Link
              href="/community/new"
              className="bg-cta text-white text-xs px-4 py-2 rounded-full font-semibold active:scale-[0.97] transition-transform"
            >
              글쓰기
            </Link>
          )}
        </div>

        {/* 메인 탭: 게시판 | 피드 */}
        <div className="flex gap-1 mb-4 bg-surface border border-border rounded-xl p-1">
          <button
            onClick={() => setMainTab("board")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mainTab === "board" ? "bg-cta text-white" : "text-text-sub hover:text-text"
            }`}
          >
            📋 게시판
          </button>
          <button
            onClick={() => setMainTab("feed")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mainTab === "feed" ? "bg-cta text-white" : "text-text-sub hover:text-text"
            }`}
          >
            📡 팔로잉 피드
          </button>
        </div>

        {/* ── 게시판 탭 ── */}
        {mainTab === "board" && (
          <>
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
                    sort === s ? "text-cta font-semibold" : "text-text-sub"
                  }`}
                >
                  {s === "latest" ? "최신순" : "인기순"}
                </button>
              ))}
            </div>

            {/* 게시글 목록 */}
            {loadingPosts && posts.length === 0 ? (
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
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs bg-cta/10 text-cta px-2 py-0.5 rounded-full font-semibold">
                        {BOARD_CATEGORY_LABELS[post.category] || post.category}
                      </span>
                      <span className="text-xs text-text-sub">{formatTime(post.created_at)}</span>
                    </div>
                    <p className="text-sm font-semibold text-text mb-1 line-clamp-2">{post.title}</p>
                    <p className="text-xs text-text-sub line-clamp-1 mb-2">{post.content}</p>
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

                {hasMore && (
                  <button
                    onClick={() => {
                      setPage((p) => p + 1);
                      fetchPosts(false);
                    }}
                    disabled={loadingPosts}
                    className="w-full py-3 text-sm text-text-sub hover:text-cta transition-colors disabled:opacity-40"
                  >
                    {loadingPosts ? "불러오는 중..." : "더 보기"}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── 피드 탭 ── */}
        {mainTab === "feed" && (
          <>
            {!user ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">📡</p>
                <p className="text-text-sub text-sm mb-4">로그인하면 팔로잉 피드를 볼 수 있어요</p>
                <button
                  onClick={() => router.push("/auth/login")}
                  className="bg-cta text-white px-6 py-2 rounded-xl text-sm font-semibold"
                >
                  로그인하기
                </button>
              </div>
            ) : loadingFeed && feedItems.length === 0 ? (
              <div className="flex flex-col gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-surface border border-border rounded-xl p-4 h-16" />
                ))}
              </div>
            ) : feedItems.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">📡</p>
                <p className="text-text-sub text-sm">팔로잉한 유저의 활동이 없습니다</p>
                <p className="text-text-sub text-xs mt-1">게시글 작성자를 팔로우해보세요!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {feedItems.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.type === "recipe" ? `/recipe/${item.id}` : `/community/${item.id}`}
                    className="block bg-surface border border-border rounded-xl p-4 hover:border-cta/30 transition-colors active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        item.type === "recipe"
                          ? "bg-green-50 text-green-600"
                          : "bg-cta/10 text-cta"
                      }`}>
                        {item.type === "recipe" ? "🍳 레시피" : "📋 게시글"}
                      </span>
                      <span className="text-xs text-text-sub">{formatTime(item.created_at)}</span>
                    </div>
                    <p className="text-sm font-semibold text-text mb-1 line-clamp-2">{item.title}</p>
                    <span className="text-xs text-text-sub">
                      {item.author_active_title && (
                        <span className="text-cta mr-1">
                          [{ACHIEVEMENTS[item.author_active_title as keyof typeof ACHIEVEMENTS]?.title || item.author_active_title}]
                        </span>
                      )}
                      {item.author_nickname}
                    </span>
                  </Link>
                ))}

                {feedHasMore && (
                  <button
                    onClick={() => {
                      setFeedPage((p) => p + 1);
                      fetchFeed(false);
                    }}
                    disabled={loadingFeed}
                    className="w-full py-3 text-sm text-text-sub hover:text-cta transition-colors disabled:opacity-40"
                  >
                    {loadingFeed ? "불러오는 중..." : "더 보기"}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <BottomTabBar />
    </>
  );
}
