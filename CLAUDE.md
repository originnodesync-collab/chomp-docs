# 쩝쩝박사들의 연구노트 (Chomp Docs) — CLAUDE.md

> Claude Code가 이 프로젝트를 시작할 때 반드시 이 파일 전체를 먼저 읽으세요.
> 기획서 원본: `ChompDocs_MVP_v1.13.docx` (상세 스펙 전체 포함)

---

## 1. 프로젝트 한 줄 정의

냉장고 재료 또는 요리 이름으로 레시피를 찾고, 실험모드로 요리하면서 보기 최적화된 웹앱.
유저 레시피 등록 + 결과 사진 커뮤니티 + 업적/칭호 시스템 포함.

---

## 2. 브랜드 & 세계관 규칙

- **앱 이름**: 쩝쩝박사들의 연구노트 (영문: Chomp Docs)
- **태그라인**: 맛있는 것들의 모든 연구 기록
- **톤앤매너**: 유머러스한 B급 연구소 감성

### ⚠️ 세계관 언어 적용 범위 — 이 4곳에만 적용, 나머지는 일반 언어 사용
1. 레벨명 (요알못, 쩝쩝입문생 등)
2. 실험모드 버튼 텍스트 (🔬 실험 시작, 실험 성공! 등)
3. 영국음식 편입 알림 문구
4. 업적 칭호명

---

## 3. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프론트엔드 | React + Tailwind CSS | |
| 백엔드 | Next.js (App Router + API Routes) | Vercel 배포 최적 |
| DB | Supabase (PostgreSQL) | 로컬/배포 모두 Supabase 사용. SQLite 사용 금지 |
| 인증 | Supabase Auth | 이메일 + 구글 OAuth + 카카오 OAuth |
| 이미지 | Cloudinary | 유저 업로드 전용 |
| 스케줄러 | Vercel Cron Jobs | `"0 0 * * 1"` UTC — 매주 월요일 00:00 UTC |
| 화면 꺼짐 방지 | Web Lock API | 실험모드 전용 |
| 배포 | Vercel | 무료 플랜 |

---

## 4. 환경변수 (.env.local)

프로젝트 시작 시 루트에 `.env.local` 파일 생성 후 아래 변수를 모두 채울 것.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=

# 식약처 API
FOODSAFETY_API_KEY=

# Vercel Cron 보안
CRON_SECRET=

# 앱 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **참고**: Google/Kakao OAuth 설정은 Supabase 대시보드 > Authentication > Providers에서 직접 입력.
> NextAuth 관련 변수(NEXTAUTH_URL, NEXTAUTH_SECRET 등)는 사용하지 않음.

---

## 5. UI 디자인 시스템

### 컨셉: 낡은 실험노트 (Worn Lab Notebook)
크림 베이지 종이 질감. B급 유머를 억지로 드러내지 않고 UI에 자연스럽게 녹아들게 함.

### 컬러 팔레트

| 역할 | HEX | 사용처 |
|---|---|---|
| 베이스 (전체 배경) | `#F5F3EE` | 페이지 배경 |
| 서피스 (카드/입력) | `#FFFDF8` | 카드, 입력 영역 |
| 보더/구분선 | `#D3D1C7` | 구분선, 테두리 |
| 기본 텍스트 | `#2C2C2A` | 본문, 헤딩 |
| 보조 텍스트 | `#888780` | 설명, 메타정보 |
| **주요 CTA** | **`#D85A30`** | **실험 시작, 다음 단계 버튼** |

### B급 디테일 요소

| 요소 | 처리 방식 |
|---|---|
| 레벨 뱃지 | 직인/스탬프 스타일. 테두리 울퉁불퉁한 원형 뱃지 |
| 실험 성공 화면 | "실험 성공!" 텍스트에 코럴색 도장 찍히는 애니메이션 |
| 영국음식 편입 알림 | 국기 흔들리는 진동 + 과장된 축하 토스트 |
| 냉장고 인벤토리 | 냉장고 선반처럼 구획 나뉜 레이아웃. 칸마다 재료 태그 |
| 실험모드 구간 전환 | 노트 페이지 넘기는 스와이프 애니메이션 |
| 빈 상태 (empty state) | "연구 데이터 없음", "실험 기록 없음" 등 연구노트 용어 사용 |

---

## 6. 데이터베이스 스키마

