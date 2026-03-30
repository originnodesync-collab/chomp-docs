"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { LEVELS, ACHIEVEMENTS } from "@/lib/constants";

export default function MyPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [achievements, setAchievements] = useState<string[]>([]);
  const [stats, setStats] = useState({ recipes: 0, experiments: 0, photos: 0 });
  const [checkinDone, setCheckinDone] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const supabase = createClient();

      const [achRes, recipeRes, expRes, photoRes] = await Promise.all([
        supabase.from("user_achievements").select("achievement_code").eq("user_id", user!.id),
        supabase.from("recipes").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("experiment_logs").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("recipe_cook_photos").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);

      setAchievements(achRes.data?.map(a => a.achievement_code) || []);
      setStats({
        recipes: recipeRes.count || 0,
        experiments: expRes.count || 0,
        photos: photoRes.count || 0,
      });

      const today = new Date().toISOString().split("T")[0];
      setCheckinDone(user!.last_checkin === today);
    }
    fetchData();
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-3xl mb-3">🔒</p>
            <p className="text-text-sub mb-4">로그인이 필요합니다</p>
            <button onClick={() => router.push("/auth/login")}
              className="bg-cta text-white px-6 py-2 rounded-xl text-sm font-semibold">
              로그인하기
            </button>
          </div>
        </main>
        <BottomTabBar />
      </>
    );
  }

  const levelInfo = LEVELS[user.level - 1] || LEVELS[0];
  const nextLevel = LEVELS[user.level] || null;
  const progressToNext = nextLevel
    ? ((user.points - levelInfo.requiredPoints) / (nextLevel.requiredPoints - levelInfo.requiredPoints)) * 100
    : 100;

  const handleCheckin = async () => {
    const res = await fetch("/api/auth/checkin", { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setCheckinDone(true);
      alert(`출석 완료! +1P${data.bonusPoints > 0 ? ` (보너스 +${data.bonusPoints}P)` : ""}\n연속 ${data.streak}일`);
      router.refresh();
    } else if (data.alreadyChecked) {
      alert("이미 오늘 출석했습니다");
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <Header level={user.level} />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        {/* 프로필 */}
        <section className="bg-surface border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-border rounded-full flex items-center justify-center text-2xl">
              {user.profile_image_url ? (
                <img src={user.profile_image_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : "👤"}
            </div>
            <div className="flex-1">
              <p className="font-bold text-text">
                {user.active_title && (
                  <span className="text-cta text-sm mr-1">
                    [{ACHIEVEMENTS[user.active_title as keyof typeof ACHIEVEMENTS]?.title || user.active_title}]
                  </span>
                )}
                {user.nickname}
              </p>
              <p className="text-sm text-text-sub">{levelInfo.name}</p>
            </div>
          </div>

          {/* 레벨 진행바 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-text-sub mb-1">
              <span>{user.points}P</span>
              <span>{nextLevel ? `${nextLevel.requiredPoints}P` : "MAX"}</span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-cta rounded-full transition-all" style={{ width: `${Math.min(progressToNext, 100)}%` }} />
            </div>
          </div>

          {/* 출석 체크 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-sub">🔥 연속 출석 {user.streak_days}일</span>
            <button onClick={handleCheckin} disabled={checkinDone}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${checkinDone ? "bg-border text-text-sub" : "bg-cta text-white active:scale-[0.97]"}`}>
              {checkinDone ? "출석 완료 ✓" : "📅 출석 체크"}
            </button>
          </div>
        </section>

        {/* 통계 */}
        <section className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "등록 레시피", value: stats.recipes, icon: "📝" },
            { label: "실험 완료", value: stats.experiments, icon: "🧪" },
            { label: "결과 사진", value: stats.photos, icon: "📸" },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-xl p-3 text-center">
              <p className="text-lg mb-0.5">{s.icon}</p>
              <p className="text-lg font-bold text-text">{s.value}</p>
              <p className="text-xs text-text-sub">{s.label}</p>
            </div>
          ))}
        </section>

        {/* 업적 */}
        <section className="bg-surface border border-border rounded-xl p-4 mb-4">
          <h3 className="font-semibold text-text text-sm mb-3">
            업적 ({achievements.length}/{Object.keys(ACHIEVEMENTS).length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ACHIEVEMENTS).map(([code, info]) => {
              const earned = achievements.includes(code);
              return (
                <span key={code}
                  className={`text-xs px-2.5 py-1 rounded-full ${earned ? "bg-cta/10 text-cta" : "bg-border/50 text-text-sub/50"}`}
                  title={info.condition}>
                  {info.title}
                </span>
              );
            })}
          </div>
        </section>

        {/* 메뉴 */}
        <section className="bg-surface border border-border rounded-xl overflow-hidden mb-4">
          {[
            { href: "/my-recipes", label: "내 레시피", icon: "📖" },
            { href: "/fridge", label: "냉장고 인벤토리", icon: "🧊" },
          ].map((item, idx) => (
            <Link key={item.href} href={item.href}
              className={`flex items-center px-4 py-3 hover:bg-base transition-colors ${idx < 1 ? "border-b border-border" : ""}`}>
              <span className="mr-3">{item.icon}</span>
              <span className="text-sm text-text">{item.label}</span>
              <span className="ml-auto text-text-sub text-xs">→</span>
            </Link>
          ))}
        </section>

        <button onClick={handleLogout}
          className="w-full text-text-sub text-sm py-2 hover:text-red-500 transition-colors">
          로그아웃
        </button>
      </main>
      <BottomTabBar />
    </>
  );
}
