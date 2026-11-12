// Creates or updates the database tables before each build.
// Runs automatically from `npm run build`. Does nothing when DATABASE_URL is not set
// (demo mode). Migration files live in ./drizzle and are made with `npm run db:generate`.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Hosted Postgres add-ons name the connection string DATABASE_URL or POSTGRES_URL.
const url = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();

if (!url) {
  console.log("[migrate] DATABASE_URL is not set. Skipping (demo mode).");
  process.exit(0);
}

const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("[migrate] Database tables are up to date.");
} catch (error) {
  console.error("[migrate] Could not update the database tables:", error.message ?? error);
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}
