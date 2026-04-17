import type { CreateIngredientData } from "./ingredientRepository.js";

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MISSING_ID = "00000000-0000-0000-0000-000000000000";

export const sampleIngredientInput: CreateIngredientData = {
  name: "ingredient-1",
  calories: 105,
  protein: 1.3,
  carbs: 27,
  fats: 0.4,
};

export function buildIngredientInput(
  overrides: Partial<CreateIngredientData> = {}
): CreateIngredientData {
  return { ...sampleIngredientInput, ...overrides };
}
