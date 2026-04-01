"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api";
import { ACHIEVEMENTS } from "@/lib/constants";

interface CommentUser {
  id: number;
  nickname: string;
  active_title: string | null;
  profile_image_url: string | null;
}

interface Reply {
  id: number;
  content: string;
  created_at: string;
  parent_id: number;
  user: CommentUser | null;
}

interface ThreadedComment {
  id: number;
  content: string;
  created_at: string;
  parent_id: null;
  user: CommentUser | null;
  replies: Reply[];
}

interface CommentThreadProps {
  recipeId: number;
  currentUserId?: number | null;
  onRequireLogin: () => void;
}

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function NicknameWithTitle({ user }: { user: CommentUser | null }) {
  if (!user) return <span className="text-text-sub text-xs">탈퇴한 유저</span>;
  return (
    <span className="text-xs font-semibold text-text">
      {user.active_title && (
        <span className="text-cta mr-1">
          [{ACHIEVEMENTS[user.active_title as keyof typeof ACHIEVEMENTS]?.title || user.active_title}]
        </span>
      )}
      {user.nickname}
    </span>
  );
}

export default function CommentThread({ recipeId, currentUserId, onRequireLogin }: CommentThreadProps) {
  const [comments, setComments] = useState<ThreadedComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; nickname: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    const res = await fetch(`/api/comments?recipe_id=${recipeId}`);
    const data = await res.json();
    setComments(data.comments || []);
    setLoaded(true);
  }, [recipeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadComments();
  }, [loadComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) { onRequireLogin(); return; }
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);

    const res = await fetchWithAuth("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe_id: recipeId, content: newComment.trim() }),
    });

    if (res.ok) {
      setNewComment("");
      await loadComments();
    }
    setSubmitting(false);
  }

  async function handleReplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) { onRequireLogin(); return; }
    if (!replyTo || !replyText.trim() || submitting) return;
    setSubmitting(true);

    const res = await fetchWithAuth("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipe_id: recipeId,
        content: replyText.trim(),
        parent_id: replyTo.id,
      }),
    });

    if (res.ok) {
      setReplyTo(null);
      setReplyText("");
      await loadComments();
    }
    setSubmitting(false);
  }

  if (!loaded) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-text mb-3">
        댓글 {comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)}개
      </h3>

      {/* 댓글 작성 */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-5">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={currentUserId ? "댓글을 남겨보세요 (300자 이내)" : "로그인 후 댓글을 작성할 수 있어요"}
          onClick={() => { if (!currentUserId) onRequireLogin(); }}
          readOnly={!currentUserId}
          maxLength={300}
          className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cta"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className="bg-cta text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
        >
          등록
        </button>
      </form>

      {/* 댓글 목록 */}
      {comments.length === 0 ? (
        <p className="text-center text-text-sub text-sm py-6">첫 댓글을 남겨보세요!</p>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              {/* 원댓글 */}
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-xs shrink-0">
                  👤
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <NicknameWithTitle user={comment.user} />
                    <span className="text-xs text-text-sub">{formatTime(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-text leading-relaxed">{comment.content}</p>
                  <button
                    onClick={() => {
                      if (!currentUserId) { onRequireLogin(); return; }
                      setReplyTo(replyTo?.id === comment.id ? null : { id: comment.id, nickname: comment.user?.nickname || "" });
                      setReplyText("");
                    }}
                    className="text-xs text-text-sub mt-1 hover:text-cta transition-colors"
                  >
                    답글 달기
                  </button>
                </div>
              </div>

              {/* 대댓글 목록 */}
              {comment.replies.length > 0 && (
                <div className="ml-9 mt-2 flex flex-col gap-3 border-l-2 border-border pl-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-border flex items-center justify-center text-xs shrink-0">
                        👤
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <NicknameWithTitle user={reply.user} />
                          <span className="text-xs text-text-sub">{formatTime(reply.created_at)}</span>
                        </div>
                        <p className="text-sm text-text leading-relaxed">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 대댓글 작성 폼 */}
              {replyTo?.id === comment.id && (
                <form onSubmit={handleReplySubmit} className="ml-9 mt-2 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`@${replyTo.nickname}에게 답글`}
                    maxLength={300}
                    autoFocus
                    className="flex-1 bg-surface border border-cta/40 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-cta"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || submitting}
                    className="bg-cta text-white px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40"
                  >
                    등록
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-text-sub text-xs px-2"
                  >
                    취소
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
