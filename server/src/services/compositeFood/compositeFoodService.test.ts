import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  compositeFoodService,
  type CreateCompositeFoodInput,
  type UpdateCompositeFoodInput,
} from "./compositeFoodService.js";
import { compositeFoodRepository } from "../../repositories/compositeFood/compositeFoodRepository.js";
import { ingredientRepository } from "../../repositories/ingredient/ingredientRepository.js";
import { MISSING_ID } from "../../constants.js";
import type { TCompositeFood } from "../../types.js";
import {
  MOCK_COMPOSITE_FOOD_ID_1,
  MOCK_COMPOSITE_FOOD_ID_2,
  MOCK_INGREDIENT_ID_1,
  MOCK_INGREDIENT_ID_2,
  MOCK_INGREDIENT_ID_3,
  mockCompositeFoodRow1,
  mockCompositeFoodRow2,
  mockIngredientJoinRow1,
  mockIngredientJoinRow2,
  mockIngredientJoinRow3,
  mockCreateCompositeFoodInput1,
  mockCreateCompositeFoodInput2,
  mockExpectedTCompositeFood1,
  mockExpectedTCompositeFood2,
  mockFlatJoinRowsCompositeFood1,
  mockFlatJoinRowsCompositeFood2,
} from "./compositeFoodService.fixtures.js";

