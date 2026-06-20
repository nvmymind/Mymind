# PostgreSQL 마이그레이션

## 로컬 (Docker)

```bash
npm run db:up          # docker compose up -d
```

`.env` 설정:

```env
DATABASE_URL="postgresql://mymind:mymind@localhost:5432/mymind?schema=public"
```

`prisma/schema.prisma`의 provider를 `postgresql`로 변경 후:

```bash
npx prisma db push
npm run db:seed
```

## 클라우드 (Neon / Supabase)

Docker 없이도 무료 PostgreSQL을 사용할 수 있습니다.

1. [Neon](https://neon.tech) 또는 Supabase에서 DB 생성
2. Connection string을 `.env`의 `DATABASE_URL`에 설정
3. schema provider를 `postgresql`로 변경
4. `npx prisma db push`

## SQLite → PostgreSQL 데이터 이전

소량 데이터는 seed 재실행으로 충분합니다.

```bash
npm run db:seed
```

대량 이전 시 Prisma migrate 또는 pgloader 사용.

## 프로덕션 체크리스트

- [ ] `provider = "postgresql"`
- [ ] Connection pooling (PgBouncer / Neon pooler)
- [ ] 정기 백업
- [ ] SSE 멀티 인스턴스 → Redis Pub/Sub 추가

## provider 전환 스크립트 (Windows)

```powershell
# PostgreSQL로 전환
(Get-Content prisma/schema.prisma) -replace 'provider = "sqlite"', 'provider = "postgresql"' | Set-Content prisma/schema.prisma
npx prisma generate
npx prisma db push
```

```powershell
# SQLite로 복귀 (로컬 개발)
(Get-Content prisma/schema.prisma) -replace 'provider = "postgresql"', 'provider = "sqlite"' | Set-Content prisma/schema.prisma
# .env: DATABASE_URL="file:./dev.db"
npx prisma generate
npx prisma db push
```