### recipes
```sql
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  category1 VARCHAR NOT NULL,       -- 반찬/국&찌개/일품/후식/기타 (요리 종류, 식약처 RCP_PAT2 기준)
  category2 VARCHAR,                -- 볶기/끓이기/굽기/찌기/기타 (조리 방식, 식약처 RCP_WAY2 기준. NULL 허용)
  image_url VARCHAR,
  difficulty VARCHAR,               -- easy/normal/hard
  cook_time_min INT,
  servings INT DEFAULT 2,           -- 인분 수
  description TEXT,                 -- 최대 100자
  is_official BOOLEAN DEFAULT false, -- true=식약처, false=유저
  user_id INT REFERENCES users(id), -- 유저 레시피만. 공식은 null
  like_count INT DEFAULT 0,
  dislike_count INT DEFAULT 0,
  is_uk_food BOOLEAN DEFAULT false, -- 영국음식 편입 여부
  created_at TIMESTAMP DEFAULT NOW()
);
```

### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  auth_id UUID UNIQUE NOT NULL,     -- Supabase Auth uid (auth.users.id 연결)
  email VARCHAR UNIQUE,
  nickname VARCHAR NOT NULL,
  profile_image_url VARCHAR,
  active_title VARCHAR,             -- 장착 칭호 코드. null=없음
  points INT DEFAULT 0,
  level INT DEFAULT 1,              -- 1~7
  streak_days INT DEFAULT 0,
  last_checkin DATE,
  contribution_badge BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
-- password_hash 삭제: Supabase Auth가 인증 정보를 별도 관리
-- social_provider/social_id 삭제: Supabase Auth가 OAuth 프로바이더 정보를 별도 관리
```

### recipe_steps
```sql
CREATE TABLE recipe_steps (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id),
  section VARCHAR NOT NULL,         -- 'prep'(재료준비)/'cook'(조리)/'finish'(마무리)
  step_number INT NOT NULL,         -- 구간 내 순서
  description TEXT NOT NULL,
  timer_seconds INT,                -- null=타이머 없음
  image_url VARCHAR,
  tip TEXT
);
-- 식약처 공식 레시피는 전체 단계를 section='cook'으로 일괄 처리
```

### recipe_reactions
```sql
CREATE TABLE recipe_reactions (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id),
  user_id INT REFERENCES users(id),
  type VARCHAR NOT NULL,            -- 'like' / 'dislike'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(recipe_id, user_id)        -- 계정당 1회
);
```

### comments
```sql
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id),
  user_id INT REFERENCES users(id),
  content TEXT NOT NULL,            -- 최대 300자
  created_at TIMESTAMP DEFAULT NOW()
);
```

### experiment_logs
```sql
CREATE TABLE experiment_logs (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id),
  user_id INT REFERENCES users(id),
  completed_at TIMESTAMP DEFAULT NOW()
);
-- 업적 EXP_1, EXP_10 등 = user_id별 COUNT로 체크
-- 비로그인 유저의 실험모드는 기록하지 않음
```

### ingredients / recipe_ingredients / ingredient_synonyms
```sql
CREATE TABLE ingredients (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,            -- 대표 이름 (예: "달걀")
  unit VARCHAR
);

CREATE TABLE recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id),
  ingredient_id INT REFERENCES ingredients(id),
  amount VARCHAR,
  is_main BOOLEAN DEFAULT false     -- true=주재료, false=부재료
);

CREATE TABLE ingredient_synonyms (
  id SERIAL PRIMARY KEY,
  ingredient_id INT REFERENCES ingredients(id),
  synonym VARCHAR NOT NULL          -- 동의어 (예: "계란", "egg", "달걀" 등)
);
-- 검색/매칭 시: 유저 입력 → ingredient_synonyms에서 매칭 → ingredient_id로 레시피 검색
-- 초기 데이터: 식약처 레시피 재료에서 자동 수집 후, 주요 동의어 수작업 추가 (200~300개)
```

### recipe_cook_photos
```sql
CREATE TABLE recipe_cook_photos (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id),
  user_id INT REFERENCES users(id),
  image_url VARCHAR NOT NULL,
  is_failed BOOLEAN DEFAULT false,  -- true=망한음식 자랑대회
  like_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### user_achievements
```sql
CREATE TABLE user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  achievement_code VARCHAR NOT NULL,
  achieved_at TIMESTAMP DEFAULT NOW()
);
```

### weekly_rank_rewards
```sql
CREATE TABLE weekly_rank_rewards (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  recipe_id INT REFERENCES recipes(id),
  rank_type VARCHAR NOT NULL,       -- 'chomp' / 'uk'
  rank_position INT NOT NULL,       -- 1~5
  points_given INT NOT NULL,
  week_start DATE NOT NULL,         -- 해당 주 월요일
  created_at TIMESTAMP DEFAULT NOW()
);
```

