export interface Recipe {
  id: number;
  title: string;
  category1: string;
  category2: string | null;
  image_url: string | null;
  difficulty: "easy" | "normal" | "hard" | null;
  cook_time_min: number | null;
  servings: number;
  description: string | null;
  is_official: boolean;
  user_id: number | null;
  like_count: number;
  dislike_count: number;
  is_uk_food: boolean;
  created_at: string;
}

export interface User {
  id: number;
  auth_id: string;
  email: string | null;
  nickname: string;
  profile_image_url: string | null;
  active_title: string | null;
  points: number;
  level: number;
  streak_days: number;
  last_checkin: string | null;
  contribution_badge: boolean;
  role: "user" | "admin";
  created_at: string;
}

export interface RecipeStep {
  id: number;
  recipe_id: number;
  section: "prep" | "cook" | "finish";
  step_number: number;
  description: string;
  timer_seconds: number | null;
  image_url: string | null;
  tip: string | null;
}

export interface RecipeReaction {
  id: number;
  recipe_id: number;
  user_id: number;
  type: "like" | "dislike";
  created_at: string;
}

export interface Comment {
  id: number;
  recipe_id: number;
  user_id: number;
  content: string;
  parent_id: number | null;
  created_at: string;
}

export interface ExperimentLog {
  id: number;
  recipe_id: number;
  user_id: number;
  completed_at: string;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string | null;
}

export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  ingredient_id: number;
  amount: string | null;
  is_main: boolean;
}

export interface IngredientSynonym {
  id: number;
  ingredient_id: number;
  synonym: string;
}

export interface RecipeCookPhoto {
  id: number;
  recipe_id: number;
  user_id: number;
  image_url: string;
  is_failed: boolean;
  like_count: number;
  created_at: string;
}

export interface UserAchievement {
  id: number;
  user_id: number;
  achievement_code: string;
  achieved_at: string;
}

export interface WeeklyRankReward {
  id: number;
  user_id: number;
  recipe_id: number;
  rank_type: "chomp" | "uk";
  rank_position: number;
  points_given: number;
  week_start: string;
  created_at: string;
}

export interface UserSavedRecipe {
  id: number;
  user_id: number;
  recipe_id: number;
  created_at: string;
}

export interface PointLog {
  id: number;
  user_id: number;
  amount: number;
  reason: string;
  created_at: string;
}

export interface UserInventory {
  id: number;
  user_id: number;
  ingredient_id: number;
  category: string | null;
  created_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  category: string;
  title: string;
  content: string;
  image_url: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostComment {
  id: number;
  post_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  is_hidden: boolean;
  created_at: string;
}

export interface PostLike {
  id: number;
  post_id: number;
  user_id: number;
  created_at: string;
}

export interface Follow {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
}

export interface Report {
  id: number;
  reporter_id: number;
  target_type: "recipe" | "comment" | "photo" | "post" | "post_comment";
  target_id: number;
  status: "pending" | "hidden" | "dismissed";
  created_at: string;
}
