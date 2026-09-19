import type { Kysely } from "kysely";
import { sql } from "kysely";

// DEFERRABLE INITIALLY DEFERRED: checked at COMMIT, not after each statement.
// Reorder updates rows one-by-one (A=0,B=1 → B=0 while A is still 0). An
// immediate unique check would reject a valid swap mid-transaction.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE meal ADD CONSTRAINT meal_group_sort_order_unique
    UNIQUE (meal_group_id, sort_order)
    DEFERRABLE INITIALLY DEFERRED
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE meal DROP CONSTRAINT meal_group_sort_order_unique
  `.execute(db);
}
