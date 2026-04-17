import { getDb } from "../../db/database.js";

/** Optional single row → `T | null`; collections → `T[]` (empty = `[]`). */

export interface MealRow {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface MealFoodRow {
  id: string;
  meal_id: string;
  ingredient_id: string | null;
  composite_food_id: string | null;
}

export interface MealFoodRef {
  ingredientId?: string;
  compositeFoodId?: string;
}

export interface CreateMealData {
  name: string;
  foods: MealFoodRef[];
}

export interface UpdateMealData {
  name?: string;
}

export const mealRepository = {
  async createWithFoods(data: CreateMealData): Promise<MealRow> {
    return await getDb()
      .transaction()
      .execute(async (transaction) => {
        const meal = await transaction
          .insertInto("meal")
          .values({ name: data.name })
          .returningAll()
          .executeTakeFirstOrThrow();

        if (data.foods.length > 0) {
          await transaction
            .insertInto("meal_food")
            .values(
              data.foods.map((ref) => ({
                meal_id: meal.id,
                ingredient_id: ref.ingredientId ?? null,
                composite_food_id: ref.compositeFoodId ?? null,
              }))
            )
            .execute();
        }

        return meal;
      });
  },

  async findAll(): Promise<MealRow[]> {
    return await getDb()
      .selectFrom("meal")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute();
  },

  async findById(id: string): Promise<MealRow | null> {
    const row = await getDb()
      .selectFrom("meal")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ?? null;
  },

  async findFoodsByMealId(mealId: string): Promise<MealFoodRow[]> {
    return await getDb()
      .selectFrom("meal_food")
      .selectAll()
      .where("meal_id", "=", mealId)
      .execute();
  },

  async update(id: string, data: UpdateMealData): Promise<MealRow | null> {
    const row = await getDb()
      .updateTable("meal")
      .set({ ...data, updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    return row ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getDb()
      .deleteFrom("meal")
      .where("id", "=", id)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  },
};
