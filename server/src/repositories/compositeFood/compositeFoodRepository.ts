import { getDb } from "../../db/database.js";

/** Optional single row → `T | null`; collections → `T[]` (empty = `[]`). */

export interface CompositeFoodRow {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface CompositeIngredientJoinRow {
  ingredient_id: string;
  name: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface CreateCompositeFoodData {
  name: string;
  ingredients: Array<{ ingredientId: string; quantity: number }>;
}

export const compositeFoodRepository = {
  async createWithIngredients(
    data: CreateCompositeFoodData
  ): Promise<CompositeFoodRow> {
    return await getDb()
      .transaction()
      .execute(async (transaction) => {
        const cf = await transaction
          .insertInto("composite_food")
          .values({ name: data.name })
          .returningAll()
          .executeTakeFirstOrThrow();

        await transaction
          .insertInto("composite_food_ingredient")
          .values(
            data.ingredients.map((r) => ({
              composite_food_id: cf.id,
              ingredient_id: r.ingredientId,
              quantity: r.quantity,
            }))
          )
          .execute();

        return cf;
      });
  },

  async findAll(): Promise<CompositeFoodRow[]> {
    return await getDb()
      .selectFrom("composite_food")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute();
  },

  async findById(id: string): Promise<CompositeFoodRow | null> {
    const row = await getDb()
      .selectFrom("composite_food")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ?? null;
  },

  async findIngredientRows(
    compositeFoodId: string
  ): Promise<CompositeIngredientJoinRow[]> {
    return await getDb()
      .selectFrom("composite_food_ingredient as cfi")
      .innerJoin("ingredient as i", "i.id", "cfi.ingredient_id")
      .where("cfi.composite_food_id", "=", compositeFoodId)
      .select([
        "cfi.ingredient_id",
        "i.name",
        "cfi.quantity",
        "i.calories",
        "i.protein",
        "i.carbs",
        "i.fats",
      ])
      .execute();
  },

  async delete(id: string): Promise<boolean> {
    const result = await getDb()
      .deleteFrom("composite_food")
      .where("id", "=", id)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  },
};
