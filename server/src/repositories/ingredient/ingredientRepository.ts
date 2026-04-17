import { getDb } from "../../db/database.js";

/**
 * Return-shape convention (same idea as other repos):
 * - Optional single row (`findById`, `update`): `T | null` when nothing matched.
 * - Collections (`findAll`, `findExistingIds`): always an array; “none” is `[]`, not `null`.
 */

export interface IngredientRow {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateIngredientData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export type UpdateIngredientData = Partial<CreateIngredientData>;

export const ingredientRepository = {
  async create(data: CreateIngredientData): Promise<IngredientRow> {
    const row = await getDb()
      .insertInto("ingredient")
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
    return row;
  },

  async findAll(): Promise<IngredientRow[]> {
    const rows = await getDb()
      .selectFrom("ingredient")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();
    return rows;
  },

  async findById(id: string): Promise<IngredientRow | null> {
    const row = await getDb()
      .selectFrom("ingredient")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ?? null;
  },

  async findExistingIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await getDb()
      .selectFrom("ingredient")
      .select("id")
      .where("id", "in", ids)
      .execute();
    const ingredientIds = rows.map((r) => r.id);
    return ingredientIds;
  },

  async update(
    id: string,
    data: UpdateIngredientData
  ): Promise<IngredientRow | null> {
    const row = await getDb()
      .updateTable("ingredient")
      .set({ ...data, updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    return row ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getDb()
      .deleteFrom("ingredient")
      .where("id", "=", id)
      .executeTakeFirst();
    const deletedCount = Number(result.numDeletedRows);
    return deletedCount > 0;
  },
};
