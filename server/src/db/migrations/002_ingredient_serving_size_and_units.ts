import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE TYPE ingredient_unit AS ENUM ('GRAM', 'MILLILITER', 'PIECE')`.execute(
    db,
  );

  // Temporary DEFAULT so the NOT NULL add works even if rows exist; dropped below.
  await db.schema
    .alterTable("ingredient")
    .addColumn("serving_size", sql`decimal(10,2)`, (col) => col.notNull().defaultTo(1))
    .execute();

  await db.schema
    .alterTable("ingredient")
    .addColumn("unit", sql`ingredient_unit`, (col) => col.notNull().defaultTo("GRAM"))
    .execute();

  await sql`ALTER TABLE ingredient ALTER COLUMN serving_size DROP DEFAULT`.execute(db);
  await sql`ALTER TABLE ingredient ALTER COLUMN unit DROP DEFAULT`.execute(db);

  await sql`
    ALTER TABLE ingredient
    ADD CONSTRAINT ingredient_serving_size_positive
    CHECK (serving_size > 0)
  `.execute(db);

  await db.schema
    .alterTable("composite_food_ingredient")
    .renameColumn("quantity", "amount")
    .execute();

  await sql`ALTER TABLE composite_food_ingredient ALTER COLUMN amount DROP DEFAULT`.execute(
    db,
  );

  await sql`
    ALTER TABLE composite_food_ingredient
    ADD CONSTRAINT composite_food_ingredient_amount_positive
    CHECK (amount > 0)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE composite_food_ingredient
    DROP CONSTRAINT IF EXISTS composite_food_ingredient_amount_positive
  `.execute(db);

  await sql`ALTER TABLE composite_food_ingredient ALTER COLUMN amount SET DEFAULT 1`.execute(
    db,
  );

  await db.schema
    .alterTable("composite_food_ingredient")
    .renameColumn("amount", "quantity")
    .execute();

  await sql`
    ALTER TABLE ingredient
    DROP CONSTRAINT IF EXISTS ingredient_serving_size_positive
  `.execute(db);

  await db.schema.alterTable("ingredient").dropColumn("unit").execute();
  await db.schema.alterTable("ingredient").dropColumn("serving_size").execute();

  await sql`DROP TYPE IF EXISTS ingredient_unit`.execute(db);
}
