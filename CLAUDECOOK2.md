# 쩝쩝박사들의 연구노트 (Chomp Docs) — CLAUDECOOK2.md

> 2차 버전 개발용 Claude Code 전달 파일
> MVP 현황은 STATUS.md 참고. 기존 코드베이스 위에 기능을 추가하는 방식으로 진행.

---

## 1. 프로젝트 현황 (MVP 완성 기준)

| 항목 | 내용 |
|---|---|
| 사이트 URL | https://cook-olive-seven.vercel.app |
| GitHub | https://github.com/originnodesync-collab/chomp-docs |
| 스택 | Next.js 16 (Turbopack) + Tailwind CSS v4 + Supabase + Vercel |
| 인증 | Supabase Auth (이메일 + OAuth 준비됨) |
| 이미지 | Cloudinary (cloud: dj7e2tp8r, preset: chomp_docs) |
| DB | Supabase PostgreSQL (16개 테이블) |
| 레시피 | 식약처 COOKRCP01 1,146개 수집 완료 |

### MVP에서 완성된 기능 (건드리지 말 것)
- 레시피 탐색 (재료 매칭 + 요리명 검색)
- 실험모드 (구간 헤더 + 타이머 + 도장 애니메이션)
- 좋아요/싫어요/댓글/신고/저장
- 유저 레시피 등록/삭제
- 결과사진 게시판 + 망한음식 자랑대회
- 명예의 전당 (쩝쩝 + 영국음식)
- 포인트/레벨/업적/칭호 시스템
- 마이페이지
- 냉장고 인벤토리
- 주간 랭킹 Cron Job

---

## 2. 2차 버전 추가 기능 목록

### A. 요리연구학회 게시판 ★ (최우선)
### B. 팔로우 / 팔로잉 + 피드
### C. 레시피 DB 추가 (공공 API 3종)
### D. 검색 고도화 (초성 검색 + 영양정보)
### E. 계정 (비밀번호 찾기 + 어드민)
### F. 댓글 대댓글 (2depth)
### G. SNS 공유
### H. 냉장고 소비기한 알림

---

## 3. 기능 상세 스펙

### A. 요리연구학회 게시판

디시인사이드 요리갤러리 느낌의 자유 게시판. 홈 메인화면에 배치.

**DB 추가**
```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR,             -- 선택 첨부 (1장)
  category VARCHAR NOT NULL,     -- 'chat'(잡담)/'share'(레시피공유)/'question'(질문)/'review'(후기)
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE post_comments (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  parent_id INT REFERENCES post_comments(id) ON DELETE CASCADE, -- null=원댓글, 값=대댓글
  content TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE post_likes (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
```

**화면 구조**
- 홈 메인화면에 "요리연구학회" 섹션 추가 (랭킹 미리보기 아래)
- 최신글 3개 미리보기 + "전체보기" 링크
- 전체 게시판: 카테고리 탭(전체/잡담/레시피공유/질문/후기) + 정렬(최신/인기)
- 글 목록: 카테고리 태그 + 제목 + 닉네임 + 댓글수 + 좋아요수 + 시간
- 글 상세: 본문 + 이미지 + 좋아요 + 댓글 (2depth)
- 글쓰기: 카테고리 선택 + 제목 + 본문 + 이미지 첨부(선택)

**API 추가**
```
GET  /api/posts?category=&sort=&page=   게시글 목록
POST /api/posts                          게시글 작성 (로그인 필요)
GET  /api/posts/[id]                     게시글 상세
DELETE /api/posts/[id]                   게시글 삭제 (본인만)
POST /api/posts/[id]/like                좋아요 토글
GET  /api/posts/[id]/comments            댓글 목록
POST /api/posts/[id]/comments            댓글/대댓글 작성
DELETE /api/posts/comments/[id]          댓글 삭제 (본인만)
```

**신고 연동**
기존 reports 테이블 사용. target_type에 'post' / 'post_comment' 추가.

---

### B. 팔로우 / 팔로잉 + 피드

**DB 추가**
```sql
CREATE TABLE follows (
  id SERIAL PRIMARY KEY,
  follower_id INT REFERENCES users(id) ON DELETE CASCADE,  -- 팔로우 하는 사람
  following_id INT REFERENCES users(id) ON DELETE CASCADE, -- 팔로우 받는 사람
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
```

**화면 구조**
- 유저 프로필 페이지: 팔로우/팔로잉 버튼 + 카운트
- 마이페이지: 팔로워/팔로잉 탭 추가
- 팔로우 피드: 하단 탭바에 피드 탭 추가 → 팔로우한 사람의 레시피/결과사진/게시글

