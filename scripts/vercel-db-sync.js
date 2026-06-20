const { execSync } = require("child_process");

const dbUrl = process.env.DATABASE_URL || "";
const shouldSync =
  process.env.VERCEL === "1" &&
  dbUrl.startsWith("postgres") &&
  process.env.SKIP_DB_PUSH !== "1";

if (shouldSync) {
  console.log("[vercel-db-sync] Running prisma db push...");
  execSync("npx prisma db push", { stdio: "inherit" });
} else {
  console.log("[vercel-db-sync] Skipped (not Vercel postgres deploy)");
}
