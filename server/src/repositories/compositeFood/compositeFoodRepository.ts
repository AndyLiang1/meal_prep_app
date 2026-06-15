import { getDb } from "../../db/database.js";
import type { TIngredientUnit } from "../../schemas/ingredient.js";

/** Optional single row → `T | null`; collections → `T[]` (empty = `[]`). */

export interface CompositeFoodRow {
  id: string;
  name: string;
  serving_size: number;
  unit: TIngredientUnit;
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
  cf_serving_size: number;
  cf_unit: TIngredientUnit;
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
  servingSize: number;
  unit: TIngredientUnit;
  ingredients: Array<{ ingredientId: string; amount: number }>;
}

export interface UpdateCompositeFoodInput {
  name?: string;
  servingSize?: number;
  unit?: TIngredientUnit;
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
          .values({
            name: data.name,
            serving_size: data.servingSize,
            unit: data.unit,
          })
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
        "cf.serving_size as cf_serving_size",
        "cf.unit as cf_unit",
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
    // Kysely can't infer the shape through aliased columns + LEFT JOINs
    return rows as CompositeFoodWithIngredientsJoinRow[];
  },

  async findByIdsWithIngredients(
    ids: string[],
  ): Promise<CompositeFoodWithIngredientsJoinRow[]> {
    if (ids.length === 0) return [];
    const rows = await getDb()
      .selectFrom("composite_food as cf")
      .leftJoin("composite_food_ingredient as cfi", "cfi.composite_food_id", "cf.id")
      .leftJoin("ingredient as i", "i.id", "cfi.ingredient_id")
      .where("cf.id", "in", ids)
      .select([
        "cf.id",
        "cf.name",
        "cf.serving_size as cf_serving_size",
        "cf.unit as cf_unit",
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
    return rows as CompositeFoodWithIngredientsJoinRow[];
  },

  async findByIdWithIngredients(
    id: string,
  ): Promise<CompositeFoodWithIngredientsJoinRow[]> {
    const rows = await this.findByIdsWithIngredients([id]);
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
        const metadataUpdate: Record<string, unknown> = {};
        if (input.name !== undefined) metadataUpdate.name = input.name;
        if (input.servingSize !== undefined)
          metadataUpdate.serving_size = input.servingSize;
        if (input.unit !== undefined) metadataUpdate.unit = input.unit;

        if (Object.keys(metadataUpdate).length > 0) {
          const updated = await tx
            .updateTable("composite_food")
            .set(metadataUpdate)
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
