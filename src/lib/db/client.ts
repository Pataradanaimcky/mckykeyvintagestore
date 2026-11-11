import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// Reuse one connection pool across hot reloads and warm serverless invocations.
const globalForDb = globalThis as unknown as { __db?: Db };

export function getDb(): Db {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }
  if (!globalForDb.__db) {
    const client = postgres(env.databaseUrl, { max: 5, prepare: false });
    globalForDb.__db = drizzle(client, { schema });
  }
  return globalForDb.__db;
}
