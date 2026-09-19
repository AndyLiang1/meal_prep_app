import { getDb, type DatabaseTransaction } from "../../db/database.js";

/** Optional single row → `T | null`; collections → `T[]` (empty = `[]`). */

export interface MealGroupRow {
  id: string;
  name: string;
  tags: string[];
  display_as_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMealGroupData {
  name: string;
  tags?: string[];
  displayAsDefault?: boolean;
}

export interface UpdateMealGroupData {
  name?: string;
  tags?: string[];
  displayAsDefault?: boolean;
}

export const mealGroupRepository = {
  async create(
    data: CreateMealGroupData,
    transaction: DatabaseTransaction,
  ): Promise<MealGroupRow> {
    if (data.displayAsDefault) {
      await transaction
        .updateTable("meal_group")
        .set({ display_as_default: false, updated_at: new Date() })
        .where("display_as_default", "=", true)
        .execute();
    }

    const insertedMealGroup = await transaction
      .insertInto("meal_group")
      .values({
        name: data.name,
        tags: data.tags ?? [],
        display_as_default: data.displayAsDefault ?? false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return insertedMealGroup;
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

  /**
   * Same as `findById`, but locks the row until `transaction` commits
   * (`SELECT … FOR UPDATE`). A transaction alone does not stop two creates from
   * reading the same sort orders and inserting the same next value; this lock
   * makes the second create wait, then see the first meal before it picks a
   * sort order.
   */
  async findAndLockById(
    mealGroupId: string,
    transaction: DatabaseTransaction,
  ): Promise<MealGroupRow | null> {
    const lockedMealGroup = await transaction
      .selectFrom("meal_group")
      .selectAll()
      .where("id", "=", mealGroupId)
      .forUpdate()
      .executeTakeFirst();
    return lockedMealGroup ?? null;
  },

  async unsetAllDefaults(exceptId?: string): Promise<void> {
    let query = getDb()
      .updateTable("meal_group")
      .set({ display_as_default: false, updated_at: new Date() })
      .where("display_as_default", "=", true);
    if (exceptId !== undefined) {
      query = query.where("id", "!=", exceptId);
    }
    await query.execute();
  },

  async update(id: string, data: UpdateMealGroupData): Promise<MealGroupRow | null> {
    const patch: Record<string, unknown> = {
      updated_at: new Date(),
    };
    if (data.name !== undefined) {
      patch.name = data.name;
    }
    if (data.tags !== undefined) {
      patch.tags = data.tags;
    }
    if (data.displayAsDefault !== undefined) {
      patch.display_as_default = data.displayAsDefault;
    }

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
