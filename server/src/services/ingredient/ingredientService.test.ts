import { describe, it, expect, beforeEach, vi } from "vitest";
import { ingredientService } from "./ingredientService.js";
import { ingredientRepository } from "../../repositories/ingredient/ingredientRepository.js";
import {
  generateIngredientInput,
  mockCreateIngredientData,
} from "../../repositories/ingredient/ingredientRepository.fixtures.js";
import {
  MOCK_INGREDIENT_ID_1,
  MOCK_INGREDIENT_ID_2,
  mockExpectedTIngredient1,
  mockExpectedTIngredient2,
  mockIngredientRow1,
  mockIngredientRow2,
} from "./ingredientService.fixtures.js";
import { MISSING_ID } from "../../constants.js";
import type {
  CreateIngredientData,
  TIngredientUnit,
  UpdateIngredientData,
} from "../../schemas/ingredient.js";
import type { TIngredient } from "../../types.js";

vi.mock("../../repositories/ingredient/ingredientRepository.js", () => {
  return {
    ingredientRepository: {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockedRepo = vi.mocked(ingredientRepository, true);

describe("ingredientService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRepo.create.mockReset();
    mockedRepo.findAll.mockReset();
    mockedRepo.findById.mockReset();
    mockedRepo.update.mockReset();
    mockedRepo.delete.mockReset();
  });

  describe("create", () => {
    it("should not create an ingredient with a missing name", async () => {
      const malformedCreateIngredientData: CreateIngredientData = {
        ...mockCreateIngredientData,
        name: "",
      };
      await expect(
        ingredientService.create(malformedCreateIngredientData),
      ).rejects.toThrow();
      expect(mockedRepo.create).not.toHaveBeenCalled();
    });
    it("should not create an ingredient with a negative macros", async () => {
      const malformedCreateIngredientData: CreateIngredientData = {
        ...mockCreateIngredientData,
        calories: -1,
      };
      await expect(
        ingredientService.create(malformedCreateIngredientData),
      ).rejects.toThrow();
      expect(mockedRepo.create).not.toHaveBeenCalled();
    });
    it("should not create an ingredient with a negative serving size", async () => {
      const malformedCreateIngredientData: CreateIngredientData = {
        ...mockCreateIngredientData,
        servingSize: -1,
      };
      await expect(
        ingredientService.create(malformedCreateIngredientData),
      ).rejects.toThrow();
      expect(mockedRepo.create).not.toHaveBeenCalled();
    });
    it("should not create an ingredient with a missing or invalid unit", async () => {
      const malformedCreateIngredientData: CreateIngredientData = {
        ...mockCreateIngredientData,
        unit: undefined as unknown as TIngredientUnit,
      };
      await expect(
        ingredientService.create(malformedCreateIngredientData),
      ).rejects.toThrow();
      expect(mockedRepo.create).not.toHaveBeenCalled();
      malformedCreateIngredientData.unit = "INVALID" as TIngredientUnit;
      await expect(
        ingredientService.create(malformedCreateIngredientData),
      ).rejects.toThrow();
      expect(mockedRepo.create).not.toHaveBeenCalled();
    });
    it("should create an ingredient", async () => {
      mockedRepo.create.mockResolvedValue(mockIngredientRow1);
      const ingredient: TIngredient = await ingredientService.create(
        mockCreateIngredientData,
      );
      expect(ingredient).toEqual(mockExpectedTIngredient1);
      expect(mockedRepo.create).toHaveBeenCalledWith(mockCreateIngredientData);
    });
  });

  describe("list", () => {
    it("should return empty array when no ingredients exist", async () => {
      mockedRepo.findAll.mockResolvedValue([]);
      const ingredients: TIngredient[] = await ingredientService.list();
      expect(ingredients).toEqual([]);
      expect(mockedRepo.findAll).toHaveBeenCalled();
    });
    it("should return the correct ingredients", async () => {
      mockedRepo.findAll.mockResolvedValue([mockIngredientRow1, mockIngredientRow2]);
      const ingredients: TIngredient[] = await ingredientService.list();
      expect(ingredients).toEqual([mockExpectedTIngredient1, mockExpectedTIngredient2]);
      expect(mockedRepo.findAll).toHaveBeenCalled();
    });
  });

  // describe("getById", () => {
  //   it("should return null when the ingredient does not exist", async () => {
  //     mockedRepo.findById.mockResolvedValue(null);
  //     const ingredient: TIngredient | null =
  //       await ingredientService.getById(MISSING_ID);
  //     expect(ingredient).toBeNull();
  //     expect(mockedRepo.findById).toHaveBeenCalledWith(MISSING_ID);
  //   });
  //   it("should return the correct ingredient", async () => {
  //     const ingredientInfo = generateIngredientInput({ name: "ingredient-1" });
  //     const row = mockIngredientRow1(ingredientInfo, MOCK_INGREDIENT_ID_1);
  //     mockedRepo.findById.mockResolvedValue(row);
  //     const ingredientFound: TIngredient | null = await ingredientService.getById(
  //       MOCK_INGREDIENT_ID_1,
  //     );
  //     expect(ingredientFound).toEqual(mockExpectedTIngredient1);
  //     expect(mockedRepo.findById).toHaveBeenCalledWith(MOCK_INGREDIENT_ID_1);
  //   });
  // });

  describe("update", () => {
    it("should not update when ingredient name is blank", async () => {
      await expect(
        ingredientService.update(MOCK_INGREDIENT_ID_1, { name: "" }),
      ).rejects.toThrow();
      expect(mockedRepo.update).not.toHaveBeenCalled();
    });
    it("should not update when macros are negative", async () => {
      await expect(
        ingredientService.update(MOCK_INGREDIENT_ID_1, {
          name: "",
          calories: -1,
          protein: -1,
          carbs: -1,
          fats: -1,
        }),
      ).rejects.toThrow();
      expect(mockedRepo.update).not.toHaveBeenCalled();
    });
    it("should not update when serving size is negative", async () => {
      await expect(
        ingredientService.update(MOCK_INGREDIENT_ID_1, { servingSize: -1 }),
      ).rejects.toThrow();
      expect(mockedRepo.update).not.toHaveBeenCalled();
    });
    it("should not update when unit is invalid", async () => {
      await expect(
        ingredientService.update(MOCK_INGREDIENT_ID_1, {
          unit: "INVALID" as TIngredientUnit,
        }),
      ).rejects.toThrow();
      expect(mockedRepo.update).not.toHaveBeenCalled();
    });
    it("should not update when input is empty", async () => {
      await expect(
        ingredientService.update(MOCK_INGREDIENT_ID_1, {}),
      ).rejects.toThrow();
      expect(mockedRepo.update).not.toHaveBeenCalled();
    });
    it("should return null when the ingredient does not exist", async () => {
      mockedRepo.update.mockResolvedValue(null);
      const ingredient: TIngredient | null = await ingredientService.update(
        MISSING_ID,
        { name: "ingredient-1" },
      );
      expect(ingredient).toBeNull();
      expect(mockedRepo.update).toHaveBeenCalledWith(MISSING_ID, {
        name: "ingredient-1",
      });
    });
    it("should update the correct ingredient correctly", async () => {
      const updateIngredientInput: UpdateIngredientData = {
        name: "updated-ingredient-1",
        calories: 200,
      } as const;
      mockedRepo.update.mockImplementation(async (id) => {
        if (id === MOCK_INGREDIENT_ID_1)
          return {
            ...mockIngredientRow1,
            name: updateIngredientInput.name!,
            calories: updateIngredientInput.calories!,
          };
        return mockIngredientRow2;
      });

      const updatedIngredient: TIngredient | null = await ingredientService.update(
        MOCK_INGREDIENT_ID_1,
        updateIngredientInput,
      );

      expect(updatedIngredient).toEqual({
        ...mockExpectedTIngredient1,
        name: updateIngredientInput.name,
        calories: updateIngredientInput.calories,
      });
      expect(mockedRepo.update).toHaveBeenCalledTimes(1);
      expect(mockedRepo.update).toHaveBeenCalledWith(
        MOCK_INGREDIENT_ID_1,
        updateIngredientInput,
      );
      expect(mockedRepo.update).not.toHaveBeenCalledWith(
        MOCK_INGREDIENT_ID_2,
        expect.anything(),
      );
    });
  });

  describe("delete", () => {
    it("should return false when the ingredient does not exist", async () => {
      mockedRepo.delete.mockResolvedValue(false);
      const deleted: boolean = await ingredientService.delete(MISSING_ID);
      expect(deleted).toBe(false);
      expect(mockedRepo.delete).toHaveBeenCalledWith(MISSING_ID);
    });
    it("should return true when the ingredient is deleted", async () => {
      mockedRepo.delete.mockResolvedValue(true);
      const deleted: boolean = await ingredientService.delete(MOCK_INGREDIENT_ID_1);
      expect(deleted).toBe(true);
      expect(mockedRepo.delete).toHaveBeenCalledWith(MOCK_INGREDIENT_ID_1);
    });
  });
});
