import { getDb } from "../db/database.js";

interface FoodRef {
  ingredientId?: string;
  compositeFoodId?: string;
}

interface CreateMealInput {
  name: string;
  foods: FoodRef[];
}

type IngredientFoodDetail = {
  id: string;
  type: "ingredient";
  ingredientId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type CompositeFoodDetail = {
  id: string;
  type: "composite";
  compositeFoodId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type MealFoodDetail = IngredientFoodDetail | CompositeFoodDetail;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function getCompositeMacros(compositeFoodId: string) {
  const rows = await getDb()
    .selectFrom("composite_food_ingredient as cfi")
    .innerJoin("ingredient as i", "i.id", "cfi.ingredient_id")
    .where("cfi.composite_food_id", "=", compositeFoodId)
    .select(["cfi.quantity", "i.calories", "i.protein", "i.carbs", "i.fats"])
    .execute();

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
  return { calories, protein, carbs, fats };
}

async function getMealFoodDetails(mealId: string): Promise<MealFoodDetail[]> {
  const foods = await getDb()
    .selectFrom("meal_food")
    .selectAll()
    .where("meal_id", "=", mealId)
    .execute();

  return await Promise.all(
    foods.map(async (mf): Promise<MealFoodDetail> => {
      if (mf.ingredient_id) {
        const ing = await getDb()
          .selectFrom("ingredient")
          .selectAll()
          .where("id", "=", mf.ingredient_id)
          .executeTakeFirst();

        return {
          id: mf.id,
          type: "ingredient",
          ingredientId: mf.ingredient_id,
          name: ing?.name ?? "Unknown",
          calories: ing?.calories ?? 0,
          protein: ing?.protein ?? 0,
          carbs: ing?.carbs ?? 0,
          fats: ing?.fats ?? 0,
        };
      }

      const compositeFoodId = mf.composite_food_id!;
      const cf = await getDb()
        .selectFrom("composite_food")
        .selectAll()
        .where("id", "=", compositeFoodId)
        .executeTakeFirst();
      const macros = await getCompositeMacros(compositeFoodId);

      return {
        id: mf.id,
        type: "composite",
        compositeFoodId,
        name: cf?.name ?? "Unknown",
        calories: round2(macros.calories),
        protein: round2(macros.protein),
        carbs: round2(macros.carbs),
        fats: round2(macros.fats),
      };
    })
  );
}

function sumMacros(foods: MealFoodDetail[]) {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;
  for (const f of foods) {
    calories += f.calories;
    protein += f.protein;
    carbs += f.carbs;
    fats += f.fats;
  }
  return {
    calories: round2(calories),
    protein: round2(protein),
    carbs: round2(carbs),
    fats: round2(fats),
  };
}

export const mealService = {
  async create(input: CreateMealInput) {
    const db = getDb();

    const meal = await db.transaction().execute(async (trx) => {
      const created = await trx
        .insertInto("meal")
        .values({ name: input.name })
        .returningAll()
        .executeTakeFirstOrThrow();

      if (input.foods.length > 0) {
        await trx
          .insertInto("meal_food")
          .values(
            input.foods.map((ref) => ({
              meal_id: created.id,
              ingredient_id: ref.ingredientId ?? null,
              composite_food_id: ref.compositeFoodId ?? null,
            }))
          )
          .execute();
      }

      return created;
    });

    const foods = await getMealFoodDetails(meal.id);
    return {
      ...meal,
      foods,
      ...sumMacros(foods),
    };
  },

  async list() {
    const meals = await getDb()
      .selectFrom("meal")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute();

    return await Promise.all(
      meals.map(async (m) => {
        const foods = await getMealFoodDetails(m.id);
        return {
          ...m,
          foods,
          ...sumMacros(foods),
        };
      })
    );
  },

  async update(id: string, input: { name?: string }) {
    const updated = await getDb()
      .updateTable("meal")
      .set({ ...input, updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!updated) return null;

    const foods = await getMealFoodDetails(updated.id);
    return {
      ...updated,
      foods,
      ...sumMacros(foods),
    };
  },

  async delete(id: string) {
    const result = await getDb()
      .deleteFrom("meal")
      .where("id", "=", id)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  },
};
