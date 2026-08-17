import { describe, it, expect, beforeEach, vi } from "vitest";
import { mealService } from "./mealService.js";
import {
  mealRepository,
  type MealRow,
  type MealFoodRow,
} from "../../repositories/meal/mealRepository.js";
import { mealGroupRepository } from "../../repositories/mealGroup/mealGroupRepository.js";
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
      create: vi.fn(),
      findById: vi.fn(),
      findByMealGroupId: vi.fn(),
      findExistingIds: vi.fn(),
      findFoodsByMealId: vi.fn(),
      findFoodsByMealIds: vi.fn(),
      update: vi.fn(),
      replaceFoods: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock("../../repositories/mealGroup/mealGroupRepository.js", () => {
  return {
    mealGroupRepository: {
      findById: vi.fn(),
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
const mockedMealGroupRepo = vi.mocked(mealGroupRepository, true);
const mockedIngredientRepo = vi.mocked(ingredientRepository, true);
const mockedCompositeFoodRepo = vi.mocked(compositeFoodRepository, true);

const MOCK_MEAL_GROUP_ID = "meal-group-1-id";

describe("mealService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    const mockMealGroup = {
      id: MOCK_MEAL_GROUP_ID,
      name: "Weekday Breakfast",
      tags: ["chicken"],
      display_as_default: false,
      created_at: new Date("2026-06-01T12:00:00.000Z"),
      updated_at: new Date("2026-06-01T12:00:00.000Z"),
    };

    it("should create an empty meal belonging to a meal group", async () => {
      const emptyMealRow: MealRow = {
        id: "meal-1-id",
        name: "Empty Meal",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 0,
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };

      mockedMealGroupRepo.findById.mockResolvedValue(mockMealGroup);
      mockedMealRepo.findByMealGroupId.mockResolvedValue([]);
      mockedMealRepo.create.mockResolvedValue(emptyMealRow);

      const createdMeal: TMeal = await mealService.create({
        name: "Empty Meal",
        mealGroupId: MOCK_MEAL_GROUP_ID,
      });

      expect(createdMeal).toEqual({
        id: emptyMealRow.id,
        name: emptyMealRow.name,
        mealGroupId: MOCK_MEAL_GROUP_ID,
        sortOrder: 0,
        foods: [],
      });
      expect(mockedMealRepo.create).toHaveBeenCalledWith({
        name: "Empty Meal",
        mealGroupId: MOCK_MEAL_GROUP_ID,
        sortOrder: 0,
      });
    });

    it("should drop sortOrder to the lowest available integer", async () => {
      const existingMealAtZero: MealRow = {
        id: "existing-meal-id-0",
        name: "Meal 1",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 0,
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };

      mockedMealGroupRepo.findById.mockResolvedValue(mockMealGroup);
      mockedMealRepo.findByMealGroupId.mockResolvedValue([existingMealAtZero]);
      mockedMealRepo.create.mockResolvedValue({
        id: "meal-2-id",
        name: "Meal 2",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 1,
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      });

      await mealService.create({
        name: "Meal 2",
        mealGroupId: MOCK_MEAL_GROUP_ID,
      });

      expect(mockedMealRepo.create).toHaveBeenCalledWith({
        name: "Meal 2",
        mealGroupId: MOCK_MEAL_GROUP_ID,
        sortOrder: 1,
      });
    });

    it("should throw when the meal group does not exist", async () => {
      mockedMealGroupRepo.findById.mockResolvedValue(null);

      await expect(
        mealService.create({
          name: "Bad Meal",
          mealGroupId: MISSING_ID,
          sortOrder: 0,
        }),
      ).rejects.toThrow("Meal group not found");

      expect(mockedMealRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("list", () => {
    it("should return an empty array when no meals exist", async () => {
      mockedMealRepo.findByMealGroupId.mockResolvedValue([]);
      mockedMealRepo.findFoodsByMealIds.mockResolvedValue([]);
      mockedIngredientRepo.findByIds.mockResolvedValue([]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([]);

      const meals = await mealService.list(MOCK_MEAL_GROUP_ID);

      expect(meals).toEqual([]);
    });

    it("should return a meal with a single ingredient food", async () => {
      const MEAL_ID = "meal-list-1";
      const mealRow: MealRow = {
        id: MEAL_ID,
        name: "Snack",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 0,
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

      mockedMealRepo.findByMealGroupId.mockResolvedValue([mealRow]);
      mockedMealRepo.findFoodsByMealIds.mockResolvedValue([mealFoodRow]);
      mockedIngredientRepo.findByIds.mockResolvedValue([mockIngredientRow1]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([]);

      const meals = await mealService.list(MOCK_MEAL_GROUP_ID);

      expect(meals).toEqual([
        {
          id: MEAL_ID,
          name: "Snack",
          mealGroupId: MOCK_MEAL_GROUP_ID,
          sortOrder: 0,
          foods: [{ ...mockExpectedTIngredient1, amount: 150 }],
        },
      ]);
    });

    it("should return a meal with a single composite food", async () => {
      const MEAL_ID = "meal-list-2";
      const mealRow: MealRow = {
        id: MEAL_ID,
        name: "Lunch",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 0,
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

      mockedMealRepo.findByMealGroupId.mockResolvedValue([mealRow]);
      mockedMealRepo.findFoodsByMealIds.mockResolvedValue([mealFoodRow]);
      mockedIngredientRepo.findByIds.mockResolvedValue([]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue(
        mockFlatJoinRowsCompositeFood1,
      );

      const meals = await mealService.list(MOCK_MEAL_GROUP_ID);

      expect(meals).toEqual([
        {
          id: MEAL_ID,
          name: "Lunch",
          mealGroupId: MOCK_MEAL_GROUP_ID,
          sortOrder: 0,
          foods: [{ ...mockExpectedTCompositeFood1, amount: 300 }],
        },
      ]);
    });

    it("should return a meal with multiple ingredients and composite foods", async () => {
      const MEAL_ID = "meal-list-3";
      const mealRow: MealRow = {
        id: MEAL_ID,
        name: "Dinner",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 0,
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

      mockedMealRepo.findByMealGroupId.mockResolvedValue([mealRow]);
      mockedMealRepo.findFoodsByMealIds.mockResolvedValue(mealFoodRows);
      mockedIngredientRepo.findByIds.mockResolvedValue([
        mockIngredientRow1,
        mockIngredientRow2,
      ]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([
        ...mockFlatJoinRowsCompositeFood1,
        ...mockFlatJoinRowsCompositeFood2,
      ]);

      const meals = await mealService.list(MOCK_MEAL_GROUP_ID);

      expect(meals).toEqual([
        {
          id: MEAL_ID,
          name: "Dinner",
          mealGroupId: MOCK_MEAL_GROUP_ID,
          sortOrder: 0,
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
    it("should return null when the meal does not exist", async () => {
      mockedMealRepo.findById.mockResolvedValue(null);

      const updatedMeal = await mealService.update("non-existent-id", {
        name: "New Name",
      });

      expect(updatedMeal).toBeNull();
    });

    it("should return the renamed meal when only the name is updated", async () => {
      const MEAL_ID = "meal-update-1";
      const existingRow: MealRow = {
        id: MEAL_ID,
        name: "Original Name",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 0,
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };
      const updatedRow: MealRow = {
        id: MEAL_ID,
        name: "Updated Meal Name",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 0,
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
        mealGroupId: MOCK_MEAL_GROUP_ID,
        sortOrder: 0,
        foods: [],
      });
    });

    // Only checks that replaceFoods is called and the response is correct.
    // Old foods being deleted is verified in integration/repo tests.
    it("should replace the meal's foods and name", async () => {
      const MEAL_ID = "meal-update-2";
      const existingRow: MealRow = {
        id: MEAL_ID,
        name: "Original Name",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 0,
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };
      const updatedMealRow: MealRow = {
        id: MEAL_ID,
        name: "Renamed Meal",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 0,
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
        mealGroupId: MOCK_MEAL_GROUP_ID,
        sortOrder: 0,
        foods: [
          { ...mockExpectedTIngredient2, amount: 250 },
          { ...mockExpectedTCompositeFood2, amount: 75 },
        ],
      });
    });

    it("should not rename the meal when food ids are invalid", async () => {
      const MEAL_ID = "meal-update-partial";
      const existingRow: MealRow = {
        id: MEAL_ID,
        name: "Original Name",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 0,
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

  describe("reorder", () => {
    it("should set sort orders to match the array positions", async () => {
      const existingMeals: MealRow[] = [
        {
          id: "meal-a",
          name: "Meal A",
          meal_group_id: MOCK_MEAL_GROUP_ID,
          sort_order: 0,
          created_at: new Date("2026-06-01T12:00:00.000Z"),
          updated_at: new Date("2026-06-01T12:00:00.000Z"),
        },
        {
          id: "meal-b",
          name: "Meal B",
          meal_group_id: MOCK_MEAL_GROUP_ID,
          sort_order: 1,
          created_at: new Date("2026-06-01T12:00:00.000Z"),
          updated_at: new Date("2026-06-01T12:00:00.000Z"),
        },
        {
          id: "meal-c",
          name: "Meal C",
          meal_group_id: MOCK_MEAL_GROUP_ID,
          sort_order: 2,
          created_at: new Date("2026-06-01T12:00:00.000Z"),
          updated_at: new Date("2026-06-01T12:00:00.000Z"),
        },
      ];

      mockedMealRepo.findByMealGroupId.mockResolvedValue(existingMeals);
      mockedMealRepo.update.mockResolvedValue(null);

      await mealService.reorder(MOCK_MEAL_GROUP_ID, ["meal-c", "meal-a", "meal-b"]);

      expect(mockedMealRepo.update).toHaveBeenCalledWith("meal-c", { sortOrder: 0 });
      expect(mockedMealRepo.update).toHaveBeenCalledWith("meal-a", { sortOrder: 1 });
      expect(mockedMealRepo.update).toHaveBeenCalledWith("meal-b", { sortOrder: 2 });
    });

    it("should throw when meal IDs do not match the group", async () => {
      const existingMeals: MealRow[] = [
        {
          id: "meal-a",
          name: "Meal A",
          meal_group_id: MOCK_MEAL_GROUP_ID,
          sort_order: 0,
          created_at: new Date("2026-06-01T12:00:00.000Z"),
          updated_at: new Date("2026-06-01T12:00:00.000Z"),
        },
      ];

      mockedMealRepo.findByMealGroupId.mockResolvedValue(existingMeals);

      await expect(
        mealService.reorder(MOCK_MEAL_GROUP_ID, ["meal-a", "meal-unknown"]),
      ).rejects.toThrow("Meal IDs do not match the meals in this group");

      expect(mockedMealRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should return false when the meal does not exist", async () => {
      mockedMealRepo.findById.mockResolvedValue(null);

      const deleted = await mealService.delete("non-existent-id");

      expect(deleted).toBe(false);
      expect(mockedMealRepo.delete).not.toHaveBeenCalled();
    });

    it("should delete the meal and decrement sort orders above it", async () => {
      const mealToDelete: MealRow = {
        id: "meal-del-1",
        name: "Middle Meal",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 1,
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };
      const mealAbove: MealRow = {
        id: "meal-above",
        name: "Last Meal",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 2,
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };
      const mealBelow: MealRow = {
        id: "meal-below",
        name: "First Meal",
        meal_group_id: MOCK_MEAL_GROUP_ID,
        sort_order: 0,
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };

      mockedMealRepo.findById.mockResolvedValue(mealToDelete);
      mockedMealRepo.delete.mockResolvedValue(true);
      mockedMealRepo.findByMealGroupId.mockResolvedValue([mealBelow, mealAbove]);
      mockedMealRepo.update.mockResolvedValue(null);

      const deleted = await mealService.delete("meal-del-1");

      expect(deleted).toBe(true);
      expect(mockedMealRepo.delete).toHaveBeenCalledWith("meal-del-1");
      expect(mockedMealRepo.update).toHaveBeenCalledWith("meal-above", {
        sortOrder: 1,
      });
      expect(mockedMealRepo.update).not.toHaveBeenCalledWith(
        "meal-below",
        expect.anything(),
      );
    });
  });
});
