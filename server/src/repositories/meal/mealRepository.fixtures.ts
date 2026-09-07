import { mealRepository } from "./mealRepository.js";
import type { MealFoodRef, MealRow } from "./mealRepository.js";
import { getDb } from "../../db/database.js";

export async function createTestMeal(
  mealGroupId: string,
  mealName = "meal-default",
  foods: MealFoodRef[] = [],
): Promise<MealRow> {
  const meal = await mealRepository.create({
    name: mealName,
    mealGroupId,
    sortOrder: 0,
  });

  if (foods.length === 0) {
    return meal;
  }

  await getDb()
    .transaction()
    .execute(async (transaction) => {
      await mealRepository.replaceFoods(meal.id, foods, transaction);
    });
  return meal;
}
