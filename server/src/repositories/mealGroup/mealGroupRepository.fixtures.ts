import { mealGroupRepository } from "./mealGroupRepository.js";
import type { MealGroupRow } from "./mealGroupRepository.js";
import { getDb } from "../../db/database.js";

export async function createTestMealGroup(
  mealGroupName = "meal-group-default",
  tags: string[] = ["chicken"],
): Promise<MealGroupRow> {
  const mealGroup = await getDb()
    .transaction()
    .execute((transaction) =>
      mealGroupRepository.create(
        {
          name: mealGroupName,
          tags,
        },
        transaction,
      ),
    );
  return mealGroup;
}
