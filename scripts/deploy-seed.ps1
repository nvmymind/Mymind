# MyMind 프로덕션 DB 시드
# 사용: .\scripts\deploy-seed.ps1 -DatabaseUrl "postgresql://USER:PASS@ep-xxx-pooler.../neondb?sslmode=require"

param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl
)

if ($DatabaseUrl -match "붙여넣기|\.\.\." ) {
  Write-Host "ERROR: Neon에서 복사한 실제 Connection string을 넣어 주세요." -ForegroundColor Red
  Write-Host "  (붙여넣기) 또는 ... 는 예시 문구입니다." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Neon 콘솔 → Connect → Pooled connection → 복사" -ForegroundColor Cyan
  exit 1
}

if (-not $DatabaseUrl.StartsWith("postgresql://") -and -not $DatabaseUrl.StartsWith("postgres://")) {
  Write-Host "ERROR: URL은 postgresql:// 로 시작해야 합니다." -ForegroundColor Red
  exit 1
}

$env:DATABASE_URL = $DatabaseUrl
$env:USE_POSTGRES = "1"

Write-Host "=== Prisma schema (PostgreSQL) ===" -ForegroundColor Cyan
node scripts/prepare-prisma.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== Prisma generate ===" -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== Prisma db push ===" -ForegroundColor Cyan
npx prisma db push
if ($LASTEXITCODE -ne 0) {
  Write-Host "DB 연결 실패. Neon URL이 Pooled connection인지 확인하세요." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "=== Seed ===" -ForegroundColor Cyan
npx tsx prisma/seed.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== Done ===" -ForegroundColor Green
