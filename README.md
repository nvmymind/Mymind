# MyMind

**생각을 단어로 연결하는** 실시간 공감 플랫폼.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/nvmymind/Mymind&env=DATABASE_URL,USE_POSTGRES,SESSION_SECRET,ADMIN_SECRET,APP_URL,NICE_RETURN_URL&envDescription=Neon%20DATABASE_URL%2C%20USE_POSTGRES%3D1%2C%20run%20node%20scripts%2Fgenerate-secrets.js&project-name=mymind&build-command=npm%20run%20vercel-build)

## 빠른 배포

1. 위 **Deploy with Vercel** 버튼 클릭
2. [Neon](https://neon.tech) DB 생성 → `DATABASE_URL` (pooled) 붙여넣기
3. `USE_POSTGRES` = `1`
4. `node scripts/generate-secrets.js` 로 `SESSION_SECRET`, `ADMIN_SECRET` 생성
5. Deploy 후 `APP_URL`, `NICE_RETURN_URL` 설정 → Redeploy
6. 시드: `.\scripts\deploy-seed.ps1 -DatabaseUrl "postgresql://..."`

상세: [docs/08-one-click-deploy.md](docs/08-one-click-deploy.md)

## 로컬 개발

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

## 문서

| 문서 | 내용 |
|------|------|
| [docs/08-one-click-deploy.md](docs/08-one-click-deploy.md) | Vercel + Neon + Upstash |
| [docs/06-neon-setup.md](docs/06-neon-setup.md) | Neon PostgreSQL |
| [docs/07-vercel-deployment.md](docs/07-vercel-deployment.md) | Vercel 상세 |

## GitHub

https://github.com/nvmymind/Mymind
