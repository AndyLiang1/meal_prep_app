import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Runs before other setup files so DATABASE_URL (and friends) are set before
 * any import of `config` / `getDb`. Optional `server.test.env` overrides
 * `server.env` — use it to point at a dedicated test database.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.NODE_ENV = "test";

dotenv.config({ path: path.resolve(__dirname, "../server.env") });
dotenv.config({
  path: path.resolve(__dirname, "../server.test.env"),
  override: true,
});