**API 추가**
```
POST /api/follows          팔로우/언팔로우 토글
GET  /api/follows/feed     팔로우 피드 (최신순)
GET  /api/users/[id]       유저 프로필 (팔로워수/팔로잉수 포함)
```

---

### C. 레시피 DB 추가

공공 API 3종 추가 수집. 목표 총 3,000개+.

| API | 기관 | 특징 | 엔드포인트 |
|---|---|---|---|
| 농림수산식품교육문화정보원 | 농림부 | 한식 중심 추가 레시피 | 공공데이터포털 활용신청 후 사용 |
| 한국관광공사 | 문화체육관광부 | 지역별 향토 음식 | TourAPI 활용 |
| 전통음식 DB | 문체부 | 전통/궁중 요리 | 공공데이터포털 활용신청 후 사용 |

**수집 스크립트 작성 방식**
- 기존 식약처 수집 스크립트 패턴 동일하게 작성
- recipes 테이블 is_official=true, source 필드 추가로 출처 구분
- 레시피 중복 제거: title + category1 기준 UPSERT

**recipes 테이블 필드 추가**
```sql
ALTER TABLE recipes ADD COLUMN source VARCHAR DEFAULT 'foodsafety';
-- 값: 'foodsafety' / 'nongsaro' / 'visitkorea' / 'heritage' / 'user'
```

**출처 표기 의무**
- 레시피 상세 하단에 "출처: 식품의약품안전처" 등 표기
- 공식 레시피 상세 페이지에 출처 배지 표시

---

### D. 검색 고도화

**D-1. 초성 검색**
```sql
-- pg_trgm 확장 활성화 (Supabase 대시보드 SQL Editor에서 실행)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_recipes_title_trgm ON recipes USING gin(title gin_trgm_ops);
```
- 기존 ILIKE 검색에 초성 변환 로직 추가
- 예: "ㄱㅂ" 입력 → "김밥" 검색 가능

**D-2. 영양정보 표시**
식약처 데이터에 영양정보 포함 → 기존 수집 데이터 활용.

```sql
ALTER TABLE recipes ADD COLUMN calories NUMERIC;
ALTER TABLE recipes ADD COLUMN protein NUMERIC;
ALTER TABLE recipes ADD COLUMN fat NUMERIC;
ALTER TABLE recipes ADD COLUMN carbs NUMERIC;
```

- 레시피 상세에 영양정보 섹션 추가 (1인분 기준)
- 공식 레시피만 표시 (유저 레시피는 선택 입력)

---

### E. 계정 기능 추가

**E-1. 비밀번호 찾기/재설정**
Supabase Auth 내장 기능 활용. 추가 구현 거의 없음.
```
POST /api/auth/reset-password   이메일로 재설정 링크 발송
/auth/reset-password/page.tsx   새 비밀번호 입력 페이지
```

**E-2. 어드민 페이지**
```
/admin/page.tsx                 어드민 메인 (ADMIN 권한 체크)
/admin/reports/page.tsx         신고 목록 + 처리 (hidden/dismissed)
/admin/recipes/page.tsx         대표 이미지 승인 대기 목록
/admin/users/page.tsx           유저 목록 + 레벨/포인트 수동 조정
```

```sql
ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user';
-- 값: 'user' / 'admin'
```

---

### F. 댓글 대댓글 (2depth)

기존 comments 테이블에 parent_id 추가.

```sql
ALTER TABLE comments ADD COLUMN parent_id INT REFERENCES comments(id) ON DELETE CASCADE;
-- null = 원댓글, 값 = 대댓글 (레시피 댓글용)
```

- 원댓글 아래 "답글 달기" 버튼
- 대댓글은 1단계만 허용 (대댓글의 대댓글 불가)
- 대댓글 표시: 원댓글 아래 들여쓰기

---

### G. SNS 공유

추가 DB 없음. 프론트엔드 작업만.

- 카카오 공유하기 (카카오 SDK)
- 링크 복사 (Clipboard API)
- 인스타그램 스토리 공유 (이미지 다운로드 유도)

공유 버튼 위치: 레시피 상세 + 결과사진 상세 + 게시글 상세

---

### H. 냉장고 소비기한 알림

```sql
ALTER TABLE user_inventory ADD COLUMN expires_at DATE;
ALTER TABLE user_inventory ADD COLUMN notified BOOLEAN DEFAULT false;
```

- 재료 등록 시 소비기한 날짜 선택 (선택사항)
- D-3일 전 앱 내 알림 표시 (토스트 or 홈화면 배지)
- Cron Job 추가: 매일 09:00 KST (00:00 UTC) 만료 임박 재료 체크

```
POST /api/cron/expire-check    만료 임박 재료 알림 처리
vercel.json cron: "0 0 * * *"  매일 UTC 00:00
```

---

## 4. 신규 DB 테이블 요약

