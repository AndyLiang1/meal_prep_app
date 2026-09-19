import {
  compositeFoodRepository,
  type CompositeIngredientJoinRow,
  type CompositeFoodWithIngredientsJoinRow,
} from "../../repositories/compositeFood/compositeFoodRepository.js";
import { ingredientRepository } from "../../repositories/ingredient/ingredientRepository.js";
import type { TCompositeFood } from "../../types.js";
import type { TIngredientUnit } from "../../schemas/ingredient.js";
import {
  createCompositeFoodSchema,
  updateCompositeFoodSchema,
  type CreateCompositeFoodInput,
  type UpdateCompositeFoodInput,
} from "../../schemas/compositeFood.js";

function round2(value: number): number {
  const scaled = Math.round(value * 100);
  return scaled / 100;
}

// Ingredient macros are stored relative to `serving_size` in the ingredient's
// `unit`; composite entries supply an `amount` in that same unit, so we scale
// by `amount / serving_size`.
function scaleFor(compositeIngredientJoinRow: CompositeIngredientJoinRow): number {
  const scale =
    compositeIngredientJoinRow.amount / compositeIngredientJoinRow.serving_size;
  return scale;
}

function computeMacros(compositeIngredientJoinRows: CompositeIngredientJoinRow[]) {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;
  for (const compositeIngredientJoinRow of compositeIngredientJoinRows) {
    const scale = scaleFor(compositeIngredientJoinRow);
    calories += compositeIngredientJoinRow.calories * scale;
    protein += compositeIngredientJoinRow.protein * scale;
    carbs += compositeIngredientJoinRow.carbs * scale;
    fats += compositeIngredientJoinRow.fats * scale;
  }
  return {
    calories: round2(calories),
    protein: round2(protein),
    carbs: round2(carbs),
    fats: round2(fats),
  };
}

function formatIngredients(compositeIngredientJoinRows: CompositeIngredientJoinRow[]) {
  const formattedIngredients = compositeIngredientJoinRows.map(
    (compositeIngredientJoinRow) => {
      const formattedIngredient = {
        ingredientId: compositeIngredientJoinRow.ingredient_id,
        name: compositeIngredientJoinRow.name,
        amount: compositeIngredientJoinRow.amount,
        unit: compositeIngredientJoinRow.unit,
        servingSize: compositeIngredientJoinRow.serving_size,
        calories: compositeIngredientJoinRow.calories,
        protein: compositeIngredientJoinRow.protein,
        carbs: compositeIngredientJoinRow.carbs,
        fats: compositeIngredientJoinRow.fats,
      };
      return formattedIngredient;
    },
  );
  return formattedIngredients;
}

interface CompositeFoodAccumulator {
  name: string;
  servingSize: number;
  unit: TIngredientUnit;
  ingredientRows: CompositeIngredientJoinRow[];
}

export function buildCompositeFoods(
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
    const validatedCompositeFood = createCompositeFoodSchema.safeParse(input);
    if (!validatedCompositeFood.success) {
      throw new Error("Invalid composite food data");
    }
    const validatedInput = validatedCompositeFood.data;

    const uniqueIds = [
      ...new Set(
        validatedInput.ingredients.map((ingredientRef) => ingredientRef.ingredientId),
      ),
    ];
    const existingIds = await ingredientRepository.findExistingIds(uniqueIds);
    if (existingIds.length !== uniqueIds.length) {
      throw new Error("One or more ingredients not found");
    }

    const { created_at, updated_at, ...compositeFood } =
      await compositeFoodRepository.createWithIngredients(validatedInput);
    const compositeIngredientJoinRows =
      await compositeFoodRepository.findIngredientRows(compositeFood.id);
    const ingredients = formatIngredients(compositeIngredientJoinRows);
    const macros = computeMacros(compositeIngredientJoinRows);
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
    const validatedCompositeFood = updateCompositeFoodSchema.safeParse(input);
    if (!validatedCompositeFood.success) {
      throw new Error("Invalid composite food data");
    }
    const validatedInput = validatedCompositeFood.data;

    if (validatedInput.ingredients) {
      const uniqueIngredientIds = [
        ...new Set(
          validatedInput.ingredients.map((ingredient) => ingredient.ingredientId),
        ),
      ];
      const existingIngredientIds =
        await ingredientRepository.findExistingIds(uniqueIngredientIds);
      if (existingIngredientIds.length !== uniqueIngredientIds.length) {
        throw new Error("One or more ingredients not found");
      }
    }

    const updatedCompositeFoodRow = await compositeFoodRepository.update(
      id,
      validatedInput,
    );
    if (!updatedCompositeFoodRow) return null;

    const updatedCompositeFoodJoinRows =
      await compositeFoodRepository.findByIdWithIngredients(id);
    if (updatedCompositeFoodJoinRows.length === 0) return null;
    const compositeFoods = buildCompositeFoods(updatedCompositeFoodJoinRows);
    return compositeFoods[0];
  },

  async delete(id: string) {
    const deleted = await compositeFoodRepository.delete(id);
    return deleted;
  },
};
