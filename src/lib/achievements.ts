import { SupabaseClient } from "@supabase/supabase-js";

interface AchievementCheck {
  code: string;
  check: (supabase: SupabaseClient, userId: number) => Promise<boolean>;
}

const ACHIEVEMENT_CHECKS: AchievementCheck[] = [
  // 레시피 등록
  { code: "RECIPE_1", check: async (s, uid) => (await countRows(s, "recipes", uid)) >= 1 },
  { code: "RECIPE_5", check: async (s, uid) => (await countRows(s, "recipes", uid)) >= 5 },
  { code: "RECIPE_10", check: async (s, uid) => (await countRows(s, "recipes", uid)) >= 10 },
  { code: "RECIPE_30", check: async (s, uid) => (await countRows(s, "recipes", uid)) >= 30 },
  { code: "RECIPE_50", check: async (s, uid) => (await countRows(s, "recipes", uid)) >= 50 },
  { code: "RECIPE_100", check: async (s, uid) => (await countRows(s, "recipes", uid)) >= 100 },

  // 실험모드 완료
  { code: "EXP_1", check: async (s, uid) => (await countRows(s, "experiment_logs", uid)) >= 1 },
  { code: "EXP_10", check: async (s, uid) => (await countRows(s, "experiment_logs", uid)) >= 10 },
  { code: "EXP_50", check: async (s, uid) => (await countRows(s, "experiment_logs", uid)) >= 50 },
  { code: "EXP_100", check: async (s, uid) => (await countRows(s, "experiment_logs", uid)) >= 100 },

  // 좋아요 받기
  {
    code: "LIKE_100",
    check: async (s, uid) => {
      const { data } = await s.from("recipes").select("like_count").eq("user_id", uid);
      return (data || []).reduce((sum, r) => sum + r.like_count, 0) >= 100;
    },
  },
  {
    code: "LIKE_1000",
    check: async (s, uid) => {
      const { data } = await s.from("recipes").select("like_count").eq("user_id", uid);
      return (data || []).reduce((sum, r) => sum + r.like_count, 0) >= 1000;
    },
  },

  // 댓글
  { code: "COMMENT_100", check: async (s, uid) => (await countRows(s, "comments", uid)) >= 100 },

  // 결과사진
  {
    code: "PHOTO_UPLOAD_10",
    check: async (s, uid) => (await countRows(s, "recipe_cook_photos", uid)) >= 10,
  },

  // 망한음식
  {
    code: "FAIL_10",
    check: async (s, uid) => {
      const { count } = await s
        .from("recipe_cook_photos")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("is_failed", true);
      return (count || 0) >= 10;
    },
  },

  // 연속 출석
  {
    code: "STREAK_7",
    check: async (s, uid) => {
      const { data } = await s.from("users").select("streak_days").eq("id", uid).single();
      return (data?.streak_days || 0) >= 7;
    },
  },
  {
    code: "STREAK_30",
    check: async (s, uid) => {
      const { data } = await s.from("users").select("streak_days").eq("id", uid).single();
      return (data?.streak_days || 0) >= 30;
    },
  },
  {
    code: "STREAK_100",
    check: async (s, uid) => {
      const { data } = await s.from("users").select("streak_days").eq("id", uid).single();
      return (data?.streak_days || 0) >= 100;
    },
  },

  // 냉장고
  { code: "FRIDGE_5", check: async (s, uid) => (await countRows(s, "user_inventory", uid)) >= 5 },
  { code: "FRIDGE_20", check: async (s, uid) => (await countRows(s, "user_inventory", uid)) >= 20 },
  { code: "FRIDGE_MASTER", check: async (s, uid) => (await countRows(s, "user_inventory", uid)) >= 50 },
  {
    code: "FRIDGE_SAUCE",
    check: async (s, uid) => {
      const { count } = await s
        .from("user_inventory")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid)
        .in("category", ["소스/양념", "조미료"]);
      return (count || 0) >= 5;
    },
  },
  {
    code: "FRIDGE_ALL",
    check: async (s, uid) => {
      const { data } = await s
        .from("user_inventory")
        .select("category")
        .eq("user_id", uid);
      const categories = new Set((data || []).map(d => d.category));
      return categories.size >= 9; // 모든 카테고리
    },
  },

  // 레벨 MAX
  {
    code: "LEVEL_MAX",
    check: async (s, uid) => {
      const { data } = await s.from("users").select("level").eq("id", uid).single();
      return (data?.level || 0) >= 7;
    },
  },
];

async function countRows(supabase: SupabaseClient, table: string, userId: number): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return count || 0;
}

/**
 * 유저의 업적을 체크하고 새로 달성한 업적을 부여합니다.
 * 활동 발생 시 호출하세요.
 */
export async function checkAchievements(
  supabase: SupabaseClient,
  userId: number
): Promise<string[]> {
  // 이미 달성한 업적 목록
  const { data: existing } = await supabase
    .from("user_achievements")
    .select("achievement_code")
    .eq("user_id", userId);

  const earned = new Set((existing || []).map(a => a.achievement_code));
  const newlyEarned: string[] = [];

  for (const achievement of ACHIEVEMENT_CHECKS) {
    if (earned.has(achievement.code)) continue;

    const passed = await achievement.check(supabase, userId);
    if (passed) {
      await supabase.from("user_achievements").insert({
        user_id: userId,
        achievement_code: achievement.code,
      });
      newlyEarned.push(achievement.code);
    }
  }

  return newlyEarned;
}
