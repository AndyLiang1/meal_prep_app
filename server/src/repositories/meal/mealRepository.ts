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
  amount: number;
}

export interface MealFoodRef {
  ingredientId?: string;
  compositeFoodId?: string;
  amount: number;
}

export interface CreateMealData {
  name: string;
  foods: MealFoodRef[];
}

export interface UpdateMealData {
  name?: string;
  foods?: MealFoodRef[];
}

export const mealRepository = {
  async createWithFoods(data: CreateMealData): Promise<MealRow> {
    const meal = await getDb()
      .transaction()
      .execute(async (transaction) => {
        const insertedMeal = await transaction
          .insertInto("meal")
          .values({ name: data.name })
          .returningAll()
          .executeTakeFirstOrThrow();

        if (data.foods.length > 0) {
          await transaction
            .insertInto("meal_food")
            .values(
              data.foods.map((ref) => ({
                meal_id: insertedMeal.id,
                ingredient_id: ref.ingredientId ?? null,
                composite_food_id: ref.compositeFoodId ?? null,
                amount: ref.amount,
              })),
            )
            .execute();
        }

        return insertedMeal;
      });
    return meal;
  },

  async findAll(): Promise<MealRow[]> {
    const rows = await getDb()
      .selectFrom("meal")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute();
    return rows;
  },

  async findById(id: string): Promise<MealRow | null> {
    const row = await getDb()
      .selectFrom("meal")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ?? null;
  },

  async findExistingIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await getDb()
      .selectFrom("meal")
      .select("id")
      .where("id", "in", ids)
      .execute();
    const mealIds = rows.map((r) => r.id);
    return mealIds;
  },

  async findFoodsByMealId(mealId: string): Promise<MealFoodRow[]> {
    const rows = await getDb()
      .selectFrom("meal_food")
      .selectAll()
      .where("meal_id", "=", mealId)
      .execute();
    return rows;
  },

  async findFoodsByMealIds(mealIds: string[]): Promise<MealFoodRow[]> {
    if (mealIds.length === 0) return [];
    const rows = await getDb()
      .selectFrom("meal_food")
      .selectAll()
      .where("meal_id", "in", mealIds)
      .execute();
    return rows;
  },

  async update(id: string, data: { name?: string } = {}): Promise<MealRow | null> {
    const setValues: { updated_at: Date; name?: string } = { updated_at: new Date() };
    if (data.name !== undefined) {
      setValues.name = data.name;
    }

    const row = await getDb()
      .updateTable("meal")
      .set(setValues)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    return row ?? null;
  },

  async replaceFoods(mealId: string, foods: MealFoodRef[]): Promise<MealFoodRow[]> {
    const mealFoodRows = await getDb()
      .transaction()
      .execute(async (transaction) => {
        await transaction
          .deleteFrom("meal_food")
          .where("meal_id", "=", mealId)
          .execute();

        if (foods.length === 0) {
          return [];
        }

        const insertedMealFoodRows = await transaction
          .insertInto("meal_food")
          .values(
            foods.map((foodRef) => ({
              meal_id: mealId,
              ingredient_id: foodRef.ingredientId ?? null,
              composite_food_id: foodRef.compositeFoodId ?? null,
              amount: foodRef.amount,
            })),
          )
          .returningAll()
          .execute();
        return insertedMealFoodRows;
      });
    return mealFoodRows;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getDb()
      .deleteFrom("meal")
      .where("id", "=", id)
      .executeTakeFirst();
    const deletedCount = Number(result.numDeletedRows);
    return deletedCount > 0;
  },
};
