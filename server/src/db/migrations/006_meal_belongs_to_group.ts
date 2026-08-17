import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("meal")
    .addColumn("meal_group_id", "uuid", (col) =>
      col.references("meal_group.id").onDelete("cascade"),
    )
    .execute();

  await db.schema.alterTable("meal").addColumn("sort_order", "integer").execute();

  await sql`
    UPDATE meal
    SET meal_group_id = mgm.meal_group_id,
        sort_order = mgm.sort_order
    FROM meal_group_meal mgm
    WHERE meal.id = mgm.meal_id
  `.execute(db);

  await db.schema.dropTable("meal_group_meal").execute();

  await db.schema
    .createIndex("idx_meal_meal_group_id")
    .on("meal")
    .column("meal_group_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("idx_meal_meal_group_id").execute();

  await db.schema
    .createTable("meal_group_meal")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
    )
    .addColumn("meal_group_id", "uuid", (col) =>
      col.notNull().references("meal_group.id").onDelete("cascade"),
    )
    .addColumn("meal_id", "uuid", (col) =>
      col.notNull().references("meal.id").onDelete("cascade"),
    )
    .addColumn("sort_order", "integer", (col) => col.notNull().defaultTo(0))
    .execute();

  await sql`
    INSERT INTO meal_group_meal (meal_group_id, meal_id, sort_order)
    SELECT meal_group_id, id, COALESCE(sort_order, 0)
    FROM meal
    WHERE meal_group_id IS NOT NULL
  `.execute(db);

  await db.schema.alterTable("meal").dropColumn("sort_order").execute();
  await db.schema.alterTable("meal").dropColumn("meal_group_id").execute();
}
