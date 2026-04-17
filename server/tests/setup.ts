import { sql } from "kysely";
import { afterAll, afterEach } from "vitest";
import { getDb } from "../src/db/database.js";

process.env.LOG_LEVEL = "silent";

afterEach(async () => {
  await sql`
    TRUNCATE TABLE
      meal_group_meal,
      meal_group,
      meal_food,
      meal,
      composite_food_ingredient,
      composite_food,
      ingredient
    RESTART IDENTITY CASCADE
  `.execute(getDb());
});

afterAll(async () => {
  await getDb().destroy();
});
