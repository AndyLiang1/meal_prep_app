import { getDb } from "../../db/database.js";
import type { TIngredientUnit } from "../../schemas/ingredient.js";

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
  amount: number;
  serving_size: number;
  unit: TIngredientUnit;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface CompositeFoodWithIngredientsJoinRow {
  id: string;
  name: string;
  ingredient_id: string | null;
  ingredient_name: string | null;
  amount: number | null;
  serving_size: number | null;
  unit: TIngredientUnit | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
}

export interface CreateCompositeFoodData {
  name: string;
  ingredients: Array<{ ingredientId: string; amount: number }>;
}

export interface UpdateCompositeFoodInput {
  name?: string;
  ingredients?: Array<{ ingredientId: string; amount: number }>;
}

export const compositeFoodRepository = {
  async createWithIngredients(
    data: CreateCompositeFoodData,
  ): Promise<CompositeFoodRow> {
    const compositeFood = await getDb()
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
              amount: r.amount,
            })),
          )
          .execute();

        return cf;
      });
    return compositeFood;
  },

  async findAll(): Promise<CompositeFoodRow[]> {
    const rows = await getDb()
      .selectFrom("composite_food")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute();
    return rows;
  },

  async findById(id: string): Promise<CompositeFoodRow | null> {
    const row = await getDb()
      .selectFrom("composite_food")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ?? null;
  },

  async findAllWithIngredients(): Promise<CompositeFoodWithIngredientsJoinRow[]> {
    const rows = await getDb()
      .selectFrom("composite_food as cf")
      .leftJoin("composite_food_ingredient as cfi", "cfi.composite_food_id", "cf.id")
      .leftJoin("ingredient as i", "i.id", "cfi.ingredient_id")
      .select([
        "cf.id",
        "cf.name",
        "cfi.ingredient_id",
        "i.name as ingredient_name",
        "cfi.amount",
        "i.serving_size",
        "i.unit",
        "i.calories",
        "i.protein",
        "i.carbs",
        "i.fats",
      ])
      .orderBy("cf.created_at", "asc")
      .execute();
    return rows;
  },

  async findByIdWithIngredients(
    id: string,
  ): Promise<CompositeFoodWithIngredientsJoinRow[]> {
    const rows = await getDb()
      .selectFrom("composite_food as cf")
      .leftJoin("composite_food_ingredient as cfi", "cfi.composite_food_id", "cf.id")
      .leftJoin("ingredient as i", "i.id", "cfi.ingredient_id")
      .where("cf.id", "=", id)
      .select([
        "cf.id",
        "cf.name",
        "cfi.ingredient_id",
        "i.name as ingredient_name",
        "cfi.amount",
        "i.serving_size",
        "i.unit",
        "i.calories",
        "i.protein",
        "i.carbs",
        "i.fats",
      ])
      .execute();
    return rows;
  },

  async findIngredientRows(
    compositeFoodId: string,
  ): Promise<CompositeIngredientJoinRow[]> {
    const rows = await getDb()
      .selectFrom("composite_food_ingredient as cfi")
      .innerJoin("ingredient as i", "i.id", "cfi.ingredient_id")
      .where("cfi.composite_food_id", "=", compositeFoodId)
      .select([
        "cfi.ingredient_id",
        "i.name",
        "cfi.amount",
        "i.serving_size",
        "i.unit",
        "i.calories",
        "i.protein",
        "i.carbs",
        "i.fats",
      ])
      .execute();
    return rows;
  },

  async update(
    id: string,
    input: UpdateCompositeFoodInput,
  ): Promise<CompositeFoodRow | null> {
    const row = await getDb()
      .transaction()
      .execute(async (tx) => {
        if (input.name !== undefined) {
          const updated = await tx
            .updateTable("composite_food")
            .set({ name: input.name })
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirst();
          if (!updated) return null;
        }

        if (input.ingredients !== undefined) {
          await tx
            .deleteFrom("composite_food_ingredient")
            .where("composite_food_id", "=", id)
            .execute();

          await tx
            .insertInto("composite_food_ingredient")
            .values(
              input.ingredients.map((r) => ({
                composite_food_id: id,
                ingredient_id: r.ingredientId,
                amount: r.amount,
              })),
            )
            .execute();
        }

        const compositeFood = await tx
          .selectFrom("composite_food")
          .selectAll()
          .where("id", "=", id)
          .executeTakeFirst();
        return compositeFood ?? null;
      });
    return row;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getDb()
      .deleteFrom("composite_food")
      .where("id", "=", id)
      .executeTakeFirst();
    const deletedCount = Number(result.numDeletedRows);
    return deletedCount > 0;
  },
};
