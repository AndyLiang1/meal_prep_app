import { compositeFoodRepository } from "../repositories/compositeFood/compositeFoodRepository.js";
import { ingredientRepository } from "../repositories/ingredient/ingredientRepository.js";
import {
  mealRepository,
  type CreateMealData,
  type UpdateMealData,
} from "../repositories/meal/mealRepository.js";

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
  const rows = await compositeFoodRepository.findIngredientRows(compositeFoodId);

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
  const foods = await mealRepository.findFoodsByMealId(mealId);

  return await Promise.all(
    foods.map(async (mf): Promise<MealFoodDetail> => {
      if (mf.ingredient_id) {
        const ing = await ingredientRepository.findById(mf.ingredient_id);

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
      const cf = await compositeFoodRepository.findById(compositeFoodId);
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
  async create(input: CreateMealData) {
    const meal = await mealRepository.createWithFoods(input);
    const foods = await getMealFoodDetails(meal.id);
    return {
      ...meal,
      foods,
      ...sumMacros(foods),
    };
  },

  async list() {
    const meals = await mealRepository.findAll();

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

  async update(id: string, input: UpdateMealData) {
    const updated = await mealRepository.update(id, input);
    if (!updated) return null;

    const foods = await getMealFoodDetails(updated.id);
    return {
      ...updated,
      foods,
      ...sumMacros(foods),
    };
  },

  async delete(id: string) {
    return await mealRepository.delete(id);
  },
};
