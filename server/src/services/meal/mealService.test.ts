import { describe, it, expect, beforeEach, vi } from "vitest";
import { mealService } from "./mealService.js";
import {
  mealRepository,
  type MealRow,
  type MealFoodRow,
} from "../../repositories/meal/mealRepository.js";
import {
  ingredientRepository,
  type IngredientRow,
} from "../../repositories/ingredient/ingredientRepository.js";
import {
  compositeFoodRepository,
  type CompositeFoodWithIngredientsJoinRow,
} from "../../repositories/compositeFood/compositeFoodRepository.js";
import type { TMeal } from "../../types.js";

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
    it("can create an empty meal", async () => {
      const emptyMealRow: MealRow = {
        id: "meal-1-id",
        name: "Empty Meal",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };

      mockedMealRepo.createWithFoods.mockResolvedValue(emptyMealRow);
      mockedMealRepo.findFoodsByMealId.mockResolvedValue([]);
      mockedIngredientRepo.findByIds.mockResolvedValue([]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([]);

      const createdMeal: TMeal = await mealService.create({
        name: "Empty Meal",
        foods: [],
      });

      expect(createdMeal).toEqual({
        id: "meal-1-id",
        name: "Empty Meal",
        foods: [],
      });
      expect(mockedMealRepo.createWithFoods).toHaveBeenCalledWith({
        name: "Empty Meal",
        foods: [],
      });
      expect(mockedMealRepo.findFoodsByMealId).toHaveBeenCalledWith("meal-1-id");
    });

    it("can create a meal with an ingredient food and a composite food", async () => {
      const MEAL_ID = "meal-2-id";
      const INGREDIENT_ID = "ingredient-1-id";
      const COMPOSITE_FOOD_ID = "composite-food-1-id";
      const SUB_INGREDIENT_ID = "sub-ingredient-rice-id";

      const mixedMealRow: MealRow = {
        id: MEAL_ID,
        name: "Mixed Meal",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };

      const mealFoodRows: MealFoodRow[] = [
        {
          id: "meal-food-1",
          meal_id: MEAL_ID,
          ingredient_id: INGREDIENT_ID,
          composite_food_id: null,
        },
        {
          id: "meal-food-2",
          meal_id: MEAL_ID,
          ingredient_id: null,
          composite_food_id: COMPOSITE_FOOD_ID,
        },
      ];

      const chickenRow: IngredientRow = {
        id: INGREDIENT_ID,
        name: "Chicken Breast",
        calories: 165,
        protein: 31,
        carbs: 0,
        fats: 3.6,
        serving_size: 100,
        unit: "GRAM",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };

      const compositeFoodJoinRows: CompositeFoodWithIngredientsJoinRow[] = [
        {
          id: COMPOSITE_FOOD_ID,
          name: "Protein Bowl",
          cf_serving_size: 250,
          cf_unit: "GRAM",
          ingredient_id: SUB_INGREDIENT_ID,
          ingredient_name: "Rice",
          calories: 130,
          protein: 2.7,
          carbs: 28,
          fats: 0.3,
          amount: 150,
          serving_size: 100,
          unit: "GRAM",
        },
      ];

      mockedMealRepo.createWithFoods.mockResolvedValue(mixedMealRow);
      mockedMealRepo.findFoodsByMealId.mockResolvedValue(mealFoodRows);
      mockedIngredientRepo.findByIds.mockResolvedValue([chickenRow]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue(
        compositeFoodJoinRows,
      );

      const createdMeal: TMeal = await mealService.create({
        name: "Mixed Meal",
        foods: [
          { ingredientId: INGREDIENT_ID },
          { compositeFoodId: COMPOSITE_FOOD_ID },
        ],
      });

      expect(createdMeal).toEqual({
        id: MEAL_ID,
        name: "Mixed Meal",
        foods: [
          {
            id: INGREDIENT_ID,
            name: "Chicken Breast",
            calories: 165,
            protein: 31,
            carbs: 0,
            fats: 3.6,
            servingSize: 100,
            unit: "GRAM",
          },
          {
            id: COMPOSITE_FOOD_ID,
            name: "Protein Bowl",
            calories: 195,
            protein: 4.05,
            carbs: 42,
            fats: 0.45,
            servingSize: 250,
            unit: "GRAM",
            ingredients: [
              {
                ingredientId: SUB_INGREDIENT_ID,
                name: "Rice",
                calories: 130,
                protein: 2.7,
                carbs: 28,
                fats: 0.3,
                amount: 150,
                unit: "GRAM",
                servingSize: 100,
              },
            ],
          },
        ],
      });
      expect(mockedMealRepo.createWithFoods).toHaveBeenCalledWith({
        name: "Mixed Meal",
        foods: [
          { ingredientId: INGREDIENT_ID },
          { compositeFoodId: COMPOSITE_FOOD_ID },
        ],
      });
      expect(mockedIngredientRepo.findByIds).toHaveBeenCalledWith([INGREDIENT_ID]);
      expect(mockedCompositeFoodRepo.findByIdsWithIngredients).toHaveBeenCalledWith([
        COMPOSITE_FOOD_ID,
      ]);
    });
  });

  describe("list", () => {
    it("returns an empty array when no meals exist", async () => {
      mockedMealRepo.findAll.mockResolvedValue([]);
      mockedMealRepo.findFoodsByMealIds.mockResolvedValue([]);
      mockedIngredientRepo.findByIds.mockResolvedValue([]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([]);

      const meals = await mealService.list();

      expect(meals).toEqual([]);
    });

    it("returns each meal with its expanded foods", async () => {
      const MEAL_ID = "meal-list-1";
      const INGREDIENT_ID = "ing-list-1";

      const mealRow: MealRow = {
        id: MEAL_ID,
        name: "Lunch",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };

      const mealFoodRow: MealFoodRow = {
        id: "mf-1",
        meal_id: MEAL_ID,
        ingredient_id: INGREDIENT_ID,
        composite_food_id: null,
      };

      const ingredientRow: IngredientRow = {
        id: INGREDIENT_ID,
        name: "Eggs",
        calories: 155,
        protein: 13,
        carbs: 1.1,
        fats: 11,
        serving_size: 100,
        unit: "GRAM",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-01T12:00:00.000Z"),
      };

      mockedMealRepo.findAll.mockResolvedValue([mealRow]);
      mockedMealRepo.findFoodsByMealIds.mockResolvedValue([mealFoodRow]);
      mockedIngredientRepo.findByIds.mockResolvedValue([ingredientRow]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([]);

      const meals = await mealService.list();

      expect(meals).toEqual([
        {
          id: MEAL_ID,
          name: "Lunch",
          foods: [
            {
              id: INGREDIENT_ID,
              name: "Eggs",
              calories: 155,
              protein: 13,
              carbs: 1.1,
              fats: 11,
              servingSize: 100,
              unit: "GRAM",
            },
          ],
        },
      ]);
    });
  });

  describe("update", () => {
    it("returns null when the meal does not exist", async () => {
      mockedMealRepo.update.mockResolvedValue(null);

      const updatedMeal = await mealService.update("non-existent-id", {
        name: "New Name",
      });

      expect(updatedMeal).toBeNull();
    });

    it("returns the updated meal with foods on success", async () => {
      const MEAL_ID = "meal-update-1";
      const updatedRow: MealRow = {
        id: MEAL_ID,
        name: "Updated Meal",
        created_at: new Date("2026-06-01T12:00:00.000Z"),
        updated_at: new Date("2026-06-02T12:00:00.000Z"),
      };

      mockedMealRepo.update.mockResolvedValue(updatedRow);
      mockedMealRepo.findFoodsByMealId.mockResolvedValue([]);
      mockedIngredientRepo.findByIds.mockResolvedValue([]);
      mockedCompositeFoodRepo.findByIdsWithIngredients.mockResolvedValue([]);

      const updatedMeal = await mealService.update(MEAL_ID, { name: "Updated Meal" });

      expect(updatedMeal).toEqual({
        id: MEAL_ID,
        name: "Updated Meal",
        foods: [],
      });
    });
  });

  describe("delete", () => {
    it("returns true when the repository deletes the row", async () => {
      mockedMealRepo.delete.mockResolvedValue(true);

      const deleted = await mealService.delete("meal-del-1");

      expect(deleted).toBe(true);
    });

    it("returns false when the repository did not delete", async () => {
      mockedMealRepo.delete.mockResolvedValue(false);

      const deleted = await mealService.delete("non-existent-id");

      expect(deleted).toBe(false);
    });
  });
});
