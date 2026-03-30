// 레벨 시스템
export const LEVELS = [
  { level: 1, name: "🥄 요알못", requiredPoints: 0 },
  { level: 2, name: "🍜 라면은 끓여봤어", requiredPoints: 5 },
  { level: 3, name: "🍳 쩝쩝입문생", requiredPoints: 20 },
  { level: 4, name: "📚 쩝쩝학사", requiredPoints: 60 },
  { level: 5, name: "🎓 쩝쩝석사", requiredPoints: 200 },
  { level: 6, name: "🔬 쩝쩝박사", requiredPoints: 700 },
  { level: 7, name: "🏆 쩝쩝명예박사", requiredPoints: 3000 },
] as const;

// 포인트 활동별 지급량 + 하루 최대
export const POINT_RULES = {
  CHECKIN: { amount: 1, dailyMax: 1 },
  REACTION: { amount: 1, dailyMax: 10 },
  COMMENT: { amount: 3, dailyMax: 15 },
  PHOTO_UPLOAD: { amount: 5, dailyMax: 25 },
  RECIPE_REGISTER: { amount: 10, dailyMax: 50 },
  RECIPE_LIKED: { amount: 2, dailyMax: null }, // 무제한
  STREAK_7: { amount: 5, dailyMax: null },
  STREAK_30: { amount: 20, dailyMax: null },
} as const;

// 주간 랭킹 포인트
export const WEEKLY_RANK_POINTS = [50, 30, 20, 10, 5] as const; // 1위~5위

// 레시피 카테고리 (식약처 API 기준)
export const CATEGORY1_OPTIONS = [
  "반찬",
  "국&찌개",
  "일품",
  "후식",
  "기타",
] as const;

export const CATEGORY2_OPTIONS = [
  "볶기",
  "끓이기",
  "굽기",
  "찌기",
  "기타",
] as const;

// 난이도
export const DIFFICULTY_OPTIONS = ["easy", "normal", "hard"] as const;

// 레시피 구간
export const SECTION_OPTIONS = ["prep", "cook", "finish"] as const;
export const SECTION_LABELS: Record<string, string> = {
  prep: "🥕 재료 준비",
  cook: "🔥 조리 중",
  finish: "🍽️ 마무리",
};

// 영국음식 편입 조건
export const UK_FOOD_THRESHOLD = {
  minReactions: 5,
  dislikeRatio: 0.7,
};

// Rate Limiting
export const RATE_LIMITS = {
  RECIPE_PER_DAY: 5,
  PHOTO_PER_DAY: 5,
};

// 이미지 업로드
export const IMAGE_UPLOAD = {
  maxSizeMB: 5,
  maxSizeBytes: 5 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  maxResizePx: 1200,
};

// 업적 코드
export const ACHIEVEMENTS = {
  RECIPE_1: { condition: "레시피 1개 등록", title: "🍳 첫 실험 성공" },
  RECIPE_5: { condition: "레시피 5개 등록", title: "📝 레시피 견습생" },
  RECIPE_10: { condition: "레시피 10개 등록", title: "📋 레시피 수집가" },
  RECIPE_30: { condition: "레시피 30개 등록", title: "🗂️ 레시피 아카이버" },
  RECIPE_50: { condition: "레시피 50개 등록", title: "🔬 연구원" },
  RECIPE_100: { condition: "레시피 100개 등록", title: "👨‍🔬 요리연구가" },
  EXP_1: { condition: "실험모드 1회 완료", title: "🧫 첫 실험 돌입" },
  EXP_10: { condition: "실험모드 10회 완료", title: "🧪 견습연구원" },
  EXP_50: { condition: "실험모드 50회 완료", title: "🔭 중급연구원" },
  EXP_100: { condition: "실험모드 100회 완료", title: "⚗️ 숙련연구원" },
  LIKE_100: { condition: "좋아요 100개 받기", title: "⭐ 인기연구자" },
  LIKE_1000: { condition: "좋아요 1,000개 받기", title: "🌟 쩝쩝스타" },
  COMMENT_100: { condition: "댓글 100개 작성", title: "💬 수다박사" },
  PHOTO_UPLOAD_10: { condition: "결과사진 10장 업로드", title: "📷 실험기록관" },
  PHOTO_APPROVED: { condition: "대표 이미지 교체 1회", title: "📸 공식사진사" },
  UK_HALL: { condition: "영국음식 명예의 전당 등재", title: "🇬🇧 괴식전문가" },
  FAIL_10: { condition: "망한음식 자랑대회 10회 업로드", title: "💀 실패의 미학" },
  STREAK_7: { condition: "연속 출석 7일", title: "📅 꾸준한 연구자" },
  STREAK_30: { condition: "연속 출석 30일", title: "🗓️ 성실한 연구자" },
  STREAK_100: { condition: "연속 출석 100일", title: "🎖️ 연구소 터줏대감" },
  FRIDGE_5: { condition: "냉장고 재료 5개 이상", title: "🥬 이것은 냉장고인가 운동장인가" },
  FRIDGE_20: { condition: "냉장고 재료 20개 이상", title: "🧊 냉장고 부자" },
  FRIDGE_SAUCE: { condition: "소스/조미료 5개 이상", title: "🧂 양념왕" },
  FRIDGE_ALL: { condition: "모든 카테고리 1개 이상", title: "🏠 풀옵션 냉장고" },
  FRIDGE_MASTER: { condition: "냉장고 재료 50개 이상", title: "👨‍🍳 냉장고 재벌" },
  LEVEL_MAX: { condition: "쩝쩝명예박사 달성", title: "🏆 쩝쩝명예박사" },
} as const;

// 냉장고 카테고리
export const INVENTORY_CATEGORIES = [
  "채소",
  "과일",
  "육류",
  "해산물",
  "유제품/계란",
  "소스/양념",
  "조미료",
  "냉동식품",
  "기타",
] as const;

// 현재 포인트로 레벨 계산
export function calculateLevel(points: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].requiredPoints) {
      return LEVELS[i].level;
    }
  }
  return 1;
}
