"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { BOARD_CATEGORY_LABELS, ACHIEVEMENTS } from "@/lib/constants";
import { fetchWithAuth } from "@/lib/api";
import { useUser } from "@/hooks/useUser";

interface PostUser {
  id: number;
  nickname: string;
  active_title: string | null;
}

interface PostComment {
  id: number;
  content: string;
  created_at: string;
  parent_id: number | null;
  user: PostUser | null;
  replies?: PostComment[];
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

export default function CommunityPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; nickname: string } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadPost = useCallback(async () => {
    const res = await fetch(`/api/posts/${id}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPost(data.post);
    setLikeCount(data.post.like_count);
    setLoading(false);
  }, [id]);

  const loadComments = useCallback(async () => {
    const res = await fetch(`/api/posts/${id}/comments`);
    const data = await res.json();
    setComments(data.comments || []);
  }, [id]);

  const loadFollowStatus = useCallback(async (authorId: number) => {
    const res = await fetch(`/api/users/${authorId}/follow`);
    const data = await res.json();
    setIsFollowing(data.is_following || false);
    setFollowerCount(data.follower_count || 0);
  }, []);

  useEffect(() => {
    loadPost();
    loadComments();
  }, [loadPost, loadComments]);

  // 게시글 로드 후 작성자 팔로우 상태 확인
  useEffect(() => {
    if (post?.user?.id) {
      loadFollowStatus(post.user.id);
    }
  }, [post?.user?.id, loadFollowStatus]);

  const handleFollow = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!post?.user?.id) return;
    const res = await fetchWithAuth(`/api/users/${post.user.id}/follow`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setIsFollowing(data.action === "followed");
      setFollowerCount(data.follower_count);
    }
  };

  const handleLike = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    const res = await fetchWithAuth(`/api/posts/${id}/like`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setLiked(data.action === "liked");
      setLikeCount(data.like_count);
    }
  };

  const handleDelete = async () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    setDeleting(true);
    const res = await fetchWithAuth(`/api/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/community");
    } else {
      setDeleting(false);
    }
  };

  const handleReport = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!confirm("이 게시글을 신고하시겠습니까?")) return;
    await fetchWithAuth("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_type: "post", target_id: parseInt(id) }),
    });
    alert("신고가 접수되었습니다.");
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    const res = await fetchWithAuth(`/api/posts/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: newComment.trim(),
        parent_id: replyTo?.id ?? null,
      }),
    });

    if (res.ok) {
      setNewComment("");
      setReplyTo(null);
      await loadComments();
      if (post) setPost({ ...post, comment_count: post.comment_count + 1 });
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    const res = await fetchWithAuth(`/api/posts/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) {
      await loadComments();
      if (post) setPost({ ...post, comment_count: Math.max(0, post.comment_count - 1) });
    }
  };

  const handleReportComment = async (commentId: number) => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!confirm("이 댓글을 신고하시겠습니까?")) return;
    await fetchWithAuth("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_type: "post_comment", target_id: commentId }),
    });
    alert("신고가 접수되었습니다.");
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-surface border border-border rounded-xl w-2/3" />
            <div className="h-40 bg-surface border border-border rounded-xl" />
          </div>
        </main>
        <BottomTabBar />
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Header />
        <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24 flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-text-sub text-sm">게시글을 찾을 수 없습니다</p>
            <button
              onClick={() => router.push("/community")}
              className="mt-4 text-cta text-sm font-semibold"
            >
              목록으로 돌아가기
            </button>
          </div>
        </main>
        <BottomTabBar />
      </>
    );
  }

  const isOwner = user && post.user && user.id === post.user.id;

  return (
    <>
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        {/* 뒤로가기 */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="text-text-sub hover:text-text transition-colors"
          >
            ←
          </button>
          <span className="text-sm text-text-sub">요리연구학회</span>
        </div>

        {/* 게시글 */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-4">
          {/* 카테고리 + 시간 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-cta/10 text-cta px-2 py-0.5 rounded-full font-semibold">
              {BOARD_CATEGORY_LABELS[post.category] || post.category}
            </span>
            <span className="text-xs text-text-sub">{formatTime(post.created_at)}</span>
          </div>

          {/* 제목 */}
          <h1 className="text-lg font-bold text-text mb-3">{post.title}</h1>

          {/* 작성자 */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-sub">
                {post.user?.active_title && (
                  <span className="text-cta mr-1">
                    [{ACHIEVEMENTS[post.user.active_title as keyof typeof ACHIEVEMENTS]?.title || post.user.active_title}]
                  </span>
                )}
                {post.user?.nickname || "탈퇴한 유저"}
              </span>
              {post.user && !isOwner && (
                <button
                  onClick={handleFollow}
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
                    isFollowing
                      ? "bg-surface border border-border text-text-sub"
                      : "bg-cta/10 text-cta border border-cta/20"
                  }`}
                >
                  {isFollowing ? `팔로잉 ${followerCount}` : `+ 팔로우 ${followerCount}`}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-text-sub">
              <span>👁️ {post.view_count}</span>
              <span>💬 {post.comment_count}</span>
            </div>
          </div>

          {/* 본문 */}
          <p className="text-sm text-text whitespace-pre-wrap leading-relaxed mb-4">
            {post.content}
          </p>

          {/* 액션 버튼 */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                liked
                  ? "bg-red-50 text-red-500 border border-red-200"
                  : "bg-surface border border-border text-text-sub hover:border-cta/30"
              }`}
            >
              ❤️ {likeCount}
            </button>

            <div className="flex items-center gap-2">
              {!isOwner && (
                <button
                  onClick={handleReport}
                  className="text-xs text-text-sub hover:text-red-400 transition-colors px-2 py-1"
                >
                  신고
                </button>
              )}
              {isOwner && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 disabled:opacity-40"
                >
                  {deleting ? "삭제 중..." : "삭제"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="text-sm font-bold text-text mb-4">댓글 {post.comment_count}개</h2>

          {/* 댓글 목록 */}
          {comments.length === 0 ? (
            <p className="text-xs text-text-sub text-center py-6">
              첫 댓글을 남겨보세요!
            </p>
          ) : (
            <div className="flex flex-col gap-4 mb-4">
              {comments.map((comment) => (
                <div key={comment.id}>
                  {/* 댓글 */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-text">
                          {comment.user?.active_title && (
                            <span className="text-cta mr-1">
                              [{ACHIEVEMENTS[comment.user.active_title as keyof typeof ACHIEVEMENTS]?.title || comment.user.active_title}]
                            </span>
                          )}
                          {comment.user?.nickname || "탈퇴한 유저"}
                        </span>
                        <span className="text-xs text-text-sub">{formatTime(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-text whitespace-pre-wrap">{comment.content}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {user && (
                          <button
                            onClick={() => setReplyTo({ id: comment.id, nickname: comment.user?.nickname || "유저" })}
                            className="text-xs text-text-sub hover:text-cta transition-colors"
                          >
                            답글
                          </button>
                        )}
                        {user && comment.user && user.id === comment.user.id ? (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            삭제
                          </button>
                        ) : user ? (
                          <button
                            onClick={() => handleReportComment(comment.id)}
                            className="text-xs text-text-sub hover:text-red-400 transition-colors"
                          >
                            신고
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* 대댓글 */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-4 mt-2 flex flex-col gap-3 pl-3 border-l-2 border-border">
                      {comment.replies.map((reply) => (
                        <div key={reply.id}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-text-sub">↪</span>
                            <span className="text-xs font-semibold text-text">
                              {reply.user?.active_title && (
                                <span className="text-cta mr-1">
                                  [{ACHIEVEMENTS[reply.user.active_title as keyof typeof ACHIEVEMENTS]?.title || reply.user.active_title}]
                                </span>
                              )}
                              {reply.user?.nickname || "탈퇴한 유저"}
                            </span>
                            <span className="text-xs text-text-sub">{formatTime(reply.created_at)}</span>
                          </div>
                          <p className="text-sm text-text whitespace-pre-wrap ml-4">{reply.content}</p>
                          <div className="flex items-center gap-3 mt-1 ml-4">
                            {user && reply.user && user.id === reply.user.id ? (
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors"
                              >
                                삭제
                              </button>
                            ) : user ? (
                              <button
                                onClick={() => handleReportComment(reply.id)}
                                className="text-xs text-text-sub hover:text-red-400 transition-colors"
                              >
                                신고
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 답글 대상 표시 */}
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 bg-cta/5 border border-cta/20 rounded-lg px-3 py-2">
              <span className="text-xs text-text-sub">↪ {replyTo.nickname}에게 답글</span>
              <button
                onClick={() => setReplyTo(null)}
                className="ml-auto text-xs text-text-sub hover:text-text"
              >
                ✕
              </button>
            </div>
          )}

          {/* 댓글 입력 */}
          {user ? (
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyTo ? `${replyTo.nickname}에게 답글...` : "댓글을 입력하세요"}
                maxLength={500}
                className="flex-1 bg-base border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta"
              />
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="bg-cta text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform whitespace-nowrap"
              >
                {submittingComment ? "..." : "등록"}
              </button>
            </form>
          ) : (
            <button
              onClick={() => router.push("/auth/login")}
              className="w-full py-3 text-sm text-text-sub border border-border rounded-xl hover:border-cta/30 transition-colors"
            >
              로그인 후 댓글을 남겨보세요
            </button>
          )}
        </div>
      </main>
      <BottomTabBar />
    </>
  );
}
