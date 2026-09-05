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

export interface CreateMealRepoInput {
  name: string;
  mealGroupId: string;
  sortOrder: number;
}

export const mealRepository = {
  async create(
    createMealInput: CreateMealRepoInput,
    transaction?: DatabaseTransaction,
  ): Promise<MealRow> {
    const databaseConnection = transaction ?? getDb();
    const insertedMeal = await databaseConnection
      .insertInto("meal")
      .values({
        name: createMealInput.name,
        meal_group_id: createMealInput.mealGroupId,
        sort_order: createMealInput.sortOrder,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return insertedMeal;
  },

  async findAll(): Promise<MealRow[]> {
    const mealRows = await getDb()
      .selectFrom("meal")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute();
    return mealRows;
  },

  async findById(mealId: string): Promise<MealRow | null> {
    const mealRecord = await getDb()
      .selectFrom("meal")
      .selectAll()
      .where("id", "=", mealId)
      .executeTakeFirst();
    return mealRecord ?? null;
  },

  async findByIds(mealIds: string[]): Promise<MealRow[]> {
    if (mealIds.length === 0) return [];
    const mealRows = await getDb()
      .selectFrom("meal")
      .selectAll()
      .where("id", "in", mealIds)
      .execute();
    return mealRows;
  },

  async findByMealGroupId(mealGroupId: string): Promise<MealRow[]> {
    const mealRows = await getDb()
      .selectFrom("meal")
      .selectAll()
      .where("meal_group_id", "=", mealGroupId)
      .orderBy("sort_order", "asc")
      .execute();
    return mealRows;
  },

  async findExistingIds(mealIds: string[]): Promise<string[]> {
    if (mealIds.length === 0) return [];
    const mealIdRows = await getDb()
      .selectFrom("meal")
      .select("id")
      .where("id", "in", mealIds)
      .execute();
    const existingMealIds = mealIdRows.map((mealRow) => mealRow.id);
    return existingMealIds;
  },

  async findFoodsByMealId(mealId: string): Promise<MealFoodRow[]> {
    const mealFoodRows = await getDb()
      .selectFrom("meal_food")
      .selectAll()
      .where("meal_id", "=", mealId)
      .execute();
    return mealFoodRows;
  },

  async findFoodsByMealIds(mealIds: string[]): Promise<MealFoodRow[]> {
    if (mealIds.length === 0) return [];
    const mealFoodRows = await getDb()
      .selectFrom("meal_food")
      .selectAll()
      .where("meal_id", "in", mealIds)
      .execute();
    return mealFoodRows;
  },

  async update(
    mealId: string,
    updateMealInput: { name?: string; sortOrder?: number } = {},
    transaction?: DatabaseTransaction,
  ): Promise<MealRow | null> {
    const mealSetValues: {
      updated_at: Date;
      name?: string;
      sort_order?: number;
    } = {
      updated_at: new Date(),
    };
    if (updateMealInput.name !== undefined) {
      mealSetValues.name = updateMealInput.name;
    }
    if (updateMealInput.sortOrder !== undefined) {
      mealSetValues.sort_order = updateMealInput.sortOrder;
    }

    const databaseConnection = transaction ?? getDb();
    const updatedMealRecord = await databaseConnection
      .updateTable("meal")
      .set(mealSetValues)
      .where("id", "=", mealId)
      .returningAll()
      .executeTakeFirst();
    return updatedMealRecord ?? null;
  },

  async replaceFoods(
    mealId: string,
    mealFoodRefs: MealFoodRef[],
  ): Promise<MealFoodRow[]> {
    const replacedMealFoodRows = await getDb()
      .transaction()
      .execute(async (transaction) => {
        await transaction
          .deleteFrom("meal_food")
          .where("meal_id", "=", mealId)
          .execute();

        if (mealFoodRefs.length === 0) {
          return [];
        }

        const insertedMealFoodRows = await transaction
          .insertInto("meal_food")
          .values(
            mealFoodRefs.map((mealFoodRef) => ({
              meal_id: mealId,
              ingredient_id: mealFoodRef.ingredientId ?? null,
              composite_food_id: mealFoodRef.compositeFoodId ?? null,
              amount: mealFoodRef.amount,
            })),
          )
          .returningAll()
          .execute();
        return insertedMealFoodRows;
      });
    return replacedMealFoodRows;
  },

  async delete(mealId: string): Promise<boolean> {
    const deleteResult = await getDb()
      .deleteFrom("meal")
      .where("id", "=", mealId)
      .executeTakeFirst();
    const deletedCount = Number(deleteResult.numDeletedRows);
    return deletedCount > 0;
  },
};