### user_saved_recipes / point_logs / user_inventory / reports
```sql
CREATE TABLE user_saved_recipes (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  recipe_id INT REFERENCES recipes(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE point_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  amount INT NOT NULL,
  reason VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_inventory (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  ingredient_id INT REFERENCES ingredients(id),
  category VARCHAR, -- 채소/과일·육류/해산물·유제품/계란·소스/양념·조미료·냉동식품·기타
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  reporter_id INT REFERENCES users(id),
  target_type VARCHAR NOT NULL,     -- 'recipe' / 'comment' / 'photo'
  target_id INT NOT NULL,
  status VARCHAR DEFAULT 'pending', -- 'pending' / 'hidden' / 'dismissed'
  created_at TIMESTAMP DEFAULT NOW()
);
-- 동일 target 신고 5회 누적 시 status='hidden' 자동 전환
```

---

## 7. 핵심 비즈니스 로직

### 레벨 & 포인트

| 레벨 | 이름 | 필요 포인트 |
|---|---|---|
| 1 | 🥄 요알못 | 0P |
| 2 | 🍜 라면은 끓여봤어 | 5P |
| 3 | 🍳 쩝쩝입문생 | 20P |
| 4 | 📚 쩝쩝학사 | 60P |
| 5 | 🎓 쩝쩝석사 | 200P |
| 6 | 🔬 쩝쩝박사 | 700P |
| 7 | 🏆 쩝쩝명예박사 | 3000P |

| 활동 | 포인트 | 하루 최대 |
|---|---|---|
| 출석 체크 | 1P | 1P |
| 레시피 좋아요/싫어요 | 1P | 10P |
| 댓글 작성 | 3P | 15P |
| 결과사진 업로드 | 5P | 25P |
| 레시피 직접 등록 | 10P | 50P |
| 내 레시피 좋아요 받기 | 2P | 무제한 |
| 주간 랭킹 1위 | 50P | 주 1회 |
| 주간 랭킹 2위 | 30P | 주 1회 |
| 주간 랭킹 3위 | 20P | 주 1회 |
| 주간 랭킹 4위 | 10P | 주 1회 |
| 주간 랭킹 5위 | 5P | 주 1회 |
| 7일 연속 출석 보너스 | +5P | - |
| 30일 연속 출석 보너스 | +20P | - |

### 영국음식 편입 조건
```
총 반응(like + dislike) >= 5  AND  dislike / 총 반응 > 0.7
```
- 조건 충족 시 `is_uk_food = true` 자동 전환
- 좋아요가 싫어요를 역전하면 `is_uk_food = false` 복귀
- 편입 알림 문구: "🇬🇧 축하합니다! 귀하의 레시피가 영국음식으로 승격되었습니다"

### 레시피 매칭 알고리즘
```
주재료 1개 매칭  = +10점
부재료 1개 매칭  = +3점
결과 포함 조건   = 주재료 1개 이상 매칭
정렬             = 총점 내림차순, 동점이면 주재료 매칭 수 많은 순
카드 충족률 표시 = (주재료 매칭 수 / 전체 주재료 수) × 100%
```

### 검색 API
```
검색 방식: PostgreSQL ILIKE (대소문자 무시 부분 일치)
쿼리:     WHERE title ILIKE '%{검색어}%'

- "김치" 검색 → "김치찌개", "김치볶음밥", "참치김치찌개" 모두 매칭
- 재료 검색: ingredients + ingredient_synonyms JOIN으로 동의어까지 매칭
- 초성 검색: MVP 제외 (2차에서 pg_trgm 확장으로 구현 가능)
```

### 주간 랭킹 Cron Job
- 스케줄: `"0 0 * * 1"` UTC = 매주 월요일 00:00 UTC (한국시간 09:00)
- 집계 기준: 해당 주 일요일 23:59 UTC 마감
- 대상: 쩝쩝 명예의 전당 TOP5 + 영국음식 명예의 전당 TOP5 (각각 별도 지급)
- 중복 수령 가능: 두 랭킹 동시 TOP5 진입 시 각각 지급
- API: `POST /api/cron/weekly-rank` — 헤더: `Authorization: Bearer {CRON_SECRET}`

