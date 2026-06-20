# MyMind

**생각을 단어로 연결하는** 실시간 공감 플랫폼 MVP.

## 기능

- 단어 등록 및 연결 (중심 단어 → 연결 단어)
- 공감 (단어·연결별 1인 1회)
- **SSE 실시간 트렌드** + Redis 멀ti-instance + polling 폴백
- 단어 검색
- 성별·연령대 필터
- 욕설 필터 + 신고 → 자동 비노출
- **NICE CheckPlus(PASS) 본인인증** (키 없으면 mock)
- **관리자 대시보드** (`/admin`)

## 문서

| 문서 | 내용 |
|------|------|
| [docs/06-neon-setup.md](docs/06-neon-setup.md) | Neon PostgreSQL |
| [docs/07-vercel-deployment.md](docs/07-vercel-deployment.md) | Vercel 배포 |
| [docs/04-pass-integration.md](docs/04-pass-integration.md) | PASS/NICE 연동 |

## 로컬 개발

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

## 프로덕션 (Vercel + Neon + Upstash)

1. Neon DB → `DATABASE_URL` + `USE_POSTGRES=1`
2. Upstash Redis → `UPSTASH_REDIS_REST_URL/TOKEN`
3. GitHub → Vercel 연동

상세: [docs/07-vercel-deployment.md](docs/07-vercel-deployment.md)
