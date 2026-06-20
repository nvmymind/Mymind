# Vercel CLI 배포 (Windows)
# 1. npx vercel login
# 2. .\scripts\deploy-vercel.ps1

Write-Host "=== MyMind Vercel Deploy ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "사전 준비:" -ForegroundColor Yellow
Write-Host "  1. node scripts/generate-secrets.js  -> Vercel env에 등록"
Write-Host "  2. Neon DATABASE_URL + USE_POSTGRES=1"
Write-Host "  3. npx vercel login"
Write-Host ""

if (-not (Test-Path ".vercel/project.json")) {
  Write-Host "Vercel 프로젝트 연결 중..." -ForegroundColor Cyan
  npx vercel link
}

Write-Host "프로덕션 배포..." -ForegroundColor Cyan
npx vercel --prod

Write-Host ""
Write-Host "배포 후:" -ForegroundColor Yellow
Write-Host "  - Vercel Dashboard에서 APP_URL, NICE_RETURN_URL 설정"
Write-Host "  - .\scripts\deploy-seed.ps1 -DatabaseUrl `"postgresql://...`""
