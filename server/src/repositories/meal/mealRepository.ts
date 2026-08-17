import { getDb, type DatabaseTransaction } from "../../db/database.js";

/** Optional single row → `T | null`; collections → `T[]` (empty = `[]`). */

export interface MealRow {
  id: string;
  name: string;
  meal_group_id: string;
  sort_order: number;
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
  mealGroupId: string;
  sortOrder: number;
}

export const mealRepository = {
  async create(
    data: CreateMealData,
    transaction?: DatabaseTransaction,
  ): Promise<MealRow> {
    const databaseConnection = transaction ?? getDb();
    const insertedMeal = await databaseConnection
      .insertInto("meal")
      .values({
        name: data.name,
        meal_group_id: data.mealGroupId,
        sort_order: data.sortOrder,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return insertedMeal;
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

  async findByIds(ids: string[]): Promise<MealRow[]> {
    if (ids.length === 0) return [];
    const rows = await getDb()
      .selectFrom("meal")
      .selectAll()
      .where("id", "in", ids)
      .execute();
    return rows;
  },

  async findByMealGroupId(mealGroupId: string): Promise<MealRow[]> {
    const rows = await getDb()
      .selectFrom("meal")
      .selectAll()
      .where("meal_group_id", "=", mealGroupId)
      .orderBy("sort_order", "asc")
      .execute();
    return rows;
  },

  async findExistingIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await getDb()
      .selectFrom("meal")
      .select("id")
      .where("id", "in", ids)
      .execute();
    const mealIds = rows.map((mealRow) => mealRow.id);
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

  async update(
    id: string,
    data: { name?: string; sortOrder?: number } = {},
  ): Promise<MealRow | null> {
    const setValues: { updated_at: Date; name?: string; sort_order?: number } = {
      updated_at: new Date(),
    };
    if (data.name !== undefined) {
      setValues.name = data.name;
    }
    if (data.sortOrder !== undefined) {
      setValues.sort_order = data.sortOrder;
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
