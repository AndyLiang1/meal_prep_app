import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("composite_food")
    .addColumn("serving_size", sql`decimal(10,2)`, (col) =>
      col.notNull().defaultTo(100),
    )
    .execute();

  await db.schema
    .alterTable("composite_food")
    .addColumn("unit", sql`ingredient_unit`, (col) => col.notNull().defaultTo("GRAM"))
    .execute();

  await sql`ALTER TABLE composite_food ALTER COLUMN serving_size DROP DEFAULT`.execute(
    db,
  );
  await sql`ALTER TABLE composite_food ALTER COLUMN unit DROP DEFAULT`.execute(db);

  await sql`
    ALTER TABLE composite_food
    ADD CONSTRAINT composite_food_serving_size_positive
    CHECK (serving_size > 0)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE composite_food
    DROP CONSTRAINT IF EXISTS composite_food_serving_size_positive
  `.execute(db);

  await db.schema.alterTable("composite_food").dropColumn("unit").execute();
  await db.schema.alterTable("composite_food").dropColumn("serving_size").execute();
}
