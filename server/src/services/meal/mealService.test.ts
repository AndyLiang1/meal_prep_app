import { describe, it, expect, beforeEach, vi } from "vitest";
import { mealService } from "./mealService.js";
import {
  mealRepository,
  type MealRow,
  type MealFoodRow,
} from "../../repositories/meal/mealRepository.js";
import { ingredientRepository } from "../../repositories/ingredient/ingredientRepository.js";
import { compositeFoodRepository } from "../../repositories/compositeFood/compositeFoodRepository.js";
import type { TMeal } from "../../types.js";
import { MISSING_ID } from "../../constants.js";
import {
  mockIngredientRow1,
  mockIngredientRow2,
  mockExpectedTIngredient1,
  mockExpectedTIngredient2,
  MOCK_INGREDIENT_ID_1,
  MOCK_INGREDIENT_ID_2,
} from "../ingredient/ingredientService.fixtures.js";
import {
  MOCK_COMPOSITE_FOOD_ID_1,
  MOCK_COMPOSITE_FOOD_ID_2,
  mockFlatJoinRowsCompositeFood1,
  mockFlatJoinRowsCompositeFood2,
  mockExpectedTCompositeFood1,
  mockExpectedTCompositeFood2,
} from "../compositeFood/compositeFoodService.fixtures.js";

