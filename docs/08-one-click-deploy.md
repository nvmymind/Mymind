# 원클릭 배포 가이드 (Vercel + Neon + Upstash)

저장소: [github.com/nvmymind/Mymind](https://github.com/nvmymind/Mymind)

---

## 방법 A — Vercel Dashboard (권장, 10분)

### 1단계: Vercel 프로젝트 생성

1. [vercel.com/new](https://vercel.com/new) 접속
2. GitHub 로그인 → **nvmymind/Mymind** Import
3. Framework: **Next.js** (자동 감지)
4. Build Command: `npm run vercel-build` (vercel.json에 설정됨)
5. **아직 Deploy 하지 말고** Environment Variables 먼저 입력

### 2단계: Neon PostgreSQL

1. [console.neon.tech](https://console.neon.tech) → New Project
2. Region: **Asia Pacific (Singapore)**
3. Connection string → **Pooled connection** 복사
4. Vercel Environment Variables에 추가:

```
DATABASE_URL = postgresql://...@ep-xxx-pooler.../neondb?sslmode=require
USE_POSTGRES = 1
```

> Vercel Marketplace에서 [Neon 연동](https://vercel.com/integrations/neon)을 쓰면 `DATABASE_URL`이 자동 주입됩니다.

### 3단계: 시크릿 생성

로컬에서:

```bash
node scripts/generate-secrets.js
```

출력값을 Vercel에 추가:

```
SESSION_SECRET = (생성된 값)
ADMIN_SECRET = (생성된 값)
REPORT_THRESHOLD = 5
```

### 4단계: Upstash Redis (선택, SSE 멀ti-instance)

1. [console.upstash.com](https://console.upstash.com) → Create Database
2. Region: **ap-northeast-1 (Tokyo)**
3. REST API → URL / Token 복사

```
UPSTASH_REDIS_REST_URL = https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN = xxx
```

### 5단계: Deploy

1. Vercel에서 **Deploy** 클릭
2. 배포 URL 확인 (예: `https://mymind-xxx.vercel.app`)
3. 추가 환경 변수 (Production):

```
APP_URL = https://mymind-xxx.vercel.app
NICE_RETURN_URL = https://mymind-xxx.vercel.app/auth/nice/callback
```

4. **Redeploy** (환경 변수 반영)

### 6단계: 시드 데이터

로컬 PC에서 Neon URL로:

```bash
set DATABASE_URL=postgresql://...@neon.tech/...?sslmode=require
set USE_POSTGRES=1
npm run db:push
npm run db:seed
```

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://..."
$env:USE_POSTGRES="1"
npm run db:push
npm run db:seed
```

### 7단계: 동작 확인

| URL | 확인 |
|-----|------|
| `/` | 랜딩 · mock 본인인증 |
| `/home` | ● Live SSE 또는 ● Polling |
| `/admin` | ADMIN_SECRET 로그인 |
| `/words/new` | 단어 등록 |

---

## 방법 B — Vercel CLI

```bash
npm install -g vercel
vercel login
cd c:\Mymind
vercel link
vercel env add DATABASE_URL
vercel env add USE_POSTGRES
vercel env add SESSION_SECRET
vercel env add ADMIN_SECRET
vercel env add APP_URL
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel --prod
```

로컬 devDependency 사용:

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

---

## 방법 C — Deploy Button

README의 **Deploy with Vercel** 버튼 클릭 → GitHub 연동 → 환경 변수 입력 → Deploy

---

## 환경 변수 체크리스트

- [ ] `DATABASE_URL` (Neon pooled)
- [ ] `USE_POSTGRES` = `1`
- [ ] `SESSION_SECRET` (32자+)
- [ ] `ADMIN_SECRET`
- [ ] `APP_URL` (배포 URL)
- [ ] `NICE_RETURN_URL` (배포 URL + `/auth/nice/callback`)
- [ ] `UPSTASH_REDIS_REST_URL` (선택)
- [ ] `UPSTASH_REDIS_REST_TOKEN` (선택)

---

## 트러블슈팅

| 빌드 오류 | 해결 |
|-----------|------|
| `Can't reach database` | Neon URL + `USE_POSTGRES=1` |
| `prisma db push` 실패 | pooled URL 사용, `sslmode=require` |
| SSE 끊김 | Hobby 정상 → polling 폴백 |
| 빈 트렌드 | `npm run db:seed` 실행 |

---

## CI

GitHub Actions (`.github/workflows/ci.yml`)가 push/PR마다 빌드를 검증합니다.
