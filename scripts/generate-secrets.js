#!/usr/bin/env node
/**
 * 프로덕션 배포용 시크릿 생성
 * node scripts/generate-secrets.js
 */
const crypto = require("crypto");

const sessionSecret = crypto.randomBytes(32).toString("hex");
const adminSecret = crypto.randomBytes(16).toString("hex");

console.log("=== MyMind 프로덕션 시크릿 (Vercel 환경 변수에 복사) ===\n");
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log(`ADMIN_SECRET=${adminSecret}`);
console.log("\nUSE_POSTGRES=1");
console.log("REPORT_THRESHOLD=5");
console.log("\n⚠️  이 값을 안전한 곳에 저장하세요. 다시 생성되지 않습니다.");
