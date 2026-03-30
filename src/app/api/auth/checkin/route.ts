import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addPoints } from "@/lib/points";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, last_checkin, streak_days")
    .eq("auth_id", user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: "유저를 찾을 수 없습니다" }, { status: 404 });
  }

  const today = new Date().toISOString().split("T")[0];

  // 이미 오늘 출석했는지 확인
  if (dbUser.last_checkin === today) {
    return NextResponse.json({ error: "이미 오늘 출석했습니다", alreadyChecked: true });
  }

  // 연속 출석 계산
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak = 1;
  if (dbUser.last_checkin === yesterdayStr) {
    newStreak = dbUser.streak_days + 1;
  }

  // 출석 업데이트
  await supabase
    .from("users")
    .update({
      last_checkin: today,
      streak_days: newStreak,
    })
    .eq("id", dbUser.id);

  // 출석 포인트
  await addPoints(supabase, dbUser.id, "CHECKIN");

  // 연속 출석 보너스
  let bonusPoints = 0;
  if (newStreak === 7) {
    await addPoints(supabase, dbUser.id, "STREAK_7");
    bonusPoints = 5;
  }
  if (newStreak === 30) {
    await addPoints(supabase, dbUser.id, "STREAK_30");
    bonusPoints = 20;
  }

  return NextResponse.json({
    success: true,
    streak: newStreak,
    bonusPoints,
  });
}
