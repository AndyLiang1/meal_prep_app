import type { TIngredientUnit } from "./schemas/ingredient.js";

export interface TIngredient {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: number;
  unit: TIngredientUnit;
}

export interface TCompositeFoodIngredient {
  ingredientId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  amount: number;
  unit: TIngredientUnit;
  servingSize: number;
}

export interface TCompositeFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: number;
  unit: TIngredientUnit;
  ingredients: TCompositeFoodIngredient[];
}

export interface TMeal {
  id: string;
  name: string;
  foods: (TIngredient | TCompositeFood)[];
}