### Rate Limiting (서버사이드 DB 기준, 클라이언트 체크는 UX 보조용)
- 레시피 등록: 하루 5개
- 결과사진 업로드: 하루 5개
- 좋아요/싫어요: 계정당 1회 (UNIQUE 제약)
- 출석 체크: 하루 1회 (last_checkin = today 확인)

### 레시피 삭제 정책
- 삭제 허용 (명예의 전당 진입 레시피 포함)
- 삭제 시 해당 레시피로 받은 포인트 회수
- 명예의 전당에서 즉시 제외

### 대표 이미지 교체 정책
- 결과사진 좋아요 1위 유저가 "대표 이미지 신청" 가능
- 신청 시 자동 교체 (운영자 승인 불필요 — MVP에 어드민 페이지 없음)
- 교체 시 PHOTO_APPROVED 업적 부여 + contribution_badge = true
- 부적절한 이미지는 신고 시스템(5회 누적 자동 숨김)으로 대응

### 신고 처리
- 동일 target 5회 누적 → `status = 'hidden'` 자동 전환
- 운영자 검토 후 `'dismissed'`(복구) 또는 영구 삭제

### 랭킹 캐시
- 실시간/주간/월간/역대 탭 모두 TTL 3600초 (1시간)
- Next.js `revalidate` 옵션 활용

---

## 8. 이미지 업로드 정책

- 최대 용량: **5MB**
- 허용 포맷: **jpg / png / webp**
- 클라이언트: canvas API로 업로드 전 최대 1200px 리사이징
- 서버: Cloudinary 업로드 전 MIME 타입 + 용량 재검증

---

## 9. 식약처 레시피 DB 수집 (Phase 0 — 선행 작업)

```
API 엔드포인트:
http://openapi.foodsafetykorea.go.kr/api/{FOODSAFETY_API_KEY}/COOKRCP01/json/{시작}/{끝}

총 수량: 1,146개 (100개씩 나눠서 수집)
이미지: 단계별 이미지 URL 포함 — 별도 저장 불필요, URL 그대로 사용
구간 처리: 공식 레시피 전체 단계 → section = 'cook' 일괄 처리
```

### 식약처 API 필드 매핑

| API 필드 | DB 컬럼 | 설명 |
|---|---|---|
| RCP_NM | recipes.title | 요리명 |
| RCP_PAT2 | recipes.category1 | 반찬/국&찌개/일품/후식 |
| RCP_WAY2 | recipes.category2 | 볶기/끓이기/굽기/찌기/기타 |
| RCP_PARTS_DTLS | → 파싱 → ingredients + recipe_ingredients | 재료 텍스트 |
| MANUAL01~20 | recipe_steps.description | 조리 단계 설명 |
| MANUAL_IMG01~20 | recipe_steps.image_url | 단계별 이미지 |
| ATT_FILE_NO_MAIN | recipes.image_url | 대표 이미지 |
| INFO_ENG / INFO_PRO 등 | (MVP 미사용) | 영양정보 — 2차에서 활용 가능 |
| HASH_TAG | (참고용) | 주요 재료 태그 |

### 재료 파싱 규칙
식약처 RCP_PARTS_DTLS 형식 예시: `"연두부 75g(3/4모), 칵테일새우 20g(5마리), 달걀 30g(1/2개)"`
- 쉼표(,) 또는 줄바꿈(\n)으로 분리
- 각 항목에서 재료명 / 수량 추출
- ingredients 테이블에 재료명 등록 (중복 체크)
- recipe_ingredients에 레시피-재료 관계 저장
- 첫 번째 줄바꿈 이전 재료들을 is_main = true (주재료)로 처리

수집 후 할 일:
1. `recipes` + `recipe_steps` + `ingredients` + `recipe_ingredients` 테이블에 삽입
2. `is_official = true` 설정
3. 재료 마스터 정리 (200~300개 주요 재료)
4. `ingredient_synonyms`에 주요 동의어 수작업 등록 (예: 달걀↔계란, 돼지고기↔돈육)

---

## 10. 주요 화면 구조

### 홈 화면
- 상단 헤더: 앱 로고(좌) + 현재 레벨 뱃지(우)
- 2×2 메뉴 카드: 요리하러가기(강조) / 명예의전당 / 레시피올리기 / 결과사진올리기
- 랭킹 미리보기: 쩝쩝 명예의 전당 TOP5 (금/은/동)
- 하단 탭바 고정: 홈 / 검색 / 내 레시피 / 마이페이지

