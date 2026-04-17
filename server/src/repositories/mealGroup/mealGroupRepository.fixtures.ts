import { mealGroupRepository } from "./mealGroupRepository.js";
import type { MealGroupRow } from "./mealGroupRepository.js";
import { createTestMeal } from "../meal/mealRepository.fixtures.js";

export async function createTestMealGroup(
  mealGroupName = "meal-group-default",
  mealCount = 1,
  tag = "breakfast"
): Promise<MealGroupRow> {
  const mealRows = await Promise.all(
    Array.from({ length: mealCount }, (_, index) =>
      createTestMeal(`${mealGroupName}-meal-${index}`)
    )
  );

  const mealGroup = await mealGroupRepository.createWithMeals({
    name: mealGroupName,
    tag,
    meals: mealRows.map((mealRow, index) => ({
      mealId: mealRow.id,
      sortOrder: index,
    })),
  });
  return mealGroup;
}
