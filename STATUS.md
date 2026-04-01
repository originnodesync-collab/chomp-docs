# 쩝쩝박사들의 연구노트 — 현황 정리 (2026-04-01)

## 프로젝트 기본 정보

| 항목 | 내용 |
|---|---|
| 사이트 URL | https://cook-olive-seven.vercel.app |
| GitHub | https://github.com/originnodesync-collab/chomp-docs |
| 스택 | Next.js 16 (Turbopack) + Tailwind CSS v4 + Supabase + Vercel |
| 인증 | Supabase Auth (이메일 + OAuth 준비됨) |
| 이미지 | Cloudinary (cloud: dj7e2tp8r, preset: chomp_docs) |
| DB | Supabase PostgreSQL (16개 테이블) |

---

## 1. DB 스키마 최종본

```sql
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
  category1 VARCHAR NOT NULL,       -- 반찬/국&찌개/일품/후식/기타
  category2 VARCHAR,                -- 볶기/끓이기/굽기/찌기/기타
  image_url VARCHAR,
  difficulty VARCHAR,               -- easy/normal/hard
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
  section VARCHAR NOT NULL,         -- prep/cook/finish
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
  type VARCHAR NOT NULL,            -- like/dislike
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
  rank_type VARCHAR NOT NULL,       -- chomp/uk
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
  target_type VARCHAR NOT NULL,     -- recipe/comment/photo
  target_id INT NOT NULL,
  status VARCHAR DEFAULT 'pending', -- pending/hidden/dismissed
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 현재 데이터

| 테이블 | 건수 |
|---|---|
| recipes | 1,146개 (식약처 COOKRCP01) |
| recipe_steps | 6,657개 |
| ingredients | 1,079개 |
| ingredient_synonyms | 169개 (87그룹) |

---

## 2. 구현된 기능 목록

### Phase 0 — 데이터 수집
- [x] 식약처 COOKRCP01 1,146개 레시피 수집
- [x] 재료 파싱 + DB 삽입
- [x] 재료 동의어 87그룹 등록

### Phase 1 — 기본 탐색
- [x] 홈 화면 — 2×2 메뉴 카드 + 실시간 DB 랭킹 TOP5
- [x] 헤더 — 비로그인: 로그인 버튼 / 로그인: 레벨 뱃지 → 마이페이지
- [x] 하단 탭바 고정 (홈 / 검색 / 내 레시피 / 마이페이지)
- [x] 요리하러가기 분기 (재료로 찾기 / 요리명으로 찾기)
- [x] 재료 선택 화면 — 카테고리 탭 + 태그 + CTA 버튼
- [x] 요리명 검색 — ILIKE 부분 일치 + 인기 검색어
- [x] 검색 결과 — 카드 + 이미지 + 충족률 + 카테고리 필터
- [x] 레시피 상세 — 이미지 + 재료 주/부 + 구간별 조리단계 + 타이머 표시
- [x] 좋아요/싫어요 — 추가/취소/전환 + 토스트 피드백
- [x] 저장 북마크 — ☆↔⭐ + 토스트 피드백
- [x] 신고 버튼 (레시피/댓글)
- [x] 댓글 등록/조회

### Phase 2 — 실험모드
- [x] 실험모드 전체 — 구간 헤더 + 구간 전환 알림
- [x] 진행바 + 구간 구분선
- [x] 화면 꺼짐 방지 (Web Lock API)
- [x] 타이머 — 시작/일시정지/초기화
- [x] 전체 재료 토글 오버레이
- [x] 실험 완료 화면 — 도장 stamp 애니메이션
- [x] experiment_logs 기록 저장 (로그인 유저만)
- [x] 나가기 버튼 — confirm → 이전 페이지

### Phase 3 — 계정 & 포인트
- [x] 회원가입 (이메일)
- [x] 로그인 (이메일) + 세션 유지
- [x] OAuth 콜백 라우트 (Google/Kakao Provider 설정 시 즉시 사용 가능)
- [x] 포인트 적립 시스템 (하루 최대 체크 포함)
- [x] 레벨 자동 계산 (7단계)
- [x] 출석 체크 +1P — 중복 방지 + 토스트 피드백
- [x] 연속출석 보너스 (7일 +5P, 30일 +20P)
- [x] 주간 랭킹 Cron Job (매주 월요일 UTC 00:00)

### Phase 4 — 유저 콘텐츠
- [x] 유저 레시피 등록 — 이미지 + 재료 + 구간별 조리단계
- [x] 내 레시피 목록 + 삭제 (포인트 회수 포함)
- [x] 저장한 레시피 탭
- [x] 결과사진 게시판 — 전체/망한음식 탭
- [x] 결과사진 업로드 — Cloudinary + 클라이언트 이미지 리사이징
- [x] 대표 이미지 신청 API — 좋아요 1위 → 자동 교체
- [x] 쩝쩝 명예의 전당 — 주간/월간/역대 필터
- [x] 영국음식 명예의 전당 — 싫어요 70% 자동 편입
- [x] 영국음식 편입 시 토스트 알림
- [x] 업적 25개 자동 부여 로직
- [x] 칭호 장착/해제 — 마이페이지에서 탭으로 토글
- [x] 마이페이지 — 프로필/레벨 진행바/통계/업적/칭호
- [x] 냉장고 인벤토리 — 추가/삭제/이 재료로 요리하기
- [x] 신고 5회 누적 자동 숨김

### Phase 5 — 마무리
- [x] 모바일 반응형 (375px 기준)
- [x] 홈 랭킹 revalidate 3600초
- [x] 404 커스텀 페이지
- [x] Vercel 배포 + Cron Job 설정
- [x] GitHub 저장소 연동
- [x] ESLint 에러/워닝 0개
- [x] Next.js Image 최적화 적용 (외부 이미지 전체)

---

## 3. API 엔드포인트 목록

### 레시피

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/recipes/search?q=검색어` | 요리명 ILIKE 검색 | 불필요 |
| GET | `/api/recipes/match?ingredients=a,b,c` | 재료 매칭 (동의어 포함) | 불필요 |
| POST | `/api/recipes/create` | 유저 레시피 등록 | 필요 |
| POST | `/api/recipes/delete` | 유저 레시피 삭제 + 포인트 회수 | 필요 |

