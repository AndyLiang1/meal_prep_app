import { getDb } from "../db/database.js";

interface IngredientRef {
  ingredientId: string;
  quantity: number;
}

interface CreateCompositeFoodInput {
  name: string;
  ingredients: IngredientRef[];
}

interface CompositeIngredientRow {
  ingredient_id: string;
  name: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function getCompositeIngredientRows(
  compositeFoodId: string
): Promise<CompositeIngredientRow[]> {
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
}

function computeMacros(rows: CompositeIngredientRow[]) {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;
  for (const r of rows) {
    calories += r.calories * r.quantity;
    protein += r.protein * r.quantity;
    carbs += r.carbs * r.quantity;
    fats += r.fats * r.quantity;
  }
  return {
    calories: round2(calories),
    protein: round2(protein),
    carbs: round2(carbs),
    fats: round2(fats),
  };
}

function formatIngredients(rows: CompositeIngredientRow[]) {
  return rows.map((r) => ({
    ingredientId: r.ingredient_id,
    name: r.name,
    quantity: r.quantity,
    calories: round2(r.calories * r.quantity),
    protein: round2(r.protein * r.quantity),
    carbs: round2(r.carbs * r.quantity),
    fats: round2(r.fats * r.quantity),
  }));
}

export const compositeFoodService = {
  async create(input: CreateCompositeFoodInput) {
    const db = getDb();

    const ids = input.ingredients.map((r) => r.ingredientId);
    const uniqueIds = [...new Set(ids)];
    const existing = await db
      .selectFrom("ingredient")
      .select("id")
      .where("id", "in", uniqueIds)
      .execute();

    if (existing.length !== uniqueIds.length) {
      return { error: "One or more ingredients not found" };
    }

    const compositeFood = await db.transaction().execute(async (trx) => {
      const cf = await trx
        .insertInto("composite_food")
        .values({ name: input.name })
        .returningAll()
        .executeTakeFirstOrThrow();

      await trx
        .insertInto("composite_food_ingredient")
        .values(
          input.ingredients.map((r) => ({
            composite_food_id: cf.id,
            ingredient_id: r.ingredientId,
            quantity: r.quantity,
          }))
        )
        .execute();

      return cf;
    });

    const rows = await getCompositeIngredientRows(compositeFood.id);
    return {
      ...compositeFood,
      ingredients: formatIngredients(rows),
    };
  },

  async list() {
    const foods = await getDb()
      .selectFrom("composite_food")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute();

    return await Promise.all(
      foods.map(async (cf) => {
        const rows = await getCompositeIngredientRows(cf.id);
        return {
          ...cf,
          ...computeMacros(rows),
          ingredients: formatIngredients(rows),
        };
      })
    );
  },

  async getById(id: string) {
    const cf = await getDb()
      .selectFrom("composite_food")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!cf) return null;

    const rows = await getCompositeIngredientRows(cf.id);
    return {
      ...cf,
      ...computeMacros(rows),
      ingredients: formatIngredients(rows),
    };
  },

  async delete(id: string) {
    const result = await getDb()
      .deleteFrom("composite_food")
      .where("id", "=", id)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  },
};
