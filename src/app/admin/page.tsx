"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { fetchWithAuth } from "@/lib/api";
import { useUser } from "@/hooks/useUser";

interface Report {
  id: number;
  reporter_id: number;
  target_type: string;
  target_id: number;
  status: string;
  created_at: string;
  reporter: { id: number; nickname: string } | null;
}

interface AdminUser {
  id: number;
  nickname: string;
  email: string;
  role: string;
  level: number;
  points: number;
  created_at: string;
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  recipe: "🍳 레시피",
  comment: "💬 댓글",
  photo: "📸 결과사진",
  post: "📋 게시글",
  post_comment: "💬 게시판댓글",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  const [tab, setTab] = useState<"reports" | "users">("reports");
  const [reportStatus, setReportStatus] = useState<"pending" | "hidden" | "dismissed">("pending");

  const [reports, setReports] = useState<Report[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [loadingReports, setLoadingReports] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    const res = await fetchWithAuth(`/api/admin/reports?status=${reportStatus}`);
    if (res.status === 403) {
      router.push("/");
      return;
    }
    const data = await res.json();
    setReports(data.reports || []);
    setReportTotal(data.total || 0);
    setLoadingReports(false);
  }, [reportStatus, router]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    const res = await fetchWithAuth(`/api/admin/users?q=${encodeURIComponent(userSearch)}`);
    if (res.status === 403) {
      router.push("/");
      return;
    }
    const data = await res.json();
    setUsers(data.users || []);
    setUserTotal(data.total || 0);
    setLoadingUsers(false);
  }, [userSearch, router]);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (tab === "reports") fetchReports();
  }, [tab, fetchReports]);

  useEffect(() => {
    if (tab === "users") fetchUsers();
  }, [tab, fetchUsers]);

  const handleReportAction = async (report: Report, status: "hidden" | "dismissed") => {
    await fetchWithAuth(`/api/admin/reports/${report.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        target_type: report.target_type,
        target_id: report.target_id,
      }),
    });
    fetchReports();
  };

  const handleRoleChange = async (userId: number, role: "user" | "admin") => {
    if (!confirm(`해당 유저의 role을 '${role}'으로 변경하시겠습니까?`)) return;
    await fetchWithAuth("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, role }),
    });
    fetchUsers();
  };

  if (loading) return null;

  return (
    <>
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-4 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-bold text-text">🛡️ 어드민</h2>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-surface border border-border rounded-xl p-1">
          <button
            onClick={() => setTab("reports")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "reports" ? "bg-cta text-white" : "text-text-sub hover:text-text"
            }`}
          >
            🚨 신고 관리
          </button>
          <button
            onClick={() => setTab("users")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "users" ? "bg-cta text-white" : "text-text-sub hover:text-text"
            }`}
          >
            👥 유저 관리
          </button>
        </div>

        {/* ── 신고 관리 ── */}
        {tab === "reports" && (
          <>
            <div className="flex gap-2 mb-4">
              {(["pending", "hidden", "dismissed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setReportStatus(s)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                    reportStatus === s
                      ? "bg-cta text-white"
                      : "bg-surface border border-border text-text-sub"
                  }`}
                >
                  {s === "pending" ? "대기" : s === "hidden" ? "숨김" : "기각"} ({reportStatus === s ? reportTotal : "?"})
                </button>
              ))}
            </div>

            {loadingReports ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-surface border border-border rounded-xl h-20" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">✅</p>
                <p className="text-text-sub text-sm">해당 신고가 없습니다</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-surface border border-border rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs font-semibold bg-red-50 text-red-500 px-2 py-0.5 rounded-full mr-2">
                          {TARGET_TYPE_LABELS[report.target_type] || report.target_type}
                        </span>
                        <span className="text-xs text-text-sub">ID: {report.target_id}</span>
                      </div>
                      <span className="text-xs text-text-sub shrink-0">{formatDate(report.created_at)}</span>
                    </div>
                    <p className="text-xs text-text-sub mb-3">
                      신고자: <strong>{report.reporter?.nickname || "알 수 없음"}</strong>
                    </p>

                    {report.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReportAction(report, "hidden")}
                          className="flex-1 py-1.5 bg-red-50 text-red-500 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                        >
                          콘텐츠 숨기기
                        </button>
                        <button
                          onClick={() => handleReportAction(report, "dismissed")}
                          className="flex-1 py-1.5 bg-surface border border-border rounded-lg text-xs font-semibold text-text-sub hover:border-cta/30 transition-colors"
                        >
                          신고 기각
                        </button>
                      </div>
                    )}
                    {report.status !== "pending" && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        report.status === "hidden"
                          ? "bg-red-50 text-red-500"
                          : "bg-surface border border-border text-text-sub"
                      }`}>
                        {report.status === "hidden" ? "숨김 처리됨" : "기각됨"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── 유저 관리 ── */}
        {tab === "users" && (
          <>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="닉네임 또는 이메일 검색"
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-sub/50 focus:outline-none focus:border-cta"
              />
              <button
                onClick={fetchUsers}
                className="bg-cta text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
              >
                검색
              </button>
            </div>

            <p className="text-xs text-text-sub mb-3">전체 {userTotal}명</p>

            {loadingUsers ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-surface border border-border rounded-xl h-16" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-text truncate">{u.nickname}</p>
                        {u.role === "admin" && (
                          <span className="text-xs bg-cta text-white px-1.5 py-0.5 rounded-full shrink-0">어드민</span>
                        )}
                      </div>
                      <p className="text-xs text-text-sub truncate">{u.email}</p>
                      <p className="text-xs text-text-sub">Lv.{u.level} · {u.points}P · {formatDate(u.created_at)}</p>
                    </div>
                    <div className="shrink-0">
                      {u.role === "admin" ? (
                        <button
                          onClick={() => handleRoleChange(u.id, "user")}
                          className="text-xs px-3 py-1.5 bg-surface border border-border text-text-sub rounded-lg hover:border-red-300 hover:text-red-500 transition-colors"
                        >
                          권한 해제
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(u.id, "admin")}
                          className="text-xs px-3 py-1.5 bg-cta/10 border border-cta/20 text-cta rounded-lg hover:bg-cta/20 transition-colors"
                        >
                          어드민 지정
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
