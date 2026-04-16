import type { Migration, MigrationProvider } from "kysely";
import { Migrator } from "kysely";
import { getDb } from "./database.js";
import * as path from "path";
import { promises as fs } from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "migrations");
const migrationFilePattern = /\.(js|mjs|ts|mts)$/;

class FileUrlMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    const migrations: Record<string, Migration> = {};
    const files = await fs.readdir(migrationsDir);

    for (const fileName of files) {
      const isMigrationFile =
        migrationFilePattern.test(fileName) &&
        !fileName.endsWith(".d.ts") &&
        !fileName.endsWith(".d.mts");

      if (!isMigrationFile) {
        continue;
      }

      // ESM dynamic imports expect file URLs; plain absolute paths break on Windows.
      const migrationPath = pathToFileURL(path.join(migrationsDir, fileName)).href;
      const migrationModule = await import(migrationPath);
      const migrationKey = fileName.slice(0, fileName.lastIndexOf("."));
      const migration = migrationModule.default ?? migrationModule;

      if (isMigration(migration)) {
        migrations[migrationKey] = migration;
      }
    }

    return migrations;
  }
}

function isMigration(value: unknown): value is Migration {
  return typeof value === "object" && value !== null && "up" in value;
}

async function migrate() {
  const db = getDb();

  const migrator = new Migrator({
    db,
    provider: new FileUrlMigrationProvider(),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`Migration "${it.migrationName}" executed successfully`);
    } else if (it.status === "Error") {
      console.error(`Migration "${it.migrationName}" failed`);
    }
  });

  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }

  await db.destroy();
}

migrate();
