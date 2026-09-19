import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("meal_group")
    .addColumn("tags", sql`text[]`, (col) => col.notNull().defaultTo(sql`'{}'::text[]`))
    .execute();

  await sql`UPDATE meal_group SET tags = ARRAY[tag]`.execute(db);

  await db.schema.alterTable("meal_group").dropColumn("tag").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("meal_group")
    .addColumn("tag", "varchar(100)", (col) => col.notNull().defaultTo(""))
    .execute();

  await sql`UPDATE meal_group SET tag = COALESCE(tags[1], '')`.execute(db);

  await db.schema.alterTable("meal_group").dropColumn("tags").execute();
}
