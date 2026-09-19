import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("meal_food")
    .addColumn("amount", sql`decimal(10,2)`, (col) => col.notNull().defaultTo(100))
    .execute();

  await sql`ALTER TABLE meal_food ALTER COLUMN amount DROP DEFAULT`.execute(db);

  await sql`
    ALTER TABLE meal_food
    ADD CONSTRAINT meal_food_amount_positive
    CHECK (amount > 0)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE meal_food
    DROP CONSTRAINT IF EXISTS meal_food_amount_positive
  `.execute(db);

  await db.schema.alterTable("meal_food").dropColumn("amount").execute();
}
