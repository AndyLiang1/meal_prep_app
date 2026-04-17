import { describe, it, expect } from "vitest";
import { mealRepository } from "./mealRepository.js";
import { ingredientRepository } from "../ingredient/ingredientRepository.js";
import {
  MISSING_ID,
  UUID_REGEX,
  buildIngredientInput,
} from "../ingredient/ingredientRepository.fixtures.js";
import { createTestCompositeFood } from "../compositeFood/compositeFoodRepository.fixtures.js";
import { createTestMeal } from "./mealRepository.fixtures.js";

async function createIngredientRow(displayName: string) {
  const ingredient = await ingredientRepository.create(
    buildIngredientInput({ name: displayName })
  );
  return ingredient;
}

describe("mealRepository", () => {
  describe("createWithFoods", () => {
    it("creates a meal with no foods and returns the persisted shape", async () => {
      const meal = await mealRepository.createWithFoods({
        name: "meal-empty",
        foods: [],
      });

      expect(meal).toEqual({
        id: expect.stringMatching(UUID_REGEX),
        name: "meal-empty",
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
      expect(await mealRepository.findFoodsByMealId(meal.id)).toEqual([]);
    });

    it("creates a meal with ingredient foods", async () => {
      const ingredient1 = await createIngredientRow("ingredient-1");
      const ingredient2 = await createIngredientRow("ingredient-2");

      const meal = await mealRepository.createWithFoods({
        name: "meal-breakfast",
        foods: [
          { ingredientId: ingredient1.id },
          { ingredientId: ingredient2.id },
        ],
      });

      const mealFoods = await mealRepository.findFoodsByMealId(meal.id);
      const ingredientIds = mealFoods.map((row) => row.ingredient_id).sort();

      expect(mealFoods).toHaveLength(2);
      expect(ingredientIds).toEqual(
        [ingredient1.id, ingredient2.id].sort()
      );
      expect(mealFoods.every((row) => row.meal_id === meal.id)).toBe(true);
      expect(
        mealFoods.every((row) => row.composite_food_id === null)
      ).toBe(true);
    });

    it("creates a meal with composite foods", async () => {
      const compositeFoodProteinShake = await createTestCompositeFood(
        "composite-food-protein-shake"
      );

      const meal = await mealRepository.createWithFoods({
        name: "meal-post-workout",
        foods: [{ compositeFoodId: compositeFoodProteinShake.id }],
      });

      const mealFoods = await mealRepository.findFoodsByMealId(meal.id);
      expect(mealFoods).toHaveLength(1);
      expect(mealFoods[0]).toEqual({
        id: expect.stringMatching(UUID_REGEX),
        meal_id: meal.id,
        ingredient_id: null,
        composite_food_id: compositeFoodProteinShake.id,
      });
    });

    it("creates a meal with a mix of ingredient and composite foods", async () => {
      const ingredientEgg = await createIngredientRow("ingredient-egg");
      const compositeFoodShake = await createTestCompositeFood(
        "composite-food-mixed"
      );

      const meal = await mealRepository.createWithFoods({
        name: "meal-mixed",
        foods: [
          { ingredientId: ingredientEgg.id },
          { compositeFoodId: compositeFoodShake.id },
        ],
      });

      const mealFoods = await mealRepository.findFoodsByMealId(meal.id);
      expect(mealFoods).toHaveLength(2);

      const rowForIngredient = mealFoods.find(
        (row) => row.ingredient_id !== null
      );
      const rowForCompositeFood = mealFoods.find(
        (row) => row.composite_food_id !== null
      );
      expect(rowForIngredient?.ingredient_id).toBe(ingredientEgg.id);
      expect(rowForCompositeFood?.composite_food_id).toBe(
        compositeFoodShake.id
      );
    });

    it("rolls back the meal insert when a food references a non-existent ingredient", async () => {
      await expect(
        mealRepository.createWithFoods({
          name: "meal-bad-fk",
          foods: [{ ingredientId: MISSING_ID }],
        })
      ).rejects.toThrow();

      expect(await mealRepository.findAll()).toEqual([]);
    });
  });

  describe("findAll", () => {
    it("returns an empty array when none exist", async () => {
      const rows = await mealRepository.findAll();
      expect(rows).toEqual([]);
    });

    it("returns meals sorted by created_at asc (oldest first)", async () => {
      const mealOlder = await createTestMeal("meal-sort-1");
      const mealNewer = await createTestMeal("meal-sort-2");

      const rows = await mealRepository.findAll();
      expect(rows.map((row) => row.id)).toEqual([mealOlder.id, mealNewer.id]);
    });
  });

  describe("findById", () => {
    it("returns the row when it exists", async () => {
      const persistedMeal = await createTestMeal("meal-lunch");

      const found = await mealRepository.findById(persistedMeal.id);
      expect(found).toEqual(persistedMeal);
    });

    it("returns null when not found", async () => {
      const found = await mealRepository.findById(MISSING_ID);
      expect(found).toBeNull();
    });
  });

  describe("findExistingIds", () => {
    it("short-circuits and returns empty array for empty input", async () => {
      expect(await mealRepository.findExistingIds([])).toEqual([]);
    });

    it("returns only the subset of ids that exist", async () => {
      const mealFound = await createTestMeal("meal-exists");

      const result = await mealRepository.findExistingIds([
        mealFound.id,
        MISSING_ID,
      ]);
      expect(result).toEqual([mealFound.id]);
    });

    it("deduplicates repeated ids", async () => {
      const meal = await createTestMeal("meal-dedup");

      const result = await mealRepository.findExistingIds([
        meal.id,
        meal.id,
        meal.id,
      ]);
      expect(result).toEqual([meal.id]);
    });
  });

  describe("findFoodsByMealId", () => {
    it("returns an empty array for a meal with no foods", async () => {
      const meal = await createTestMeal("meal-no-foods");

      const mealFoods = await mealRepository.findFoodsByMealId(meal.id);
      expect(mealFoods).toEqual([]);
    });

    it("returns only foods for the given meal", async () => {
      const sharedIngredient = await createIngredientRow("ingredient-shared");

      const mealWithOneFood = await mealRepository.createWithFoods({
        name: "meal-one-food",
        foods: [{ ingredientId: sharedIngredient.id }],
      });
      const mealWithTwoFoods = await mealRepository.createWithFoods({
        name: "meal-two-foods",
        foods: [
          { ingredientId: sharedIngredient.id },
          { ingredientId: sharedIngredient.id },
        ],
      });

      const foodsForMealOne = await mealRepository.findFoodsByMealId(
        mealWithOneFood.id
      );
      const foodsForMealTwo = await mealRepository.findFoodsByMealId(
        mealWithTwoFoods.id
      );

      expect(foodsForMealOne).toHaveLength(1);
      expect(foodsForMealTwo).toHaveLength(2);
      expect(
        foodsForMealOne.every((row) => row.meal_id === mealWithOneFood.id)
      ).toBe(true);
      expect(
        foodsForMealTwo.every((row) => row.meal_id === mealWithTwoFoods.id)
      ).toBe(true);
    });

    it("returns an empty array for an unknown meal id", async () => {
      const mealFoods = await mealRepository.findFoodsByMealId(MISSING_ID);
      expect(mealFoods).toEqual([]);
    });
  });

  describe("update", () => {
    it("returns the full row with patched name and a bumped updated_at", async () => {
      const beforeUpdate = await createTestMeal("meal-old-name");

      const updatedMeal = await mealRepository.update(beforeUpdate.id, {
        name: "meal-new-name",
      });

      expect(updatedMeal).toEqual({
        ...beforeUpdate,
        name: "meal-new-name",
        updated_at: expect.any(Date),
      });
      expect(updatedMeal!.updated_at.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.updated_at.getTime()
      );
    });

    it("returns null when the row does not exist", async () => {
      const result = await mealRepository.update(MISSING_ID, {
        name: "meal-ghost",
      });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("returns true and removes the row when it exists", async () => {
      const persistedMeal = await createTestMeal("meal-delete");

      const deleted = await mealRepository.delete(persistedMeal.id);
      expect(deleted).toBe(true);
      expect(await mealRepository.findById(persistedMeal.id)).toBeNull();
    });

    it("returns false when the row does not exist", async () => {
      const deleted = await mealRepository.delete(MISSING_ID);
      expect(deleted).toBe(false);
    });
  });
});
