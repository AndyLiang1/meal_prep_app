import { getDb } from "../../db/database.js";

/** Optional single row → `T | null`; collections → `T[]` (empty = `[]`). */

export interface MealGroupRow {
  id: string;
  name: string;
  tag: string;
  display_as_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MealGroupMealRow {
  id: string;
  meal_group_id: string;
  meal_id: string;
  sort_order: number;
}

export interface MealGroupMealRef {
  mealId: string;
  sortOrder?: number;
}

export interface CreateMealGroupData {
  name: string;
  tag: string;
  displayAsDefault?: boolean;
  meals: MealGroupMealRef[];
}

export interface UpdateMealGroupData {
  name?: string;
  tag?: string;
  displayAsDefault?: boolean;
}

export const mealGroupRepository = {
  async createWithMeals(data: CreateMealGroupData): Promise<MealGroupRow> {
    const mealGroup = await getDb()
      .transaction()
      .execute(async (transaction) => {
        const insertedMealGroup = await transaction
          .insertInto("meal_group")
          .values({
            name: data.name,
            tag: data.tag,
            display_as_default: data.displayAsDefault ?? false,
          })
          .returningAll()
          .executeTakeFirstOrThrow();

        if (data.meals.length > 0) {
          await transaction
            .insertInto("meal_group_meal")
            .values(
              data.meals.map((ref, index) => ({
                meal_group_id: insertedMealGroup.id,
                meal_id: ref.mealId,
                sort_order: ref.sortOrder ?? index,
              }))
            )
            .execute();
        }

        return insertedMealGroup;
      });
    return mealGroup;
  },

  async findAll(): Promise<MealGroupRow[]> {
    const rows = await getDb()
      .selectFrom("meal_group")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute();
    return rows;
  },

  async findById(id: string): Promise<MealGroupRow | null> {
    const row = await getDb()
      .selectFrom("meal_group")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ?? null;
  },

  async findMealsByMealGroupId(
    mealGroupId: string
  ): Promise<MealGroupMealRow[]> {
    const rows = await getDb()
      .selectFrom("meal_group_meal")
      .selectAll()
      .where("meal_group_id", "=", mealGroupId)
      .orderBy("sort_order", "asc")
      .execute();
    return rows;
  },

  async unsetDefaultsForTag(tag: string, exceptId?: string): Promise<void> {
    let query = getDb()
      .updateTable("meal_group")
      .set({ display_as_default: false, updated_at: new Date() })
      .where("tag", "=", tag)
      .where("display_as_default", "=", true);
    if (exceptId !== undefined) {
      query = query.where("id", "!=", exceptId);
    }
    await query.execute();
  },

  async update(
    id: string,
    data: UpdateMealGroupData
  ): Promise<MealGroupRow | null> {
    const patch = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.tag !== undefined && { tag: data.tag }),
      ...(data.displayAsDefault !== undefined && {
        display_as_default: data.displayAsDefault,
      }),
      updated_at: new Date(),
    };

    const row = await getDb()
      .updateTable("meal_group")
      .set(patch)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    return row ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getDb()
      .deleteFrom("meal_group")
      .where("id", "=", id)
      .executeTakeFirst();
    const deletedCount = Number(result.numDeletedRows);
    return deletedCount > 0;
  },
};
