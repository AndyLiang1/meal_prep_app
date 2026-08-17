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

export type TMealFood =
  | (TIngredient & { amount: number })
  | (TCompositeFood & { amount: number });

export interface TMeal {
  id: string;
  name: string;
  mealGroupId: string;
  sortOrder: number;
  foods: TMealFood[];
}

export interface TMealGroup {
  id: string;
  name: string;
  tags: string[];
  displayAsDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  meals: TMeal[];
}
