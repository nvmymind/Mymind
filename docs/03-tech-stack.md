# MyMind — 기술 스택 추천

## 1. 추천 요약

| 구분 | MVP (1~2개월) | 프로덕션 (6개월+) |
|------|---------------|-------------------|
| 클라이언트 | **Next.js 웹 (PWA)** | 웹 + React Native 앱 |
| 서버 | Next.js App Router API | 동일 + Redis 분리 |
| DB | **SQLite → PostgreSQL** | PostgreSQL |
| 실시간 | Polling 30초 → **SSE** | SSE + Redis Pub/Sub |
| 검색 | PostgreSQL LIKE | Elasticsearch / pg_trgm |
| 인증 | Mock → **NICE/KCB PASS** | PASS + JWT 세션 |
| 배포 | Vercel + Supabase | AWS/GCP + RDS |

**MVP는 웹 우선.** 앱스토어 심사·푸시 알림은 Phase 2 이후.

---

## 2. 왜 Next.js 풀스택?

```
┌──────────────┐     ┌─────────────────────────────┐
│  Browser     │────▶│  Next.js (Vercel)           │
│  React UI    │     │  ├─ App Router pages        │
└──────────────┘     │  ├─ API Routes (/api/v1)    │
                     │  └─ SSE (/api/stream)       │
                     └──────────┬──────────────────┘
                                │
                     ┌──────────▼──────────────────┐
                     │  PostgreSQL / SQLite        │
                     │  (Prisma ORM)               │
                     └─────────────────────────────┘
```

- **한 레포**로 UI + API → MVP 속도 최대
- SSR/ISR로 SEO (랜딩·단어 페이지)
- TypeScript end-to-end
- Vercel 배포 간단

---

## 3. 레이어별 상세

### 3.1 프론트엔드

| 기술 | 역할 |
|------|------|
| Next.js 15 App Router | 라우팅, SSR |
| React 19 | UI |
| Tailwind CSS | 스타일 |
| SWR / TanStack Query | 데이터 fetching + 캐시 |

**실시간 트렌드**

- MVP: `useSWR` + `refreshInterval: 30000`
- Phase 2: EventSource (SSE)로 push

### 3.2 백엔드

| 기술 | 역로 |
|------|------|
| Next.js Route Handlers | REST API |
| Prisma | ORM, 마이그레이션 |
| Zod | 요청 검증 |

**비즈니스 로직 분리**

```
src/
  lib/
    words.ts      # 단어 CRUD, 정규화
    empathy.ts    # 공감 토글
    moderation.ts # 욕설 필터, 신고 처리
    auth.ts       # 세션, DI 검증
  app/api/v1/     # HTTP 진입점만
```

### 3.3 데이터베이스

**MVP: SQLite** (로컬·데모용, 파일 하나)

**프로덕션: PostgreSQL**

- JSON 집계, `pg_trgm` 유사 검색
- Supabase / Neon / RDS

**그래프 DB (Neo4j)?**

- 단어 연결이 핵심이지만 MVP에서는 **관계 테이블**로 충분
- 연결 depth 2~3 수준이면 PostgreSQL + 인덱스로 OK
- 수백만 노드·복잡 traversals 시 Neo4j 검토

### 3.4 캐시·실시간

| 단계 | 방식 |
|------|------|
| MVP | DB 직접 조회 + 30초 polling |
| Growth | Redis Sorted Set (`trending:words`) |
| Scale | Redis Pub/Sub → SSE/WebSocket fan-out |

```
[공감 API] → INCR empathyCount → ZINCRBY trending → PUBLISH trending:update
                                                      ↓
                                            [SSE subscribers]
```

### 3.5 검색

| 단계 | 방식 |
|------|------|
| MVP | `normalizedText LIKE '%query%'` |
| Growth | PostgreSQL `pg_trgm` + GIN 인덱스 |
| Scale | Elasticsearch (한글 형태소) |

### 3.6 본인인증

| 제공사 | 방식 | 비고 |
|--------|------|------|
| NICE평가정보 | PASS, SMS | 국내 표준 |
| KCB | PASS, SMS | |
| Danal | SMS | |

**연동 흐름**

```
1. 클라이언트 → 인증사 SDK/팝업
2. 인증 성공 → 서버 callback (DI, birthYear, gender)
3. 서버: DI로 User upsert → HTTP-only session cookie
```

MVP: `POST /api/v1/auth/verify` mock (개발용 DI 생성)

### 3.7 콘텐츠 모더레이션

| 레이어 | 구현 |
|--------|------|
| 사전 | `src/lib/profanity-ko.txt` + Aho-Corasick |
| ML (선택) | Google Perspective API, 자체 KoBERT |
| 신고 | DB trigger 또는 API에서 reportCount++ → status 변경 |

---

## 4. 웹 vs 네이티브 앱

| | 웹 (PWA) | 네이티브 앱 |
|--|----------|-------------|
| 출시 속도 | ⭐⭐⭐ | ⭐ |
| 본인인증 | PASS 웹 연동 OK | PASS 앱 SDK |
| 푸시 | Web Push (제한적) | FCM/APNs |
| 스토어 | 불필요 | 심사 필요 |
| **MVP** | **권장** | Phase 2 |

PWA `manifest.json` + 홈 화면 추가 → 앱처럼 사용 가능.

---

## 5. 보안·개인정보

| 항목 | 권장 |
|------|------|
| 세션 | HTTP-only Secure Cookie |
| DI 저장 | 암호화 at rest (AES-256) |
| Rate limit | Vercel / Upstash Redis |
| CORS | same-origin only |
| 로그 | DI·이름 로깅 금지 |

---

## 6. 인프라 (프로덕션 예시)

```
                    ┌─────────────┐
  Users ──────────▶│ Cloudflare  │ (CDN, WAF)
                    └──────┬──────┘
                           ▼
                    ┌─────────────┐
                    │ Vercel      │ Next.js
                    └──────┬──────┘
                           ▼
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │ Supabase    │          │ Upstash     │
       │ PostgreSQL  │          │ Redis       │
       └─────────────┘          └─────────────┘
```

**월 예상 비용 (초기)**

- Vercel Pro: ~$20
- Supabase Free → Pro: $0~25
- 본인인증: 건당 ~50원 × MAU

---

## 7. MVP에 포함 / 제외

### 포함 ✅

- Mock 본인인증
- 단어 등록·연결·공감
- 트렌드 목록 (polling)
- 단어 상세 + 연결 랭킹
- 검색 (LIKE)
- 욕설 필터 + 신고 → 자동 비노출
- 성별·연령대 필터 (기본)

### Phase 2 ⏳

- PASS 실연동
- SSE 실시간
- Elasticsearch
- 관리자 대시보드
- 동의어 정규화 ("Trump" = "트럼프")

---

## 8. 이 MVP 저장소 구조

```
c:\Mymind\
├── docs/                 # 설계 문서 (본 파일들)
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/              # 페이지 + API
│   └── lib/              # 비즈니스 로직
├── package.json
└── README.md
```

기술 스택: **Next.js + TypeScript + Tailwind + Prisma + SQLite**
