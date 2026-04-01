-- ============================================================
-- 쩝쩝박사들의 연구노트 v2 마이그레이션
-- Supabase SQL Editor에서 순서대로 실행하세요
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Phase 1: 댓글 대댓글 (F)
-- ────────────────────────────────────────────────────────────

ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);


-- ────────────────────────────────────────────────────────────
-- Phase 2: 요리연구학회 게시판 (A)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR NOT NULL,     -- '잡담' / '레시피공유' / '질문' / '후기'
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_comments (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  parent_id INT REFERENCES post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_likes (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON post_comments(parent_id);

-- RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_read" ON posts FOR SELECT USING (is_hidden = false);
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "posts_delete" ON posts FOR DELETE USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "posts_update_counts" ON posts FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "post_comments_read" ON post_comments FOR SELECT USING (is_hidden = false);
CREATE POLICY "post_comments_insert" ON post_comments FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "post_comments_delete" ON post_comments FOR DELETE USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY "post_likes_all" ON post_likes FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);


-- ────────────────────────────────────────────────────────────
-- Phase 2: 냉장고 소비기한 알림 (H)
-- ────────────────────────────────────────────────────────────

ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS expires_at DATE;
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT false;


-- ────────────────────────────────────────────────────────────
-- Phase 3: 팔로우 (B)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INT REFERENCES users(id) ON DELETE CASCADE,
  following_id INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_read" ON follows FOR SELECT USING (true);
CREATE POLICY "follows_insert" ON follows FOR INSERT WITH CHECK (
  follower_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "follows_delete" ON follows FOR DELETE USING (
  follower_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);


-- ────────────────────────────────────────────────────────────
-- Phase 4: 어드민 + 계정 (E)
-- ────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user';
-- role 값: 'user' / 'admin'


-- ────────────────────────────────────────────────────────────
-- Phase 5: 레시피 DB 확장 (C, D)
-- ────────────────────────────────────────────────────────────

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT 'foodsafety';
-- source 값: 'foodsafety' / 'mafra' / 'nongsaro' / 'visitkorea' / 'heritage' / 'user'
-- mafra: 농림수산식품교육문화정보원 (scripts/collect-mafra.ts)

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS calories NUMERIC;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS protein NUMERIC;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS fat NUMERIC;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS carbs NUMERIC;


-- ────────────────────────────────────────────────────────────
-- Phase 5: 피드 rpc 함수 (B)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_feed(user_id_param INT, page_offset INT DEFAULT 0)
RETURNS TABLE(
  id INT,
  type TEXT,
  title TEXT,
  image_url TEXT,
  created_at TIMESTAMP,
  author_nickname TEXT,
  author_id INT,
  author_active_title TEXT
) AS $$
  SELECT
    r.id,
    'recipe'::TEXT AS type,
    r.title,
    r.image_url,
    r.created_at,
    u.nickname AS author_nickname,
    u.id AS author_id,
    u.active_title AS author_active_title
  FROM recipes r
  JOIN users u ON r.user_id = u.id
  WHERE r.user_id IN (
    SELECT following_id FROM follows WHERE follower_id = user_id_param
  )
  UNION ALL
  SELECT
    p.id,
    'post'::TEXT AS type,
    p.title,
    p.image_url,
    p.created_at,
    u.nickname AS author_nickname,
    u.id AS author_id,
    u.active_title AS author_active_title
  FROM posts p
  JOIN users u ON p.user_id = u.id
  WHERE p.user_id IN (
    SELECT following_id FROM follows WHERE follower_id = user_id_param
  )
  AND p.is_hidden = false
  ORDER BY created_at DESC
  LIMIT 20 OFFSET page_offset;
$$ LANGUAGE sql SECURITY DEFINER;
