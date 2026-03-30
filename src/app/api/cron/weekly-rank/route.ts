import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { WEEKLY_RANK_POINTS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  // Cron 인증 확인
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // service_role 키로 Supabase 클라이언트 생성 (RLS 우회)
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  // 지난 주 기간 계산 (월~일)
  const now = new Date();
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - now.getDay() - 6); // 지난 주 월요일
  lastMonday.setHours(0, 0, 0, 0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  const weekStart = lastMonday.toISOString().split("T")[0];

  // 이미 이번 주 보상이 지급됐는지 확인
  const { count: existingRewards } = await supabase
    .from("weekly_rank_rewards")
    .select("*", { count: "exact", head: true })
    .eq("week_start", weekStart);

  if (existingRewards && existingRewards > 0) {
    return NextResponse.json({ message: "이미 이번 주 보상이 지급되었습니다" });
  }

  // 쩝쩝 명예의 전당 TOP5 (좋아요 많은 순)
  const { data: topRecipes } = await supabase
    .from("recipes")
    .select("id, user_id, like_count")
    .not("user_id", "is", null)
    .order("like_count", { ascending: false })
    .limit(5);

  // 영국음식 명예의 전당 TOP5 (싫어요 많은 순, is_uk_food=true)
  const { data: topUkRecipes } = await supabase
    .from("recipes")
    .select("id, user_id, dislike_count")
    .eq("is_uk_food", true)
    .not("user_id", "is", null)
    .order("dislike_count", { ascending: false })
    .limit(5);

  const rewards: Array<{
    user_id: number;
    recipe_id: number;
    rank_type: string;
    rank_position: number;
    points_given: number;
    week_start: string;
  }> = [];

  // 쩝쩝 보상
  topRecipes?.forEach((recipe, idx) => {
    if (recipe.user_id && idx < WEEKLY_RANK_POINTS.length) {
      rewards.push({
        user_id: recipe.user_id,
        recipe_id: recipe.id,
        rank_type: "chomp",
        rank_position: idx + 1,
        points_given: WEEKLY_RANK_POINTS[idx],
        week_start: weekStart,
      });
    }
  });

  // 영국음식 보상
  topUkRecipes?.forEach((recipe, idx) => {
    if (recipe.user_id && idx < WEEKLY_RANK_POINTS.length) {
      rewards.push({
        user_id: recipe.user_id,
        recipe_id: recipe.id,
        rank_type: "uk",
        rank_position: idx + 1,
        points_given: WEEKLY_RANK_POINTS[idx],
        week_start: weekStart,
      });
    }
  });

  // 보상 기록 + 포인트 지급
  if (rewards.length > 0) {
    await supabase.from("weekly_rank_rewards").insert(rewards);

    for (const reward of rewards) {
      // 포인트 로그
      await supabase.from("point_logs").insert({
        user_id: reward.user_id,
        amount: reward.points_given,
        reason: `WEEKLY_RANK_${reward.rank_type.toUpperCase()}_${reward.rank_position}`,
      });

      // 유저 포인트 업데이트
      const { data: user } = await supabase
        .from("users")
        .select("points, level")
        .eq("id", reward.user_id)
        .single();

      if (user) {
        const newPoints = user.points + reward.points_given;
        const { calculateLevel } = await import("@/lib/constants");
        const newLevel = calculateLevel(newPoints);

        await supabase
          .from("users")
          .update({ points: newPoints, level: newLevel })
          .eq("id", reward.user_id);
      }
    }
  }

  return NextResponse.json({
    success: true,
    weekStart,
    rewardsGiven: rewards.length,
  });
}
