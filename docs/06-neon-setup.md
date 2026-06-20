# Neon PostgreSQL 설정

## 1. Neon 프로젝트 생성

1. [Neon Console](https://console.neon.tech) 가입
2. **New Project** → 리전 `Asia Pacific (Singapore)` 권장 (한국 사용자)
3. **Connection string** 복사

```txt
postgresql://USER:PASSWORD@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

## 2. 로컬에서 Neon 연결 (선택)

`.env`:

```env
USE_POSTGRES=1
DATABASE_URL="postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require"
```

```bash
npm run db:push
npm run db:seed
npm run dev
```

`prepare-prisma.js`가 PostgreSQL 스키마를 자동 선택합니다.

## 3. Vercel 환경 변수

Vercel Dashboard → Project → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Neon connection string |
| `USE_POSTGRES` | `1` |

첫 배포 시 `vercel-build`가 `prisma db push`로 테이블을 생성합니다.

## 4. Connection Pooling (권장)

Neon **Pooled connection** URL 사용 (호스트에 `-pooler` 포함):

```txt
postgresql://USER:PASSWORD@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

Serverless(Vercel)에서 connection limit 문제를 줄입니다.

## 5. Prisma 스키마 파일

| 파일 | 용도 |
|------|------|
| `schema.sqlite.prisma` | 로컬 SQLite |
| `schema.postgres.prisma` | Neon / Vercel |
| `schema.prisma` | `prepare-prisma.js`가 자동 생성 |

## 6. 데이터 시드

배포 후 한 번 실행 (로컬에서 Neon URL로):

```bash
DATABASE_URL="postgresql://..." npm run db:seed
```

또는 Vercel CLI:

```bash
npx vercel env pull .env.production
npm run db:seed
```

## 7. 주의사항

- SQLite `dev.db` 데이터는 Neon으로 자동 이전되지 않습니다.
- 프로덕션에서는 `prisma migrate deploy` 도입을 권장합니다 (팀 규모 확대 시).
