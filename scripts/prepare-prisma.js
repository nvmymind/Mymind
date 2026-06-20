const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const target = path.join(root, "prisma", "schema.prisma");
const sqlite = path.join(root, "prisma", "schema.sqlite.prisma");
const postgres = path.join(root, "prisma", "schema.postgres.prisma");

const dbUrl = process.env.DATABASE_URL || "";
const usePostgres =
  process.env.VERCEL === "1" ||
  process.env.USE_POSTGRES === "1" ||
  dbUrl.startsWith("postgres");

if (usePostgres) {
  if (!fs.existsSync(postgres)) {
    console.error("Missing prisma/schema.postgres.prisma");
    process.exit(1);
  }
  fs.copyFileSync(postgres, target);
  console.log("[prepare-prisma] Using PostgreSQL schema");
} else {
  if (fs.existsSync(sqlite)) {
    fs.copyFileSync(sqlite, target);
    console.log("[prepare-prisma] Using SQLite schema (local dev)");
  } else {
    console.log("[prepare-prisma] Keeping existing schema.prisma");
  }
}
