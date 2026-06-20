# Vercel 배포 가이드

## 사전 준비

- [Vercel](https://vercel.com) 계정
- [Neon](https://neon.tech) PostgreSQL (docs/06-neon-setup.md)
- [Upstash Redis](https://upstash.com) (SSE 멀ti-instance, 선택)

## 1. GitHub 연동

```bash
git init
git add .
git commit -m "MyMind initial deploy"
git remote add origin https://github.com/YOUR_USER/mymind.git
git push -u origin main
```

Vercel Dashboard → **Add New Project** → GitHub repo 선택

## 2. 환경 변수 (Production)

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | ✅ | Neon pooled connection string |
| `USE_POSTGRES` | ✅ | `1` |
| `SESSION_SECRET` | ✅ | 32자 이상 랜덤 문자열 |
| `ADMIN_SECRET` | ✅ | 관리자 비밀번호 |
| `APP_URL` | ✅ | `https://your-domain.vercel.app` |
| `NICE_RETURN_URL` | ✅ | `https://your-domain.vercel.app/auth/nice/callback` |
| `UPSTASH_REDIS_REST_URL` | ⭐ | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | ⭐ | Upstash Redis token |
| `NICE_CLIENT_ID` | ⏳ | PASS 연동 시 |
| `NICE_CLIENT_SECRET` | ⏳ | PASS 연동 시 |
| `NICE_PRODUCT_ID` | ⏳ | PASS 연동 시 |
| `REPORT_THRESHOLD` | | `5` (기본) |

⭐ Upstash 없으면 SSE는 단일 인스턴스 + polling 폴백으로 동작합니다.

## 3. 빌드 설정

`vercel.json`이 자동 적용됩니다:

- **Region**: `icn1` (Seoul)
- **Build**: `npm run vercel-build`
- **SSE maxDuration**: 60초 (Pro 플랜에서 장시간 연결)

### Hobby 플랜 제한

- Serverless 함수 10초 타임아웃 → SSE가 끊길 수 있음
- 클라이언트가 자동으로 **30초 polling**으로 폴백
- Pro 플랜 + `maxDuration: 60` 권장

## 4. CLI 배포 (대안)

```bash
npm i -g vercel
vercel login
vercel link
vercel env add DATABASE_URL
vercel env add USE_POSTGRES
vercel env add SESSION_SECRET
vercel env add ADMIN_SECRET
vercel env add APP_URL
vercel --prod
```

## 5. 배포 후 확인

1. `https://YOUR_APP.vercel.app` — 랜딩
2. Mock 본인인증 → `/home` SSE Live
3. `/admin` — 관리자 로그인
4. 단어 등록 → 트렌드 갱신 확인

## 6. Upstash Redis 설정 (멀ti-instance SSE)

1. Upstash Console → **Create Database** → Region `ap-northeast-1`
2. **REST API** 탭에서 URL / Token 복사
3. Vercel 환경 변수에 추가
4. 재배포

동작 원리:

```
[인스턴스 A] 공감 → Redis INCR version
[인스턴스 B] SSE → 2초마다 version poll → 트렌드 push
```

## 7. 커스텀 도메인

Vercel → Settings → Domains → 도메인 추가

`.env` 업데이트:

```env
APP_URL=https://mymind.example.com
NICE_RETURN_URL=https://mymind.example.com/auth/nice/callback
```

NICE 개발자 콘솔에도 return URL 등록 필요.

## 8. 트러블슈팅

| 증상 | 해결 |
|------|------|
| DB 연결 실패 | Neon pooled URL + `?sslmode=require` 확인 |
| 빌드 중 prisma 오류 | `USE_POSTGRES=1` 설정 확인 |
| SSE 자주 끊김 | Hobby 한계 → polling 폴백 정상, Pro 업그레이드 |
| PASS callback 실패 | `APP_URL`, NICE return URL 일치 확인 |
