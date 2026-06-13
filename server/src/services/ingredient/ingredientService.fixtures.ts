import type { TIngredient } from "../../types.js";
import { mockCreateIngredientData } from "../../repositories/ingredient/ingredientRepository.fixtures.js";
import type { IngredientRow } from "../../repositories/ingredient/ingredientRepository.js";
import { ingredientRowToTIngredient } from "./ingredientRowToTIngredient.js";

export const MOCK_INGREDIENT_ID_1 = "ingredient-1-id";
export const MOCK_INGREDIENT_ID_2 = "ingredient-2-id";

export const mockExpectedTIngredient1: TIngredient = {
  id: MOCK_INGREDIENT_ID_1,
  name: mockCreateIngredientData.name,
  calories: mockCreateIngredientData.calories,
  protein: mockCreateIngredientData.protein,
  carbs: mockCreateIngredientData.carbs,
  fats: mockCreateIngredientData.fats,
  servingSize: mockCreateIngredientData.servingSize,
  unit: mockCreateIngredientData.unit,
} as const;

export const mockExpectedTIngredient2: TIngredient = {
  id: MOCK_INGREDIENT_ID_2,
  name: mockCreateIngredientData.name,
  calories: mockCreateIngredientData.calories,
  protein: mockCreateIngredientData.protein,
  carbs: mockCreateIngredientData.carbs,
  fats: mockCreateIngredientData.fats,
  servingSize: mockCreateIngredientData.servingSize,
  unit: mockCreateIngredientData.unit,
} as const;

export const mockIngredientRow1: IngredientRow = {
  id: MOCK_INGREDIENT_ID_1,
  name: mockCreateIngredientData.name,
  calories: mockCreateIngredientData.calories,
  protein: mockCreateIngredientData.protein,
  carbs: mockCreateIngredientData.carbs,
  fats: mockCreateIngredientData.fats,
  serving_size: mockCreateIngredientData.servingSize,
  unit: mockCreateIngredientData.unit,
  created_at: new Date("2026-04-22T12:00:00.000Z"),
  updated_at: new Date("2026-04-22T12:00:00.000Z"),
} as const;

export const mockIngredientRow2: IngredientRow = {
  id: MOCK_INGREDIENT_ID_2,
  name: mockCreateIngredientData.name,
  calories: mockCreateIngredientData.calories,
  protein: mockCreateIngredientData.protein,
  carbs: mockCreateIngredientData.carbs,
  fats: mockCreateIngredientData.fats,
  serving_size: mockCreateIngredientData.servingSize,
  unit: mockCreateIngredientData.unit,
  created_at: new Date("2026-04-23T12:00:00.000Z"),
  updated_at: new Date("2026-04-23T12:00:00.000Z"),
} as const;
