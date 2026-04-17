import { mealRepository } from "./mealRepository.js";
import type { MealFoodRef, MealRow } from "./mealRepository.js";
import { ingredientRepository } from "../ingredient/ingredientRepository.js";
import { buildIngredientInput } from "../ingredient/ingredientRepository.fixtures.js";

export async function createTestMeal(
  mealName = "meal-default",
  ingredientFoodCount = 0
): Promise<MealRow> {
  const foods: MealFoodRef[] = [];
  for (let index = 0; index < ingredientFoodCount; index++) {
    const ingredientRow = await ingredientRepository.create(
      buildIngredientInput({
        name: `${mealName}-ingredient-${index}`,
      })
    );
    foods.push({ ingredientId: ingredientRow.id });
  }

  const meal = await mealRepository.createWithFoods({
    name: mealName,
    foods,
  });
  return meal;
}
