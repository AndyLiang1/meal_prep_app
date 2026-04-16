import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.execute(db);

  await db.schema
    .createTable("ingredient")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("calories", sql`decimal(10,2)`, (col) => col.notNull())
    .addColumn("protein", sql`decimal(10,2)`, (col) => col.notNull())
    .addColumn("carbs", sql`decimal(10,2)`, (col) => col.notNull())
    .addColumn("fats", sql`decimal(10,2)`, (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createTable("composite_food")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createTable("composite_food_ingredient")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn("composite_food_id", "uuid", (col) =>
      col.notNull().references("composite_food.id").onDelete("cascade")
    )
    .addColumn("ingredient_id", "uuid", (col) =>
      col.notNull().references("ingredient.id").onDelete("cascade")
    )
    .addColumn("quantity", sql`decimal(10,2)`, (col) =>
      col.notNull().defaultTo(1)
    )
    .execute();

  await db.schema
    .createIndex("idx_cfi_composite_food_id")
    .on("composite_food_ingredient")
    .column("composite_food_id")
    .execute();

  await db.schema
    .createIndex("idx_cfi_ingredient_id")
    .on("composite_food_ingredient")
    .column("ingredient_id")
    .execute();

  await db.schema
    .createTable("meal")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createTable("meal_food")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn("meal_id", "uuid", (col) =>
      col.notNull().references("meal.id").onDelete("cascade")
    )
    .addColumn("ingredient_id", "uuid", (col) =>
      col.references("ingredient.id").onDelete("cascade")
    )
    .addColumn("composite_food_id", "uuid", (col) =>
      col.references("composite_food.id").onDelete("cascade")
    )
    .execute();

  await sql`
    ALTER TABLE meal_food ADD CONSTRAINT meal_food_xor_check
    CHECK (
      (ingredient_id IS NOT NULL AND composite_food_id IS NULL) OR
      (ingredient_id IS NULL AND composite_food_id IS NOT NULL)
    )
  `.execute(db);

  await db.schema
    .createIndex("idx_meal_food_meal_id")
    .on("meal_food")
    .column("meal_id")
    .execute();

  await db.schema
    .createTable("meal_group")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("tag", "varchar(100)", (col) => col.notNull())
    .addColumn("display_as_default", "boolean", (col) =>
      col.notNull().defaultTo(false)
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createTable("meal_group_meal")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn("meal_group_id", "uuid", (col) =>
      col.notNull().references("meal_group.id").onDelete("cascade")
    )
    .addColumn("meal_id", "uuid", (col) =>
      col.notNull().references("meal.id").onDelete("cascade")
    )
    .addColumn("sort_order", "integer", (col) => col.notNull().defaultTo(0))
    .execute();

  await db.schema
    .createIndex("idx_mgm_meal_group_id")
    .on("meal_group_meal")
    .column("meal_group_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("meal_group_meal").ifExists().execute();
  await db.schema.dropTable("meal_group").ifExists().execute();
  await db.schema.dropTable("meal_food").ifExists().execute();
  await db.schema.dropTable("meal").ifExists().execute();
  await db.schema.dropTable("composite_food_ingredient").ifExists().execute();
  await db.schema.dropTable("composite_food").ifExists().execute();
  await db.schema.dropTable("ingredient").ifExists().execute();
}
