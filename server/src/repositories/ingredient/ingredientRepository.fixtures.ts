import type { CreateIngredientData } from "../../schemas/ingredient.js";

export const mockCreateIngredientData: CreateIngredientData = {
  name: "ingredient-1",
  calories: 102,
  protein: 1.1,
  carbs: 1.2,
  fats: 1.3,
  servingSize: 100,
  unit: "GRAM",
};

export function generateIngredientInput(
  overrides: Partial<CreateIngredientData> = {},
): CreateIngredientData {
  return { ...mockCreateIngredientData, ...overrides };
}
