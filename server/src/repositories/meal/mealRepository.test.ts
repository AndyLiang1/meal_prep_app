import { describe, it, expect, beforeEach } from "vitest";
import { mealRepository } from "./mealRepository.js";
import { ingredientRepository } from "../ingredient/ingredientRepository.js";
import { generateIngredientInput } from "../ingredient/ingredientRepository.fixtures.js";
import { MISSING_ID, UUID_REGEX } from "../../constants.js";
import { createTestCompositeFood } from "../compositeFood/compositeFoodRepository.fixtures.js";
import { createTestMeal } from "./mealRepository.fixtures.js";
import { createTestMealGroup } from "../mealGroup/mealGroupRepository.fixtures.js";
import { getDb } from "../../db/database.js";
import type { MealFoodRef } from "./mealRepository.js";

async function createIngredientRow(displayName: string) {
  const ingredient = await ingredientRepository.create(
    generateIngredientInput({ name: displayName }),
  );
  return ingredient;
}

describe("mealRepository", () => {
  let sharedMealGroupId: string;

  beforeEach(async () => {
    const mealGroup = await createTestMealGroup("meal-repo-shared-group");
    sharedMealGroupId = mealGroup.id;
  });

  async function createMealWithFoods(mealName: string, foods: MealFoodRef[]) {
    const meal = await createTestMeal(sharedMealGroupId, mealName);
    await mealRepository.replaceFoods(meal.id, foods);
    return meal;
  }

  describe("create", () => {
    it("should create an empty meal belonging to a group and return the persisted shape", async () => {
      const mealGroup = await createTestMealGroup("meal-group-empty");

      const meal = await mealRepository.create({
        name: "meal-empty",
        mealGroupId: mealGroup.id,
        sortOrder: 0,
      });

      expect(meal).toEqual({
        id: expect.stringMatching(UUID_REGEX),
        name: "meal-empty",
        meal_group_id: mealGroup.id,
        sort_order: 0,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
      expect(await mealRepository.findFoodsByMealId(meal.id)).toEqual([]);
    });

    it("should insert the meal within the provided transaction", async () => {
      const mealGroup = await createTestMealGroup("meal-group-tx");

      const createdMeal = await getDb()
        .transaction()
        .execute((transaction) =>
          mealRepository.create(
            {
              name: "meal-in-transaction",
              mealGroupId: mealGroup.id,
              sortOrder: 1,
            },
            transaction,
          ),
        );

      expect(createdMeal).toEqual({
        id: expect.stringMatching(UUID_REGEX),
        name: "meal-in-transaction",
        meal_group_id: mealGroup.id,
        sort_order: 1,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it("should roll back the insert if the transaction is aborted", async () => {
      const mealGroup = await createTestMealGroup("meal-group-rollback");

      await expect(
        getDb()
          .transaction()
          .execute(async (transaction) => {
            await mealRepository.create(
              {
                name: "Orphan 1",
                mealGroupId: mealGroup.id,
                sortOrder: 0,
              },
              transaction,
            );
            throw new Error("forced rollback");
          }),
      ).rejects.toThrow("forced rollback");

      const allMeals = await mealRepository.findAll();
      expect(allMeals).toEqual([]);
    });

    it("should reject when the meal group does not exist", async () => {
      await expect(
        mealRepository.create({
          name: "meal-bad-fk",
          mealGroupId: MISSING_ID,
          sortOrder: 0,
        }),
      ).rejects.toThrow();

      expect(await mealRepository.findAll()).toEqual([]);
    });
  });

  describe("findAll", () => {
    it("should return an empty array when none exist", async () => {
      const rows = await mealRepository.findAll();
      expect(rows).toEqual([]);
    });

    it("should return meals sorted by created_at asc (oldest first)", async () => {
      const mealOlder = await createTestMeal(sharedMealGroupId, "meal-sort-1");
      const mealNewer = await createTestMeal(sharedMealGroupId, "meal-sort-2");

      const rows = await mealRepository.findAll();
      expect(rows.map((mealRow) => mealRow.id)).toEqual([mealOlder.id, mealNewer.id]);
    });
  });

  describe("findById", () => {
    it("should return the row when it exists", async () => {
      const persistedMeal = await createTestMeal(sharedMealGroupId, "meal-lunch");

      const found = await mealRepository.findById(persistedMeal.id);
      expect(found).toEqual(persistedMeal);
    });

    it("should return null when not found", async () => {
      const found = await mealRepository.findById(MISSING_ID);
      expect(found).toBeNull();
    });
  });

  describe("findByIds", () => {
    it("should return an empty array for empty input", async () => {
      const mealRows = await mealRepository.findByIds([]);
      expect(mealRows).toEqual([]);
    });

    it("should return only the meals that exist for the given ids", async () => {
      const mealFirst = await createTestMeal(sharedMealGroupId, "meal-batch-1");
      const mealSecond = await createTestMeal(sharedMealGroupId, "meal-batch-2");

      const mealRows = await mealRepository.findByIds([
        mealFirst.id,
        mealSecond.id,
        MISSING_ID,
      ]);

      expect(mealRows).toHaveLength(2);
      expect(mealRows.map((mealRow) => mealRow.id).sort()).toEqual(
        [mealFirst.id, mealSecond.id].sort(),
      );
    });
  });

  describe("findExistingIds", () => {
    it("should short-circuit and return empty array for empty input", async () => {
      expect(await mealRepository.findExistingIds([])).toEqual([]);
    });

    it("should return only the subset of ids that exist", async () => {
      const mealFound = await createTestMeal(sharedMealGroupId, "meal-exists");

      const result = await mealRepository.findExistingIds([mealFound.id, MISSING_ID]);
      expect(result).toEqual([mealFound.id]);
    });

    it("should deduplicate repeated ids", async () => {
      const meal = await createTestMeal(sharedMealGroupId, "meal-dedup");

      const result = await mealRepository.findExistingIds([meal.id, meal.id, meal.id]);
      expect(result).toEqual([meal.id]);
    });
  });

  describe("findByMealGroupId", () => {
    it("should return an empty array when the group has no meals", async () => {
      const meals = await mealRepository.findByMealGroupId(sharedMealGroupId);
      expect(meals).toEqual([]);
    });

    it("should return an empty array for an unknown meal group id", async () => {
      const meals = await mealRepository.findByMealGroupId(MISSING_ID);
      expect(meals).toEqual([]);
    });

    it("should return meals sorted by sort_order ascending", async () => {
      await mealRepository.create({
        name: "meal-c",
        mealGroupId: sharedMealGroupId,
        sortOrder: 2,
      });
      await mealRepository.create({
        name: "meal-a",
        mealGroupId: sharedMealGroupId,
        sortOrder: 0,
      });
      await mealRepository.create({
        name: "meal-b",
        mealGroupId: sharedMealGroupId,
        sortOrder: 1,
      });

      const meals = await mealRepository.findByMealGroupId(sharedMealGroupId);

      expect(meals).toHaveLength(3);
      expect(meals.map((meal) => meal.name)).toEqual(["meal-a", "meal-b", "meal-c"]);
    });

    // We need this test because findByMealGroupId can take an optional
    // transaction, and we have to prove, when that optional transaction is provided,
    // findByMealGroupId uses the same db connection as the transaction.
    //
    // Think of a transaction as a private draft. We insert a meal into that
    // draft but do not save it yet (no COMMIT). Anyone else looking at the
    // database should not see that meal.
    //
    // 1. Call findByMealGroupId with the transaction → we should see the meal,
    //    because we are looking at our own draft.
    // 2. Call findByMealGroupId without it (plain getDb()) → we should see
    //    nothing, because that is a different connection looking at the saved
    //    database.
    //
    // If both calls see the meal, the transaction argument was ignored and we
    // are still reading through getDb().
    it("should see an uncommitted insert when called with that transaction", async () => {
      await getDb()
        .transaction()
        .execute(async (transaction) => {
          await mealRepository.create(
            {
              name: "uncommitted-meal",
              mealGroupId: sharedMealGroupId,
              sortOrder: 0,
            },
            transaction,
          );

          const mealsInTransaction = await mealRepository.findByMealGroupId(
            sharedMealGroupId,
            transaction,
          );
          const mealsOutsideTransaction =
            await mealRepository.findByMealGroupId(sharedMealGroupId);

          expect(mealsInTransaction).toHaveLength(1);
          expect(mealsInTransaction[0].name).toBe("uncommitted-meal");
          expect(mealsOutsideTransaction).toEqual([]);
        });
    });

    it("should exclude meals belonging to a different group", async () => {
      const otherGroup = await createTestMealGroup("other-group");
      await mealRepository.create({
        name: "meal-in-shared",
        mealGroupId: sharedMealGroupId,
        sortOrder: 0,
      });
      await mealRepository.create({
        name: "meal-in-other",
        mealGroupId: otherGroup.id,
        sortOrder: 0,
      });

      const mealsInShared = await mealRepository.findByMealGroupId(sharedMealGroupId);
      const mealsInOther = await mealRepository.findByMealGroupId(otherGroup.id);

      expect(mealsInShared).toHaveLength(1);
      expect(mealsInShared[0].name).toBe("meal-in-shared");
      expect(mealsInOther).toHaveLength(1);
      expect(mealsInOther[0].name).toBe("meal-in-other");
    });
  });

  describe("findFoodsByMealId", () => {
    it("should return an empty array for a meal with no foods", async () => {
      const meal = await createTestMeal(sharedMealGroupId, "meal-no-foods");

      const mealFoods = await mealRepository.findFoodsByMealId(meal.id);
      expect(mealFoods).toEqual([]);
    });

    it("should return only foods for the given meal", async () => {
      const sharedIngredient = await createIngredientRow("ingredient-shared");

      const mealWithOneFood = await createMealWithFoods("meal-one-food", [
        { ingredientId: sharedIngredient.id, amount: 100 },
      ]);
      const mealWithTwoFoods = await createMealWithFoods("meal-two-foods", [
        { ingredientId: sharedIngredient.id, amount: 100 },
        { ingredientId: sharedIngredient.id, amount: 150 },
      ]);

      const foodsForMealOne = await mealRepository.findFoodsByMealId(
        mealWithOneFood.id,
      );
      const foodsForMealTwo = await mealRepository.findFoodsByMealId(
        mealWithTwoFoods.id,
      );

      expect(foodsForMealOne).toHaveLength(1);
      expect(foodsForMealTwo).toHaveLength(2);
      expect(
        foodsForMealOne.every((foodRow) => foodRow.meal_id === mealWithOneFood.id),
      ).toBe(true);
      expect(
        foodsForMealTwo.every((foodRow) => foodRow.meal_id === mealWithTwoFoods.id),
      ).toBe(true);
    });

    it("should return an empty array for an unknown meal id", async () => {
      const mealFoods = await mealRepository.findFoodsByMealId(MISSING_ID);
      expect(mealFoods).toEqual([]);
    });
  });

  describe("update", () => {
    it("should return the full row with updated metadata and a bumped updated_at", async () => {
      const beforeUpdate = await createTestMeal(sharedMealGroupId, "meal-old-name");

      const updatedMeal = await mealRepository.update(beforeUpdate.id, {
        name: "meal-new-name",
        sortOrder: 2,
      });

      expect(updatedMeal).toEqual({
        ...beforeUpdate,
        name: "meal-new-name",
        sort_order: 2,
        updated_at: expect.any(Date),
      });
      expect(updatedMeal!.updated_at.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.updated_at.getTime(),
      );
    });

    it("should return null when the row does not exist", async () => {
      const result = await mealRepository.update(MISSING_ID, {
        name: "meal-ghost",
      });
      expect(result).toBeNull();
    });

    it("should roll back sort order updates if the transaction is aborted", async () => {
      const firstMeal = await mealRepository.create({
        name: "meal-sort-first",
        mealGroupId: sharedMealGroupId,
        sortOrder: 0,
      });
      const secondMeal = await mealRepository.create({
        name: "meal-sort-second",
        mealGroupId: sharedMealGroupId,
        sortOrder: 1,
      });

      await expect(
        getDb()
          .transaction()
          .execute(async (transaction) => {
            await mealRepository.update(firstMeal.id, { sortOrder: 1 }, transaction);
            await mealRepository.update(secondMeal.id, { sortOrder: 0 }, transaction);
            throw new Error("forced rollback");
          }),
      ).rejects.toThrow("forced rollback");

      const mealsAfterRollback =
        await mealRepository.findByMealGroupId(sharedMealGroupId);
      const mealSortOrders = mealsAfterRollback.map((meal) => ({
        id: meal.id,
        sort_order: meal.sort_order,
      }));
      expect(mealSortOrders).toEqual([
        { id: firstMeal.id, sort_order: 0 },
        { id: secondMeal.id, sort_order: 1 },
      ]);
    });
  });

  describe("replaceFoods", () => {
    it("should replace ingredient and composite foods on a meal", async () => {
      const originalIngredient = await createIngredientRow("ingredient-original");
      const replacementIngredient = await createIngredientRow("ingredient-replacement");
      const originalCompositeFood = await createTestCompositeFood(
        "composite-food-original",
      );
      const replacementCompositeFood = await createTestCompositeFood(
        "composite-food-replacement",
      );

      const meal = await createMealWithFoods("meal-replace-foods", [
        { ingredientId: originalIngredient.id, amount: 100 },
        { compositeFoodId: originalCompositeFood.id, amount: 300 },
      ]);

      const replacedMealFoodRows = await mealRepository.replaceFoods(meal.id, [
        { ingredientId: replacementIngredient.id, amount: 250 },
        { compositeFoodId: replacementCompositeFood.id, amount: 75 },
      ]);

      expect(replacedMealFoodRows).toHaveLength(2);
      expect(replacedMealFoodRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            meal_id: meal.id,
            ingredient_id: replacementIngredient.id,
            composite_food_id: null,
            amount: 250,
          }),
          expect.objectContaining({
            meal_id: meal.id,
            ingredient_id: null,
            composite_food_id: replacementCompositeFood.id,
            amount: 75,
          }),
        ]),
      );
    });
  });

  describe("delete", () => {
    it("should return true and remove the row when it exists", async () => {
      const persistedMeal = await createTestMeal(sharedMealGroupId, "meal-delete");

      const deleted = await getDb()
        .transaction()
        .execute((transaction) => mealRepository.delete(persistedMeal.id, transaction));
      expect(deleted).toBe(true);
      expect(await mealRepository.findById(persistedMeal.id)).toBeNull();
    });

    it("should delete meal_food rows for ingredient and composite foods", async () => {
      const ingredient = await createIngredientRow("ingredient-delete");
      const compositeFood = await createTestCompositeFood("composite-food-delete");

      const meal = await createMealWithFoods("meal-delete-foods", [
        { ingredientId: ingredient.id, amount: 100 },
        { compositeFoodId: compositeFood.id, amount: 300 },
      ]);

      const mealFoodRowsBeforeDelete = await mealRepository.findFoodsByMealId(meal.id);
      expect(mealFoodRowsBeforeDelete).toHaveLength(2);

      const deleted = await getDb()
        .transaction()
        .execute((transaction) => mealRepository.delete(meal.id, transaction));
      expect(deleted).toBe(true);

      const mealFoodRowsAfterDelete = await mealRepository.findFoodsByMealId(meal.id);
      expect(mealFoodRowsAfterDelete).toEqual([]);
    });

    it("should return false when the row does not exist", async () => {
      const deleted = await getDb()
        .transaction()
        .execute((transaction) => mealRepository.delete(MISSING_ID, transaction));
      expect(deleted).toBe(false);
    });
  });
});
