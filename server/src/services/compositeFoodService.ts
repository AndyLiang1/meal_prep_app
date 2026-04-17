import {
  compositeFoodRepository,
  type CompositeIngredientJoinRow,
} from "../repositories/compositeFood/compositeFoodRepository.js";
import { ingredientRepository } from "../repositories/ingredient/ingredientRepository.js";

interface IngredientRef {
  ingredientId: string;
  quantity: number;
}

interface CreateCompositeFoodInput {
  name: string;
  ingredients: IngredientRef[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeMacros(rows: CompositeIngredientJoinRow[]) {
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

function formatIngredients(rows: CompositeIngredientJoinRow[]) {
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
    const uniqueIds = [
      ...new Set(input.ingredients.map((r) => r.ingredientId)),
    ];
    const existingIds = await ingredientRepository.findExistingIds(uniqueIds);
    if (existingIds.length !== uniqueIds.length) {
      return { error: "One or more ingredients not found" };
    }

    const compositeFood = await compositeFoodRepository.createWithIngredients(
      input
    );
    const rows = await compositeFoodRepository.findIngredientRows(
      compositeFood.id
    );
    return {
      ...compositeFood,
      ingredients: formatIngredients(rows),
    };
  },

  async list() {
    const foods = await compositeFoodRepository.findAll();

    return await Promise.all(
      foods.map(async (cf) => {
        const rows = await compositeFoodRepository.findIngredientRows(cf.id);
        return {
          ...cf,
          ...computeMacros(rows),
          ingredients: formatIngredients(rows),
        };
      })
    );
  },

  async getById(id: string) {
    const cf = await compositeFoodRepository.findById(id);
    if (!cf) return null;

    const rows = await compositeFoodRepository.findIngredientRows(cf.id);
    return {
      ...cf,
      ...computeMacros(rows),
      ingredients: formatIngredients(rows),
    };
  },

  async delete(id: string) {
    return await compositeFoodRepository.delete(id);
  },
};