| 테이블 | 설명 |
|---|---|
| posts | 요리연구학회 게시글 |
| post_comments | 게시글 댓글 (2depth) |
| post_likes | 게시글 좋아요 |
| follows | 팔로우 관계 |

**기존 테이블 변경사항**

| 테이블 | 변경 내용 |
|---|---|
| recipes | source VARCHAR 추가 / calories·protein·fat·carbs 추가 |
| comments | parent_id INT 추가 (대댓글) |
| users | role VARCHAR 추가 (user/admin) |
| user_inventory | expires_at DATE 추가 / notified BOOLEAN 추가 |
| reports | target_type에 'post'/'post_comment' 추가 허용 |

---

## 5. 환경변수 추가

기존 `.env.local`에 아래 추가.

```env
# 카카오 공유 SDK (기존 OAuth 키와 동일)
NEXT_PUBLIC_KAKAO_APP_KEY=

# 농림수산식품교육문화정보원 API
NONGSARO_API_KEY=

# 한국관광공사 TourAPI
TOUR_API_KEY=
```

---

## 6. 파일 구조 추가 (신규)

```
src/app/
├── community/
│   ├── page.tsx                # 요리연구학회 게시판 전체
│   ├── new/page.tsx            # 글쓰기
│   └── [id]/page.tsx           # 글 상세
├── feed/page.tsx               # 팔로우 피드
├── users/[id]/page.tsx         # 유저 프로필
├── admin/
│   ├── page.tsx
│   ├── reports/page.tsx
│   ├── recipes/page.tsx
│   └── users/page.tsx
└── api/
    ├── posts/
    │   ├── route.ts
    │   ├── [id]/route.ts
    │   ├── [id]/like/route.ts
    │   └── [id]/comments/route.ts
    ├── follows/
    │   ├── route.ts
    │   └── feed/route.ts
    ├── users/[id]/route.ts
    ├── auth/reset-password/route.ts
    ├── admin/
    │   ├── reports/route.ts
    │   └── users/route.ts
    └── cron/
        ├── weekly-rank/route.ts  # 기존 유지
        └── expire-check/route.ts # 신규
```

---

## 7. vercel.json Cron 추가

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-rank",
      "schedule": "0 0 * * 1"
    },
    {
      "path": "/api/cron/expire-check",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

## 8. 개발 순서 (Phase)

### Phase 1 — 요리연구학회 게시판
- [ ] posts / post_comments / post_likes 테이블 생성
- [ ] 게시판 전체 페이지 (목록/상세/작성)
- [ ] 홈 메인화면에 요리연구학회 섹션 추가
- [ ] 게시글 좋아요/댓글/신고 연동

### Phase 2 — DB 확장 + 검색 고도화
- [ ] recipes 테이블 source/영양정보 필드 추가
- [ ] 농림수산식품교육문화정보원 API 수집 스크립트
- [ ] 한국관광공사 / 문체부 전통음식 API 수집 스크립트
- [ ] pg_trgm 확장 + 초성 검색
- [ ] 레시피 상세 영양정보 섹션 추가

### Phase 3 — 팔로우 + 피드
- [ ] follows 테이블 생성
- [ ] 팔로우/언팔로우 API
- [ ] 유저 프로필 페이지
- [ ] 팔로우 피드 페이지
- [ ] 하단 탭바 피드 탭 추가

### Phase 4 — 계정 + 어드민 + 댓글 개선
- [ ] users 테이블 role 필드 추가
- [ ] 비밀번호 찾기/재설정 (Supabase Auth)
- [ ] 어드민 페이지 (신고/대표이미지/유저 관리)
- [ ] comments 테이블 parent_id 추가 + 대댓글 UI

### Phase 5 — SNS 공유 + 소비기한 알림
- [ ] 카카오 공유 SDK 연동
- [ ] 링크 복사 버튼
- [ ] user_inventory expires_at 필드 추가
- [ ] 소비기한 입력 UI
- [ ] Cron Job expire-check 추가

### Phase 6 — 마무리
- [ ] 반응형 점검
- [ ] Vercel 배포 + 신규 Cron 설정
- [ ] 전체 플로우 테스트

---

## 9. 2차 제외 기능 (구현 금지)

아래는 3차 이후로 미뤄진 기능. 요청 없으면 절대 구현하지 말 것.

- 커머스 연동 / 제휴링크 수익 → 3차
- 프리미엄 구독 → 3차
- AI 사진 재료 인식 → 아이디어 메모만
- 요리 챌린지/대회 → 아이디어 메모만
- 개인화 추천 알고리즘 → 3차
- 식단 플래너 → 4차
- 다국어 → 4차
- Capacitor 앱 패키징 → 2차 완성 후 별도 진행
