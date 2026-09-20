import { Pool } from "pg";

const globalDatabase = globalThis as unknown as {
  gymPool?: Pool;
};

export const db =
  globalDatabase.gymPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 8_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalDatabase.gymPool = db;
}