vi.mock("../../repositories/meal/mealRepository.js", () => {
  return {
    mealRepository: {
      createWithFoods: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      findExistingIds: vi.fn(),
      findFoodsByMealId: vi.fn(),
      findFoodsByMealIds: vi.fn(),
      update: vi.fn(),
      replaceFoods: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock("../../repositories/ingredient/ingredientRepository.js", () => {
  return {
    ingredientRepository: {
      findByIds: vi.fn(),
    },
  };
});

vi.mock("../../repositories/compositeFood/compositeFoodRepository.js", () => {
  return {
    compositeFoodRepository: {
      findByIdsWithIngredients: vi.fn(),
    },
  };
});

const mockedMealRepo = vi.mocked(mealRepository, true);
const mockedIngredientRepo = vi.mocked(ingredientRepository, true);
const mockedCompositeFoodRepo = vi.mocked(compositeFoodRepository, true);

describe("mealService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create an empty meal", async () => {
      const emptyMealRow: MealRow = {
        id: "meal-1-id",
        name: "Empty Meal",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };

      mockedIngredientRepo.findByIds.mockResolvedValue([]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([]);
      mockedMealRepo.createWithFoods.mockResolvedValue(emptyMealRow);

      const createdMeal: TMeal = await mealService.create({
        name: "Empty Meal",
        foods: [],
      });

      expect(createdMeal).toEqual({
        id: emptyMealRow.id,
        name: emptyMealRow.name,
        foods: [],
      });
      expect(mockedMealRepo.createWithFoods).toHaveBeenCalledWith({
        name: "Empty Meal",
        foods: [],
      });
    });

    it("should create a meal with an ingredient food and a composite food", async () => {
      const MEAL_ID = "meal-2-id";
      const mixedMealRow: MealRow = {
        id: MEAL_ID,
        name: "Mixed Meal",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };

      mockedIngredientRepo.findByIds.mockResolvedValue([mockIngredientRow1]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue(
        mockFlatJoinRowsCompositeFood1,
      );
      mockedMealRepo.createWithFoods.mockResolvedValue(mixedMealRow);

      const createdMeal: TMeal = await mealService.create({
        name: "Mixed Meal",
        foods: [
          { ingredientId: MOCK_INGREDIENT_ID_1, amount: 150 },
          { compositeFoodId: MOCK_COMPOSITE_FOOD_ID_1, amount: 600 },
        ],
      });

      expect(createdMeal).toEqual({
        id: MEAL_ID,
        name: "Mixed Meal",
        foods: [
          { ...mockExpectedTIngredient1, amount: 150 },
          { ...mockExpectedTCompositeFood1, amount: 600 },
        ],
      });
      expect(mockedMealRepo.createWithFoods).toHaveBeenCalledWith({
        name: "Mixed Meal",
        foods: [
          { ingredientId: MOCK_INGREDIENT_ID_1, amount: 150 },
          { compositeFoodId: MOCK_COMPOSITE_FOOD_ID_1, amount: 600 },
        ],
      });
      expect(mockedIngredientRepo.findByIds).toHaveBeenCalledWith([
        MOCK_INGREDIENT_ID_1,
      ]);
      expect(mockedCompositeFoodRepo.findByIdsWithIngredients).toHaveBeenCalledWith([
        MOCK_COMPOSITE_FOOD_ID_1,
      ]);
    });

    it("should throw when a meal food id does not exist", async () => {
      mockedIngredientRepo.findByIds.mockResolvedValue([]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([]);

      await expect(
        mealService.create({
          name: "Bad Meal",
          foods: [{ ingredientId: MISSING_ID, amount: 100 }],
        }),
      ).rejects.toThrow("One or more meal foods not found");

      expect(mockedMealRepo.createWithFoods).not.toHaveBeenCalled();
    });
  });

  describe("list", () => {
    it("should return an empty array when no meals exist", async () => {
      mockedMealRepo.findAll.mockResolvedValue([]);
      mockedMealRepo.findFoodsByMealIds.mockResolvedValue([]);
      mockedIngredientRepo.findByIds.mockResolvedValue([]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([]);

      const meals = await mealService.list();

      expect(meals).toEqual([]);
    });

    it("should return a meal with a single ingredient food", async () => {
      const MEAL_ID = "meal-list-1";
      const mealRow: MealRow = {
        id: MEAL_ID,
        name: "Snack",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };
      const mealFoodRow: MealFoodRow = {
        id: "meal-food-1",
        meal_id: MEAL_ID,
        ingredient_id: MOCK_INGREDIENT_ID_1,
        composite_food_id: null,
        amount: 150,
      };

      mockedMealRepo.findAll.mockResolvedValue([mealRow]);
      mockedMealRepo.findFoodsByMealIds.mockResolvedValue([mealFoodRow]);
      mockedIngredientRepo.findByIds.mockResolvedValue([mockIngredientRow1]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([]);

      const meals = await mealService.list();

      expect(meals).toEqual([
        {
          id: MEAL_ID,
          name: "Snack",
          foods: [{ ...mockExpectedTIngredient1, amount: 150 }],
        },
      ]);
    });

    it("should return a meal with a single composite food", async () => {
      const MEAL_ID = "meal-list-2";
      const mealRow: MealRow = {
        id: MEAL_ID,
        name: "Lunch",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };
      const mealFoodRow: MealFoodRow = {
        id: "meal-food-2",
        meal_id: MEAL_ID,
        ingredient_id: null,
        composite_food_id: MOCK_COMPOSITE_FOOD_ID_1,
        amount: 300,
      };

      mockedMealRepo.findAll.mockResolvedValue([mealRow]);
      mockedMealRepo.findFoodsByMealIds.mockResolvedValue([mealFoodRow]);
      mockedIngredientRepo.findByIds.mockResolvedValue([]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue(
        mockFlatJoinRowsCompositeFood1,
      );

      const meals = await mealService.list();

      expect(meals).toEqual([
        {
          id: MEAL_ID,
          name: "Lunch",
          foods: [{ ...mockExpectedTCompositeFood1, amount: 300 }],
        },
      ]);
    });

    it("should return a meal with multiple ingredients and composite foods", async () => {
      const MEAL_ID = "meal-list-3";
      const mealRow: MealRow = {
        id: MEAL_ID,
        name: "Dinner",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };
      const mealFoodRows: MealFoodRow[] = [
        {
          id: "meal-food-3",
          meal_id: MEAL_ID,
          ingredient_id: MOCK_INGREDIENT_ID_1,
          composite_food_id: null,
          amount: 200,
        },
        {
          id: "meal-food-4",
          meal_id: MEAL_ID,
          ingredient_id: MOCK_INGREDIENT_ID_2,
          composite_food_id: null,
          amount: 50,
        },
        {
          id: "meal-food-5",
          meal_id: MEAL_ID,
          ingredient_id: null,
          composite_food_id: MOCK_COMPOSITE_FOOD_ID_1,
          amount: 300,
        },
        {
          id: "meal-food-6",
          meal_id: MEAL_ID,
          ingredient_id: null,
          composite_food_id: MOCK_COMPOSITE_FOOD_ID_2,
          amount: 100,
        },
      ];

      mockedMealRepo.findAll.mockResolvedValue([mealRow]);
      mockedMealRepo.findFoodsByMealIds.mockResolvedValue(mealFoodRows);
      mockedIngredientRepo.findByIds.mockResolvedValue([
        mockIngredientRow1,
        mockIngredientRow2,
      ]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([
        ...mockFlatJoinRowsCompositeFood1,
        ...mockFlatJoinRowsCompositeFood2,
      ]);

      const meals = await mealService.list();

      expect(meals).toEqual([
        {
          id: MEAL_ID,
          name: "Dinner",
          foods: [
            { ...mockExpectedTIngredient1, amount: 200 },
            { ...mockExpectedTIngredient2, amount: 50 },
            { ...mockExpectedTCompositeFood1, amount: 300 },
            { ...mockExpectedTCompositeFood2, amount: 100 },
          ],
        },
      ]);
    });
  });

  describe("update", () => {
    it("returns null when the meal does not exist", async () => {
      mockedMealRepo.findById.mockResolvedValue(null);

      const updatedMeal = await mealService.update("non-existent-id", {
        name: "New Name",
      });

      expect(updatedMeal).toBeNull();
    });

    it("returns the renamed meal when only the name is updated", async () => {
      const MEAL_ID = "meal-update-1";
      const existingRow: MealRow = {
        id: MEAL_ID,
        name: "Original Name",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };
      const updatedRow: MealRow = {
        id: MEAL_ID,
        name: "Updated Meal Name",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-02T12:00:00.000Z"),
      };

      mockedMealRepo.findById.mockResolvedValue(existingRow);
      mockedMealRepo.update.mockResolvedValue(updatedRow);
      mockedMealRepo.findFoodsByMealId.mockResolvedValue([]);
      mockedIngredientRepo.findByIds.mockResolvedValue([]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([]);

      const updatedMeal = await mealService.update(MEAL_ID, {
        name: "Updated Meal Name",
      });

      expect(updatedMeal).toEqual({
        id: MEAL_ID,
        name: "Updated Meal Name",
        foods: [],
      });
    });

    // Only checks that replaceFoods is called and the response is correct.
    // Old foods being deleted is verified in integration/repo tests.
    it("replaces the meal's foods and name", async () => {
      const MEAL_ID = "meal-update-2";
      const existingRow: MealRow = {
        id: MEAL_ID,
        name: "Original Name",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };
      const updatedMealRow: MealRow = {
        id: MEAL_ID,
        name: "Renamed Meal",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-02T12:00:00.000Z"),
      };

      mockedMealRepo.findById.mockResolvedValue(existingRow);
      mockedMealRepo.update.mockResolvedValue(updatedMealRow);
      mockedMealRepo.replaceFoods.mockResolvedValue([]);
      mockedIngredientRepo.findByIds.mockResolvedValue([mockIngredientRow2]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue(
        mockFlatJoinRowsCompositeFood2,
      );

      const updatedMeal = await mealService.update(MEAL_ID, {
        name: "Renamed Meal",
        foods: [
          { ingredientId: MOCK_INGREDIENT_ID_2, amount: 250 },
          { compositeFoodId: MOCK_COMPOSITE_FOOD_ID_2, amount: 75 },
        ],
      });

      expect(mockedMealRepo.replaceFoods).toHaveBeenCalledWith(MEAL_ID, [
        { ingredientId: MOCK_INGREDIENT_ID_2, amount: 250 },
        { compositeFoodId: MOCK_COMPOSITE_FOOD_ID_2, amount: 75 },
      ]);

      expect(updatedMeal).toEqual({
        id: MEAL_ID,
        name: "Renamed Meal",
        foods: [
          { ...mockExpectedTIngredient2, amount: 250 },
          { ...mockExpectedTCompositeFood2, amount: 75 },
        ],
      });
    });

    it("does not rename the meal when food ids are invalid", async () => {
      const MEAL_ID = "meal-update-partial";
      const existingRow: MealRow = {
        id: MEAL_ID,
        name: "Original Name",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };

      mockedMealRepo.findById.mockResolvedValue(existingRow);
      mockedIngredientRepo.findByIds.mockResolvedValue([]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([]);

      await expect(
        mealService.update(MEAL_ID, {
          name: "Renamed Meal",
          foods: [{ ingredientId: MISSING_ID, amount: 100 }],
        }),
      ).rejects.toThrow("One or more meal foods not found");

      expect(mockedMealRepo.update).not.toHaveBeenCalled();
      expect(mockedMealRepo.replaceFoods).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    // Service only deletes the meal row; meal_food cleanup is DB cascade (see repo test).
    it("returns true when the repository deletes the row", async () => {
      const MEAL_ID = "meal-del-1";
      mockedMealRepo.delete.mockResolvedValue(true);

      const deleted = await mealService.delete(MEAL_ID);

      expect(deleted).toBe(true);
      expect(mockedMealRepo.delete).toHaveBeenCalledWith(MEAL_ID);
    });

    it("returns false when the repository did not delete", async () => {
      mockedMealRepo.delete.mockResolvedValue(false);

      const deleted = await mealService.delete("non-existent-id");

      expect(deleted).toBe(false);
    });
  });
});