### 실험모드
- Web Lock API로 화면 꺼짐 방지
- 상단: 현재 구간명 ("🔥 조리 중")
- 진행바: 전체 단계 + 구간 구분선
- 본문: 단계 번호 + 큰 글씨(16px+) + 이미지
- 타이머: timer_seconds 있을 때만 표시
- 우상단: 전체 재료 토글 (오버레이)
- 구간 전환 시 알림: "다음 구간: 마무리 단계로 넘어갑니다"
- 완료: "실험 성공!" + 결과사진 업로드 유도
- 완료 시 experiment_logs에 기록 저장 (로그인 유저만)

### 비로그인 허용
- 가능: 레시피 탐색, 실험모드 (완료 기록은 저장 안 됨)
- 불가 (로그인 모달 표시): 좋아요/싫어요/댓글, 레시피 등록, 결과사진 업로드, 마이페이지

---

## 11. 업적 코드 목록

| 코드 | 조건 | 칭호 |
|---|---|---|
| RECIPE_1 | 레시피 1개 등록 | 🍳 첫 실험 성공 |
| RECIPE_5 | 레시피 5개 등록 | 📝 레시피 견습생 |
| RECIPE_10 | 레시피 10개 등록 | 📋 레시피 수집가 |
| RECIPE_30 | 레시피 30개 등록 | 🗂️ 레시피 아카이버 |
| RECIPE_50 | 레시피 50개 등록 | 🔬 연구원 |
| RECIPE_100 | 레시피 100개 등록 | 👨‍🔬 요리연구가 |
| EXP_1 | 실험모드 1회 완료 | 🧫 첫 실험 돌입 |
| EXP_10 | 실험모드 10회 완료 | 🧪 견습연구원 |
| EXP_50 | 실험모드 50회 완료 | 🔭 중급연구원 |
| EXP_100 | 실험모드 100회 완료 | ⚗️ 숙련연구원 |
| LIKE_100 | 좋아요 100개 받기 | ⭐ 인기연구자 |
| LIKE_1000 | 좋아요 1,000개 받기 | 🌟 쩝쩝스타 |
| COMMENT_100 | 댓글 100개 작성 | 💬 수다박사 |
| PHOTO_UPLOAD_10 | 결과사진 10장 업로드 | 📷 실험기록관 |
| PHOTO_APPROVED | 대표 이미지 교체 1회 승인 | 📸 공식사진사 |
| UK_HALL | 영국음식 명예의 전당 등재 | 🇬🇧 괴식전문가 |
| FAIL_10 | 망한음식 자랑대회 10회 업로드 | 💀 실패의 미학 |
| STREAK_7 | 연속 출석 7일 | 📅 꾸준한 연구자 |
| STREAK_30 | 연속 출석 30일 | 🗓️ 성실한 연구자 |
| STREAK_100 | 연속 출석 100일 | 🎖️ 연구소 터줏대감 |
| FRIDGE_5 | 냉장고 재료 5개 이상 등록 | 🥬 이것은 냉장고인가 운동장인가 |
| FRIDGE_20 | 냉장고 재료 20개 이상 등록 | 🧊 냉장고 부자 |
| FRIDGE_SAUCE | 소스/조미료 5개 이상 등록 | 🧂 양념왕 |
| FRIDGE_ALL | 모든 카테고리 1개 이상 등록 | 🏠 풀옵션 냉장고 |
| FRIDGE_MASTER | 냉장고 재료 50개 이상 등록 | 👨‍🍳 냉장고 재벌 |
| LEVEL_MAX | 쩝쩝명예박사 달성 | 🏆 쩝쩝명예박사 |

칭호 표시 형식: `[요리연구가] 닉네임` — 게시글/댓글 닉네임 앞에 표시
---

## 12. 개발 순서 (Phase)

### Phase 0 — DB 수집 (선행)
- [ ] 0-1. 식약처 API 키 발급
- [ ] 0-2. COOKRCP01 전체 수집 스크립트 (1,146개)
- [ ] 0-3. 재료 파싱 + DB 삽입 + ingredient_synonyms 초기 데이터
- [ ] 0-4. 공식 레시피 section 일괄 'cook' 설정

### Phase 1 — 뼈대
- [ ] 1. 프로젝트 세팅 + Supabase DB 스키마 (테이블 15개)
- [ ] 2. 홈 화면 (4개 메뉴 + 랭킹 미리보기)
- [ ] 3. 요리하러가기 분기 + 재료 선택 + 요리방식
- [ ] 4. 레시피 매칭 API + 검색 API (ILIKE 부분 일치)
- [ ] 5. 결과 카드 + 레시피 상세 (구간별 조리순서)