vi.mock("../../repositories/compositeFood/compositeFoodRepository.js", () => {
  return {
    compositeFoodRepository: {
      createWithIngredients: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      findAllWithIngredients: vi.fn(),
      findByIdWithIngredients: vi.fn(),
      findIngredientRows: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock("../../repositories/ingredient/ingredientRepository.js", () => {
  return {
    ingredientRepository: {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      findExistingIds: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockedCompositeFoodRepo = vi.mocked(compositeFoodRepository, true);
const mockedIngredientRepo = vi.mocked(ingredientRepository, true);

describe("compositeFoodService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should not create a composite food when one or more ingredients are not found", async () => {
      mockedIngredientRepo.findExistingIds.mockResolvedValue([]);

      const input: CreateCompositeFoodInput = {
        name: "composite-food-1",
        servingSize: 100,
        unit: "GRAM",
        ingredients: [{ ingredientId: MISSING_ID, amount: 100 }],
      };
      await expect(compositeFoodService.create(input)).rejects.toThrow();
    });

    it("should create a well formed composite food with a neutral and positive scale", async () => {
      mockedIngredientRepo.findExistingIds.mockResolvedValue([
        MOCK_INGREDIENT_ID_1,
        MOCK_INGREDIENT_ID_2,
      ]);
      mockedCompositeFoodRepo.createWithIngredients.mockResolvedValue(
        mockCompositeFoodRow1,
      );
      mockedCompositeFoodRepo.findIngredientRows.mockResolvedValue([
        mockIngredientJoinRow1,
        mockIngredientJoinRow2,
      ]);

      const compositeFood = await compositeFoodService.create(
        mockCreateCompositeFoodInput1,
      );

      expect(compositeFood).toEqual(mockExpectedTCompositeFood1);
      expect(mockedCompositeFoodRepo.createWithIngredients).toHaveBeenCalledWith(
        mockCreateCompositeFoodInput1,
      );
    });
    it("should create a well formed composite food with a fractional scale", async () => {
      mockedIngredientRepo.findExistingIds.mockResolvedValue([MOCK_INGREDIENT_ID_1]);
      mockedCompositeFoodRepo.createWithIngredients.mockResolvedValue(
        mockCompositeFoodRow2,
      );
      mockedCompositeFoodRepo.findIngredientRows.mockResolvedValue([
        mockIngredientJoinRow3,
      ]);

      const compositeFood = await compositeFoodService.create(
        mockCreateCompositeFoodInput2,
      );

      expect(compositeFood).toEqual(mockExpectedTCompositeFood2);
      expect(mockedCompositeFoodRepo.createWithIngredients).toHaveBeenCalledWith(
        mockCreateCompositeFoodInput2,
      );
    });
  });

  describe("list", () => {
    it("should return an empty array when there are no composite foods", async () => {
      mockedCompositeFoodRepo.findAllWithIngredients.mockResolvedValue([]);

      const compositeFoods: TCompositeFood[] = await compositeFoodService.list();

      expect(compositeFoods).toEqual([]);
    });

    it("should return a list of composite foods", async () => {
      mockedCompositeFoodRepo.findAllWithIngredients.mockResolvedValue([
        ...mockFlatJoinRowsCompositeFood1,
        ...mockFlatJoinRowsCompositeFood2,
      ]);

      const compositeFoods: TCompositeFood[] = await compositeFoodService.list();

      expect(compositeFoods).toEqual([
        mockExpectedTCompositeFood1,
        mockExpectedTCompositeFood2,
      ]);
    });
  });

  describe("getById", () => {
    it("should return null when the composite food does not exist", async () => {
      mockedCompositeFoodRepo.findByIdWithIngredients.mockResolvedValue([]);

      const compositeFood: TCompositeFood | null =
        await compositeFoodService.getById(MISSING_ID);

      expect(compositeFood).toBeNull();
      expect(mockedCompositeFoodRepo.findByIdWithIngredients).toHaveBeenCalledWith(
        MISSING_ID,
      );
    });

    it("should return the composite food when it exists", async () => {
      mockedCompositeFoodRepo.findByIdWithIngredients.mockResolvedValue(
        mockFlatJoinRowsCompositeFood1,
      );

      const compositeFood: TCompositeFood | null = await compositeFoodService.getById(
        MOCK_COMPOSITE_FOOD_ID_1,
      );

      expect(compositeFood).toEqual(mockExpectedTCompositeFood1);
      expect(mockedCompositeFoodRepo.findByIdWithIngredients).toHaveBeenCalledWith(
        MOCK_COMPOSITE_FOOD_ID_1,
      );
    });
  });

  describe("update", () => {
    it("should return null when the composite food does not exist", async () => {
      mockedCompositeFoodRepo.findById.mockResolvedValue(null);

      const result = await compositeFoodService.update(MISSING_ID, {
        name: "composite-food-1",
      });

      expect(result).toBeNull();
      expect(mockedCompositeFoodRepo.update).not.toHaveBeenCalled();
    });

    it("should update the name without touching ingredients", async () => {
      mockedCompositeFoodRepo.findById.mockResolvedValue(mockCompositeFoodRow1);
      mockedCompositeFoodRepo.update.mockResolvedValue({
        ...mockCompositeFoodRow1,
        name: "composite-food-1-renamed",
      });
      mockedCompositeFoodRepo.findByIdWithIngredients.mockResolvedValue(
        mockFlatJoinRowsCompositeFood1.map((joinRow) => ({
          ...joinRow,
          name: "composite-food-1-renamed",
        })),
      );

      const input: UpdateCompositeFoodInput = { name: "composite-food-1-renamed" };
      const updatedCompositeFood = await compositeFoodService.update(
        MOCK_COMPOSITE_FOOD_ID_1,
        input,
      );

      expect(updatedCompositeFood).toEqual({
        ...mockExpectedTCompositeFood1,
        name: "composite-food-1-renamed",
      });
      expect(mockedCompositeFoodRepo.update).toHaveBeenCalledWith(
        MOCK_COMPOSITE_FOOD_ID_1,
        input,
      );
      // we don't touch ingredients when only the name is updated
      expect(mockedIngredientRepo.findExistingIds).not.toHaveBeenCalled();
    });

    it("should add new ingredients correctly ", async () => {
      mockedCompositeFoodRepo.findById.mockResolvedValue(mockCompositeFoodRow1);
      mockedIngredientRepo.findExistingIds.mockResolvedValue([
        MOCK_INGREDIENT_ID_1,
        MOCK_INGREDIENT_ID_2,
        MOCK_INGREDIENT_ID_3,
      ]);
      mockedCompositeFoodRepo.update.mockResolvedValue(mockCompositeFoodRow1);
      mockedCompositeFoodRepo.findByIdWithIngredients.mockResolvedValue([
        mockFlatJoinRowsCompositeFood1[0],
        mockFlatJoinRowsCompositeFood1[1],
        {
          id: MOCK_COMPOSITE_FOOD_ID_1,
          name: "composite-food-1",
          cf_serving_size: 300,
          cf_unit: "GRAM",
          amount: 300,
          serving_size: 100,
          unit: "GRAM",
          ingredient_id: MOCK_INGREDIENT_ID_3,
          ingredient_name: "ingredient-3",
          calories: 100,
          protein: 100,
          carbs: 100,
          fats: 100,
        },
      ]);

      const input: UpdateCompositeFoodInput = {
        ingredients: [
          { ingredientId: MOCK_INGREDIENT_ID_1, amount: 100 },
          { ingredientId: MOCK_INGREDIENT_ID_2, amount: 200 },
          { ingredientId: MOCK_INGREDIENT_ID_3, amount: 300 },
        ],
      };
      const updatedCompositeFood = await compositeFoodService.update(
        MOCK_COMPOSITE_FOOD_ID_1,
        input,
      );

      expect(updatedCompositeFood!.ingredients).toHaveLength(3);
      expect(updatedCompositeFood).toEqual({
        id: MOCK_COMPOSITE_FOOD_ID_1,
        name: "composite-food-1",
        servingSize: 300,
        unit: "GRAM",
        calories: 306 + 100 * 3,
        protein: 3.3 + 100 * 3,
        carbs: 3.6 + 100 * 3,
        fats: 3.9 + 100 * 3,
        ingredients: [
          ...mockExpectedTCompositeFood1.ingredients,
          {
            ingredientId: MOCK_INGREDIENT_ID_3,
            name: "ingredient-3",
            calories: 100,
            protein: 100,
            carbs: 100,
            fats: 100,
            amount: 300,
            unit: "GRAM",
            servingSize: 100,
          },
        ],
      });
    });

    it("should update existing ingredients correctly", async () => {
      mockedCompositeFoodRepo.findById.mockResolvedValue(mockCompositeFoodRow1);
      mockedIngredientRepo.findExistingIds.mockResolvedValue([
        MOCK_INGREDIENT_ID_1,
        MOCK_INGREDIENT_ID_2,
      ]);
      mockedCompositeFoodRepo.update.mockResolvedValue(mockCompositeFoodRow1);
      mockedCompositeFoodRepo.findByIdWithIngredients.mockResolvedValue([
        { ...mockFlatJoinRowsCompositeFood1[0], amount: 150 },
        mockFlatJoinRowsCompositeFood1[1],
      ]);

      const input: UpdateCompositeFoodInput = {
        ingredients: [
          { ingredientId: MOCK_INGREDIENT_ID_1, amount: 150 },
          { ingredientId: MOCK_INGREDIENT_ID_2, amount: 200 },
        ],
      };
      const updatedCompositeFood = await compositeFoodService.update(
        MOCK_COMPOSITE_FOOD_ID_1,
        input,
      );

      expect(updatedCompositeFood!.ingredients).toHaveLength(2);
      expect(updatedCompositeFood).toEqual({
        id: MOCK_COMPOSITE_FOOD_ID_1,
        name: "composite-food-1",
        servingSize: 300,
        unit: "GRAM",
        calories: 153 + 204,
        protein: 1.65 + 2.2,
        carbs: 1.8 + 2.4,
        fats: 1.95 + 2.6,
        ingredients: [
          {
            ...mockExpectedTCompositeFood1.ingredients[0],
            amount: 150,
          },
          { ...mockExpectedTCompositeFood1.ingredients[1] },
        ],
      });
    });

    it("should remove ingredients correctly", async () => {
      mockedCompositeFoodRepo.findById.mockResolvedValue(mockCompositeFoodRow1);
      mockedIngredientRepo.findExistingIds.mockResolvedValue([MOCK_INGREDIENT_ID_1]);
      mockedCompositeFoodRepo.update.mockResolvedValue(mockCompositeFoodRow1);
      mockedCompositeFoodRepo.findByIdWithIngredients.mockResolvedValue([
        mockFlatJoinRowsCompositeFood1[0],
      ]);

      const input: UpdateCompositeFoodInput = {
        ingredients: [{ ingredientId: MOCK_INGREDIENT_ID_1, amount: 100 }],
      };
      const updatedCompositeFood = await compositeFoodService.update(
        MOCK_COMPOSITE_FOOD_ID_1,
        input,
      );

      expect(updatedCompositeFood!.ingredients).toHaveLength(1);
      expect(updatedCompositeFood).toEqual({
        id: MOCK_COMPOSITE_FOOD_ID_1,
        name: "composite-food-1",
        servingSize: 300,
        unit: "GRAM",
        calories: 102,
        protein: 1.1,
        carbs: 1.2,
        fats: 1.3,
        ingredients: [{ ...mockExpectedTCompositeFood1.ingredients[0] }],
      });
    });

    it("should be able to update the metadata and add, update, remove ingredients all at once", async () => {
      mockedCompositeFoodRepo.findById.mockResolvedValue(mockCompositeFoodRow1);
      mockedIngredientRepo.findExistingIds.mockResolvedValue([
        MOCK_INGREDIENT_ID_1,
        MOCK_INGREDIENT_ID_3,
      ]);
      mockedCompositeFoodRepo.update.mockResolvedValue(mockCompositeFoodRow1);
      mockedCompositeFoodRepo.findByIdWithIngredients.mockResolvedValue([
        {
          ...mockFlatJoinRowsCompositeFood1[0],
          name: "composite-food-1-updated",
          cf_serving_size: 350,
          cf_unit: "MILLILITER",
          amount: 150,
        },
        {
          id: MOCK_COMPOSITE_FOOD_ID_1,
          name: "composite-food-1-updated",
          cf_serving_size: 350,
          cf_unit: "MILLILITER",
          amount: 300,
          serving_size: 100,
          unit: "GRAM",
          ingredient_id: MOCK_INGREDIENT_ID_3,
          ingredient_name: "ingredient-3",
          calories: 100,
          protein: 100,
          carbs: 100,
          fats: 100,
        },
      ]);

      const input: UpdateCompositeFoodInput = {
        name: "composite-food-1-updated",
        ingredients: [
          { ingredientId: MOCK_INGREDIENT_ID_1, amount: 150 },
          { ingredientId: MOCK_INGREDIENT_ID_3, amount: 300 },
        ],
      };
      const updatedCompositeFood = await compositeFoodService.update(
        MOCK_COMPOSITE_FOOD_ID_1,
        input,
      );

      expect(updatedCompositeFood!.ingredients).toHaveLength(2);
      expect(updatedCompositeFood).toEqual({
        id: MOCK_COMPOSITE_FOOD_ID_1,
        name: "composite-food-1-updated",
        servingSize: 350,
        unit: "MILLILITER",
        calories: 153 + 300,
        protein: 1.65 + 300,
        carbs: 1.8 + 300,
        fats: 1.95 + 300,
        ingredients: [
          {
            ...mockExpectedTCompositeFood1.ingredients[0],
            amount: 150,
          },
          {
            ingredientId: MOCK_INGREDIENT_ID_3,
            name: "ingredient-3",
            calories: 100,
            protein: 100,
            carbs: 100,
            fats: 100,
            amount: 300,
            unit: "GRAM",
            servingSize: 100,
          },
        ],
      });
    });

    it("should throw when an ingredient id does not exist", async () => {
      mockedCompositeFoodRepo.findById.mockResolvedValue(mockCompositeFoodRow1);
      mockedIngredientRepo.findExistingIds.mockResolvedValue([]);

      const input: UpdateCompositeFoodInput = {
        ingredients: [{ ingredientId: MISSING_ID, amount: 100 }],
      };
      await expect(
        compositeFoodService.update(MOCK_COMPOSITE_FOOD_ID_1, input),
      ).rejects.toThrow("One or more ingredients not found");
      expect(mockedCompositeFoodRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should return false when the composite food does not exist", async () => {
      mockedCompositeFoodRepo.delete.mockResolvedValue(false);

      const deleted: boolean = await compositeFoodService.delete(MISSING_ID);

      expect(deleted).toBe(false);
      expect(mockedCompositeFoodRepo.delete).toHaveBeenCalledWith(MISSING_ID);
    });

    it("should return true when the composite food is deleted", async () => {
      mockedCompositeFoodRepo.delete.mockResolvedValue(true);

      const deleted: boolean = await compositeFoodService.delete(
        MOCK_COMPOSITE_FOOD_ID_1,
      );

      expect(deleted).toBe(true);
      expect(mockedCompositeFoodRepo.delete).toHaveBeenCalledWith(
        MOCK_COMPOSITE_FOOD_ID_1,
      );
    });

    it("should not delete the composite food's ingredients", async () => {
      mockedCompositeFoodRepo.delete.mockResolvedValue(true);

      await compositeFoodService.delete(MOCK_COMPOSITE_FOOD_ID_1);

      expect(mockedIngredientRepo.delete).not.toHaveBeenCalled();
    });
  });
});
