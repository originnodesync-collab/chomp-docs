import { SupabaseClient } from "@supabase/supabase-js";
import { POINT_RULES, calculateLevel } from "./constants";

type PointReason = keyof typeof POINT_RULES;

export async function addPoints(
  supabase: SupabaseClient,
  userId: number,
  reason: PointReason,
  customAmount?: number
) {
  const rule = POINT_RULES[reason];
  const amount = customAmount ?? rule.amount;

  // 하루 최대 체크 (dailyMax가 null이면 무제한)
  if (rule.dailyMax !== null) {
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("point_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("reason", reason)
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`);

    const currentTotal = (count || 0) * rule.amount;
    if (currentTotal >= rule.dailyMax) {
      return { success: false, reason: "daily_limit" };
    }
  }

  // 포인트 로그 기록
  await supabase.from("point_logs").insert({
    user_id: userId,
    amount,
    reason,
  });

  // 유저 포인트 업데이트 + 레벨 재계산
  const { data: user } = await supabase
    .from("users")
    .select("points")
    .eq("id", userId)
    .single();

  if (user) {
    const newPoints = user.points + amount;
    const newLevel = calculateLevel(newPoints);

    await supabase
      .from("users")
      .update({ points: newPoints, level: newLevel })
      .eq("id", userId);
  }

  return { success: true, amount };
}