### 반응 / 댓글 / 저장 / 신고

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/reactions` | 좋아요/싫어요 (추가/취소/전환) | 필요 |
| GET | `/api/comments?recipe_id=1` | 댓글 목록 | 불필요 |
| POST | `/api/comments` | 댓글 등록 | 필요 |
| POST | `/api/saved` | 저장/해제 토글 | 필요 |
| POST | `/api/reports` | 신고 (5회 누적 자동 숨김) | 필요 |

### 사진

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/photos` | 결과사진 업로드 (Cloudinary) | 필요 |
| POST | `/api/photos/apply-main` | 대표 이미지 신청 | 필요 |

### 유저

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/auth/checkin` | 출석 체크 (+1P, 중복 방지) | 필요 |
| POST | `/api/titles` | 칭호 장착/해제 | 필요 |

### 자동화

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/cron/weekly-rank` | 주간 랭킹 정산 | Bearer CRON_SECRET |

> **인증 방식**: `Authorization: Bearer {Supabase access_token}` 헤더

---

## 4. 미구현 항목 (MVP 제외 명시)

| 항목 | 비고 |
|---|---|
| 구글/카카오 OAuth 실제 연동 | Supabase 대시보드에서 Provider 키 입력 필요. 코드는 준비됨 |
| 비밀번호 찾기/재설정 | MVP 제외 → 소셜 로그인으로 대체 예정 |
| 초성 검색 | MVP 제외 → 2차에서 pg_trgm 확장으로 구현 |
| 대댓글 (2depth) | MVP 제외 |
| 팔로우 / 커뮤니티 피드 | MVP 제외 |
| 어드민 페이지 | MVP 제외 |
| 중식/일식/양식 레시피 | MVP 제외 |
| AI 사진 재료 인식 | MVP 제외 |
| 영양정보 표시 | MVP 제외. 식약처 데이터에 포함되어 있어 2차에서 활용 가능 |
| 소비기한 알림 | MVP 제외 |

---

## 5. 핵심 파일 구조

```
src/
├── app/
│   ├── page.tsx                    # 홈
│   ├── not-found.tsx               # 404 커스텀
│   ├── layout.tsx                  # 공통 레이아웃
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts       # OAuth 콜백
│   ├── cook/
│   │   ├── page.tsx                # 요리하러가기 분기
│   │   ├── by-ingredient/page.tsx  # 재료 선택
│   │   ├── by-name/page.tsx        # 요리명 검색
│   │   └── results/page.tsx        # 검색 결과
│   ├── recipe/[id]/page.tsx        # 레시피 상세
│   ├── experiment/[id]/page.tsx    # 실험모드
│   ├── recipes/new/page.tsx        # 레시피 등록
│   ├── photos/
│   │   ├── page.tsx                # 결과사진 게시판
│   │   └── new/page.tsx            # 결과사진 업로드
│   ├── hall-of-fame/page.tsx       # 명예의 전당
│   ├── mypage/page.tsx             # 마이페이지
│   ├── my-recipes/page.tsx         # 내 레시피
│   ├── search/page.tsx             # 검색 탭
│   ├── fridge/page.tsx             # 냉장고 인벤토리
│   └── api/
│       ├── reactions/route.ts
│       ├── comments/route.ts
│       ├── saved/route.ts
│       ├── reports/route.ts
│       ├── titles/route.ts
│       ├── photos/route.ts
│       ├── photos/apply-main/route.ts
│       ├── recipes/
│       │   ├── search/route.ts
│       │   ├── match/route.ts
│       │   ├── create/route.ts
│       │   └── delete/route.ts
│       ├── auth/checkin/route.ts
│       └── cron/weekly-rank/route.ts
├── components/
│   ├── Header.tsx
│   ├── BottomTabBar.tsx
│   ├── LoginModal.tsx
│   ├── Toast.tsx
│   └── ExperimentTimer.tsx
├── hooks/
│   ├── useUser.ts                  # 유저 세션 훅
│   └── useWakeLock.ts              # 화면 꺼짐 방지
└── lib/
    ├── api.ts                      # fetchWithAuth 헬퍼
    ├── constants.ts                # 레벨/포인트/업적 상수
    ├── points.ts                   # 포인트 적립 로직
    ├── achievements.ts             # 업적 체크 로직
    └── supabase/
        ├── client.ts               # 브라우저 클라이언트 (싱글톤)
        └── server.ts               # 서버 클라이언트 + getAuthUser()
```

---

## 6. 환경변수 목록

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
FOODSAFETY_API_KEY=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```
