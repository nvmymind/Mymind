# MyMind 프로덕션 DB 시드
# 사용: .\scripts\deploy-seed.ps1 -DatabaseUrl "postgresql://..."

param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl
)

$env:DATABASE_URL = $DatabaseUrl
$env:USE_POSTGRES = "1"

Write-Host "=== Prisma db push ===" -ForegroundColor Cyan
node scripts/prepare-prisma.js
npx prisma db push

Write-Host "=== Seed ===" -ForegroundColor Cyan
npm run db:seed

Write-Host "=== Done ===" -ForegroundColor Green
