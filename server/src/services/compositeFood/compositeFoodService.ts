import {
  compositeFoodRepository,
  type CompositeIngredientJoinRow,
  type CompositeFoodWithIngredientsJoinRow,
} from "../../repositories/compositeFood/compositeFoodRepository.js";
import { ingredientRepository } from "../../repositories/ingredient/ingredientRepository.js";
import type { TCompositeFood } from "../../types.js";
import type { TIngredientUnit } from "../../schemas/ingredient.js";
import type {
  CreateCompositeFoodInput,
  UpdateCompositeFoodInput,
} from "../../schemas/compositeFood.js";

function round2(value: number): number {
  const scaled = Math.round(value * 100);
  return scaled / 100;
}

// Ingredient macros are stored relative to `serving_size` in the ingredient's
// `unit`; composite entries supply an `amount` in that same unit, so we scale
// by `amount / serving_size`.
function scaleFor(row: CompositeIngredientJoinRow): number {
  const scale = row.amount / row.serving_size;
  return scale;
}

function computeMacros(rows: CompositeIngredientJoinRow[]) {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;
  for (const r of rows) {
    const scale = scaleFor(r);
    calories += r.calories * scale;
    protein += r.protein * scale;
    carbs += r.carbs * scale;
    fats += r.fats * scale;
  }
  return {
    calories: round2(calories),
    protein: round2(protein),
    carbs: round2(carbs),
    fats: round2(fats),
  };
}

function formatIngredients(rows: CompositeIngredientJoinRow[]) {
  const formatted = rows.map((row) => {
    const detail = {
      ingredientId: row.ingredient_id,
      name: row.name,
      amount: row.amount,
      unit: row.unit,
      servingSize: row.serving_size,
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fats: row.fats,
    };
    return detail;
  });
  return formatted;
}

interface CompositeFoodAccumulator {
  name: string;
  servingSize: number;
  unit: TIngredientUnit;
  ingredientRows: CompositeIngredientJoinRow[];
}

function buildCompositeFoods(
  joinRows: CompositeFoodWithIngredientsJoinRow[],
): TCompositeFood[] {
  const compositeFoodMap = new Map<string, CompositeFoodAccumulator>();

  for (const joinRow of joinRows) {
    if (!compositeFoodMap.has(joinRow.id)) {
      compositeFoodMap.set(joinRow.id, {
        name: joinRow.name,
        servingSize: joinRow.cf_serving_size,
        unit: joinRow.cf_unit,
        ingredientRows: [],
      });
    }
    if (joinRow.ingredient_id !== null) {
      compositeFoodMap.get(joinRow.id)!.ingredientRows.push({
        ingredient_id: joinRow.ingredient_id,
        name: joinRow.ingredient_name!,
        amount: joinRow.amount!,
        serving_size: joinRow.serving_size!,
        unit: joinRow.unit!,
        calories: joinRow.calories!,
        protein: joinRow.protein!,
        carbs: joinRow.carbs!,
        fats: joinRow.fats!,
      });
    }
  }

  const compositeFoods: TCompositeFood[] = [];
  for (const [id, accumulator] of compositeFoodMap) {
    const macros = computeMacros(accumulator.ingredientRows);
    const ingredients = formatIngredients(accumulator.ingredientRows);
    compositeFoods.push({
      id,
      name: accumulator.name,
      servingSize: accumulator.servingSize,
      unit: accumulator.unit,
      ...macros,
      ingredients,
    });
  }
  return compositeFoods;
}

export const compositeFoodService = {
  async create(input: CreateCompositeFoodInput): Promise<TCompositeFood> {
    const uniqueIds = [
      ...new Set(input.ingredients.map((ingredientRef) => ingredientRef.ingredientId)),
    ];
    const existingIds = await ingredientRepository.findExistingIds(uniqueIds);
    if (existingIds.length !== uniqueIds.length) {
      throw new Error("One or more ingredients not found");
    }

    const { created_at, updated_at, ...compositeFood } =
      await compositeFoodRepository.createWithIngredients(input);
    const rows = await compositeFoodRepository.findIngredientRows(compositeFood.id);
    const ingredients = formatIngredients(rows);
    const macros = computeMacros(rows);
    const response: TCompositeFood = {
      id: compositeFood.id,
      name: compositeFood.name,
      servingSize: compositeFood.serving_size,
      unit: compositeFood.unit,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fats: macros.fats,
      ingredients,
    };
    return response;
  },

  async list(): Promise<TCompositeFood[]> {
    const joinRows = await compositeFoodRepository.findAllWithIngredients();
    const compositeFoods = buildCompositeFoods(joinRows);
    return compositeFoods;
  },

  async getById(id: string): Promise<TCompositeFood | null> {
    const joinRows = await compositeFoodRepository.findByIdWithIngredients(id);
    if (joinRows.length === 0) return null;
    const compositeFoods = buildCompositeFoods(joinRows);
    return compositeFoods[0];
  },

  async update(
    id: string,
    input: UpdateCompositeFoodInput,
  ): Promise<TCompositeFood | null> {
    const existingCompositeFood = await compositeFoodRepository.findById(id);
    if (!existingCompositeFood) return null;

    if (input.ingredients) {
      const uniqueIds = [
        ...new Set(input.ingredients.map((ingredient) => ingredient.ingredientId)),
      ];
      const existingIds = await ingredientRepository.findExistingIds(uniqueIds);
      if (existingIds.length !== uniqueIds.length) {
        throw new Error("One or more ingredients not found");
      }
    }

    await compositeFoodRepository.update(id, input);
    const joinRows = await compositeFoodRepository.findByIdWithIngredients(id);
    const compositeFoods = buildCompositeFoods(joinRows);
    return compositeFoods[0];
  },

  async delete(id: string) {
    const deleted = await compositeFoodRepository.delete(id);
    return deleted;
  },
};