### Phase 2 — 실험모드
- [ ] 6. 실험모드 전체 (구간 헤더 + 구간 전환 알림)
- [ ] 7. 화면 꺼짐 방지 + 스와이프 + 타이머
- [ ] 8. 진행바 + 구간 구분선 + 재료 토글
- [ ] 8-1. 실험 완료 시 experiment_logs 기록 저장

### Phase 3 — 계정 & 포인트
- [ ] 9. 회원가입 / 로그인 (Supabase Auth: 이메일 + 구글 + 카카오)
- [ ] 10. 좋아요/싫어요/댓글 (중복 방지) — comments 테이블 사용
- [ ] 11. 포인트 적립 + 레벨 자동 계산
- [ ] 12. 출석 체크 + 연속출석 보너스
- [ ] 13. 주간 랭킹 포인트 자동 지급 (Cron Job)

### Phase 4 — 유저 콘텐츠 & 랭킹 & 마이페이지
- [ ] 14. 유저 레시피 등록 폼 (구간별 조리단계 입력)
- [ ] 15. 결과사진 기본 게시판 + 망한음식 자랑대회
- [ ] 16. 대표 이미지 신청 로직 (1위→신청→자동교체+뱃지)
- [ ] 17. 쩝쩝 + 영국음식 명예의 전당 (주간 보상 안내 포함)
- [ ] 18. 영국음식 자동 편입 + 알림
- [ ] 19. 업적 달성 체크 로직 (활동 발생 시 자동 부여)
- [ ] 20. 마이페이지 전체 (프로필/레벨/업적/칭호/내활동)
- [ ] 21. 칭호 장착/해제 + [칭호] 닉네임 표시
- [ ] 22. 냉장고 인벤토리 (저장/삭제. 계정 연동)
- [ ] 22-1. 신고 버튼 UI + 5회 누적 자동 숨김

### Phase 5 — 마무리
- [ ] 23. 반응형 UI 점검 (모바일)
- [ ] 24. Vercel 배포 + Cron Job 설정
- [ ] 25. 주요 플로우 테스트 (5개 시나리오)

---

## 13. MVP 제외 기능 (임의 구현 금지)

아래 기능은 MVP 범위 밖입니다. 별도 요청이 없으면 절대 구현하지 마세요.

- 사진 재료 인식 (AI Vision) → 2차
- 없는 재료 구매 링크 → 2차
- 소비기한 알림 → 2차
- 비밀번호 찾기/재설정 → 2차 (현재는 소셜 로그인 유도로 대체)
- 팔로우 / 커뮤니티 피드 → 4차
- 대댓글 (2depth 댓글) → 2차 이후
- 중식/일식/양식 레시피 DB → 2~3차
- 초성 검색 → 2차 (pg_trgm 확장 활용)
- 한식/중식/일식/양식 카테고리 분류 → 2~3차 (다국적 레시피 DB 추가 시 도입)
- 운영자 어드민 페이지 → 2차
- 영양정보 표시 (칼로리/단백질 등) → 2차 (식약처 데이터에 이미 포함되어 있음)

---

## 14. v1 → v2 변경 이력

| # | 이슈 | 변경 내용 |
|---|---|---|
| 1 | 댓글 테이블 누락 | `comments` 테이블 추가 (섹션 6) |
| 2 | 실험 완료 기록 누락 | `experiment_logs` 테이블 추가 (섹션 6) |
| 3 | 인증 방식 충돌 | NextAuth.js → Supabase Auth로 변경 (섹션 3, 4, 6) |
| 4 | 재료 동의어 미정의 | `ingredient_synonyms` 테이블 추가 (섹션 6, 9) |
| 5 | 대표 이미지 승인 불명확 | 자동 교체로 변경 (섹션 7) |
| 6 | 카테고리 불일치 | 식약처 API 실제 값 기준으로 재설계 (섹션 6, 9) |
| 7 | 검색 API 미정의 | ILIKE 부분 일치 검색 정의 (섹션 7) |
| 8 | 식약처 필드 매핑 없음 | API 필드 → DB 컬럼 매핑표 추가 (섹션 9) |
| 9 | 환경변수 정리 | NextAuth 변수 삭제, Supabase Auth 관련 정리 (섹션 4) |
| 10 | MVP 제외 기능 보완 | 초성 검색, 어드민 페이지, 영양정보 등 명시 추가 (섹션 13) |
