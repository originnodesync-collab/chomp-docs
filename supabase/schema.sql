-- ============================================
-- 쩝쩝박사들의 연구노트 (Chomp Docs) — DB 스키마
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- ============================================

-- 1. users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  auth_id UUID UNIQUE NOT NULL,
  email VARCHAR UNIQUE,
  nickname VARCHAR NOT NULL,
  profile_image_url VARCHAR,
  active_title VARCHAR,
  points INT DEFAULT 0,
  level INT DEFAULT 1,
  streak_days INT DEFAULT 0,
  last_checkin DATE,
  contribution_badge BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. recipes
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  category1 VARCHAR NOT NULL,
  category2 VARCHAR,
  image_url VARCHAR,
  difficulty VARCHAR,
  cook_time_min INT,
  servings INT DEFAULT 2,
  description TEXT,
  is_official BOOLEAN DEFAULT false,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  like_count INT DEFAULT 0,
  dislike_count INT DEFAULT 0,
  is_uk_food BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. recipe_steps
CREATE TABLE recipe_steps (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
  section VARCHAR NOT NULL,
  step_number INT NOT NULL,
  description TEXT NOT NULL,
  timer_seconds INT,
  image_url VARCHAR,
  tip TEXT
);

-- 4. recipe_reactions
CREATE TABLE recipe_reactions (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(recipe_id, user_id)
);

-- 5. comments
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. experiment_logs
CREATE TABLE experiment_logs (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- 7. ingredients
CREATE TABLE ingredients (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  unit VARCHAR
);

-- 8. recipe_ingredients
CREATE TABLE recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id INT REFERENCES ingredients(id) ON DELETE CASCADE,
  amount VARCHAR,
  is_main BOOLEAN DEFAULT false
);

-- 9. ingredient_synonyms
CREATE TABLE ingredient_synonyms (
  id SERIAL PRIMARY KEY,
  ingredient_id INT REFERENCES ingredients(id) ON DELETE CASCADE,
  synonym VARCHAR NOT NULL
);

-- 10. recipe_cook_photos
CREATE TABLE recipe_cook_photos (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  image_url VARCHAR NOT NULL,
  is_failed BOOLEAN DEFAULT false,
  like_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 11. user_achievements
CREATE TABLE user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  achievement_code VARCHAR NOT NULL,
  achieved_at TIMESTAMP DEFAULT NOW()
);

-- 12. weekly_rank_rewards
CREATE TABLE weekly_rank_rewards (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
  rank_type VARCHAR NOT NULL,
  rank_position INT NOT NULL,
  points_given INT NOT NULL,
  week_start DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 13. user_saved_recipes
CREATE TABLE user_saved_recipes (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 14. point_logs
CREATE TABLE point_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 15. user_inventory
CREATE TABLE user_inventory (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  ingredient_id INT REFERENCES ingredients(id) ON DELETE CASCADE,
  category VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 16. reports
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  reporter_id INT REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR NOT NULL,
  target_id INT NOT NULL,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 인덱스 (검색 성능 향상)
-- ============================================

-- 레시피 검색
CREATE INDEX idx_recipes_title ON recipes USING gin (to_tsvector('simple', title));
CREATE INDEX idx_recipes_category1 ON recipes(category1);
CREATE INDEX idx_recipes_is_official ON recipes(is_official);
CREATE INDEX idx_recipes_is_uk_food ON recipes(is_uk_food);
CREATE INDEX idx_recipes_like_count ON recipes(like_count DESC);
CREATE INDEX idx_recipes_user_id ON recipes(user_id);

-- 재료 매칭
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);
CREATE INDEX idx_recipe_ingredients_is_main ON recipe_ingredients(is_main);
CREATE INDEX idx_ingredient_synonyms_synonym ON ingredient_synonyms(synonym);

-- 유저 활동
CREATE INDEX idx_comments_recipe_id ON comments(recipe_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_recipe_reactions_recipe_id ON recipe_reactions(recipe_id);
CREATE INDEX idx_experiment_logs_user_id ON experiment_logs(user_id);
CREATE INDEX idx_recipe_cook_photos_recipe_id ON recipe_cook_photos(recipe_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_point_logs_user_id ON point_logs(user_id);
CREATE INDEX idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);

-- ============================================
-- RLS (Row Level Security) 기본 설정
-- Supabase는 RLS가 기본 활성화됨
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_cook_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_rank_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 모든 테이블 읽기 허용 (공개 데이터)
CREATE POLICY "recipes_read" ON recipes FOR SELECT USING (true);
CREATE POLICY "recipe_steps_read" ON recipe_steps FOR SELECT USING (true);
CREATE POLICY "ingredients_read" ON ingredients FOR SELECT USING (true);
CREATE POLICY "recipe_ingredients_read" ON recipe_ingredients FOR SELECT USING (true);
CREATE POLICY "ingredient_synonyms_read" ON ingredient_synonyms FOR SELECT USING (true);
CREATE POLICY "comments_read" ON comments FOR SELECT USING (true);
CREATE POLICY "recipe_reactions_read" ON recipe_reactions FOR SELECT USING (true);
CREATE POLICY "recipe_cook_photos_read" ON recipe_cook_photos FOR SELECT USING (true);
CREATE POLICY "user_achievements_read" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "weekly_rank_rewards_read" ON weekly_rank_rewards FOR SELECT USING (true);
CREATE POLICY "users_read" ON users FOR SELECT USING (true);

-- 로그인 유저: 본인 데이터 쓰기 허용
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (auth.uid() = auth_id);
CREATE POLICY "users_update" ON users FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "recipes_insert" ON recipes FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "recipes_delete" ON recipes FOR DELETE USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY "recipe_reactions_insert" ON recipe_reactions FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "recipe_reactions_delete" ON recipe_reactions FOR DELETE USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY "experiment_logs_insert" ON experiment_logs FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "experiment_logs_read" ON experiment_logs FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY "recipe_cook_photos_insert" ON recipe_cook_photos FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY "user_saved_recipes_all" ON user_saved_recipes FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY "user_inventory_all" ON user_inventory FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY "point_logs_read" ON point_logs FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (
  reporter_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
