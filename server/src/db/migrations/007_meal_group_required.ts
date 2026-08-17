import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`DELETE FROM meal WHERE meal_group_id IS NULL`.execute(db);
  await sql`UPDATE meal SET sort_order = 0 WHERE sort_order IS NULL`.execute(db);

  await sql`ALTER TABLE meal ALTER COLUMN meal_group_id SET NOT NULL`.execute(db);
  await sql`ALTER TABLE meal ALTER COLUMN sort_order SET NOT NULL`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE meal ALTER COLUMN meal_group_id DROP NOT NULL`.execute(db);
  await sql`ALTER TABLE meal ALTER COLUMN sort_order DROP NOT NULL`.execute(db);
}
