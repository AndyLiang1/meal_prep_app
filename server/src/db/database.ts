import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { config } from "../config.js";
import type { DB as Database } from "./types.js";

// Return NUMERIC/DECIMAL columns as JS numbers instead of strings.
pg.types.setTypeParser(1700, (value) => (value === null ? null : parseFloat(value)));

let _db: Kysely<Database> | null = null;

export function getDb(): Kysely<Database> {
  if (!_db) {
    _db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new pg.Pool({ connectionString: config.DATABASE_URL }),
      }),
    });
  }
  return _db;
}
