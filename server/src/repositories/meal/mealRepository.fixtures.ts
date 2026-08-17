import { mealRepository } from "./mealRepository.js";
import type { MealFoodRef, MealRow } from "./mealRepository.js";
import { ingredientRepository } from "../ingredient/ingredientRepository.js";
import { generateIngredientInput } from "../ingredient/ingredientRepository.fixtures.js";

export async function createTestMeal(
  mealGroupId: string,
  mealName = "meal-default",
  ingredientFoodCount = 0,
): Promise<MealRow> {
  const meal = await mealRepository.create({
    name: mealName,
    mealGroupId,
    sortOrder: 0,
  });

  if (ingredientFoodCount === 0) {
    return meal;
  }

  const foods: MealFoodRef[] = [];
  for (let foodIndex = 0; foodIndex < ingredientFoodCount; foodIndex++) {
    const ingredientRow = await ingredientRepository.create(
      generateIngredientInput({
        name: `${mealName}-ingredient-${foodIndex}`,
      }),
    );
    foods.push({ ingredientId: ingredientRow.id, amount: 100 });
  }

  await mealRepository.replaceFoods(meal.id, foods);
  return meal;
}
