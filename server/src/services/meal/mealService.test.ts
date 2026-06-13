import { describe, it, beforeEach, vi } from "vitest";
import { mealService } from "./mealService.js";
import { mealRepository } from "../../repositories/meal/mealRepository.js";
import { ingredientRepository } from "../../repositories/ingredient/ingredientRepository.js";
import { compositeFoodRepository } from "../../repositories/compositeFood/compositeFoodRepository.js";
import { MISSING_ID } from "../../constants.js";

// Unit tests for the service: every repository mealService touches is
// mocked. The service composes data from three repos (meal, ingredient,
// composite food), so tests should stub each repo's return values and
// assert on the final rolled-up response shape.
vi.mock("../../repositories/meal/mealRepository.js", () => {
  return {
    mealRepository: {
      createWithFoods: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      findExistingIds: vi.fn(),
      findFoodsByMealId: vi.fn(),
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

vi.mock("../../repositories/compositeFood/compositeFoodRepository.js", () => {
  return {
    compositeFoodRepository: {
      createWithIngredients: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      findIngredientRows: vi.fn(),
      delete: vi.fn(),
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
    it.todo(
      "creates a meal and returns it with ingredient-foods expanded and totals summed",
    );
    it.todo(
      "creates a meal and returns it with composite-foods expanded (macros rolled up from ingredients)",
    );
    it.todo("mixes ingredient and composite foods in the response");
    it.todo('returns "Unknown" when a referenced ingredient is missing');
    it.todo('returns "Unknown" when a referenced composite food is missing');
    it.todo("rounds totals and composite macros to 2 decimals");
  });

  describe("list", () => {
    it.todo("returns an empty array when no meals exist");
    it.todo("returns each meal with its expanded foods and totals");
  });

  describe("update", () => {
    it.todo("returns null when the meal does not exist");
    it.todo("returns the updated meal with re-computed foods and totals on success");
  });

  describe("delete", () => {
    it.todo("returns true when the repository deletes the row");
    it.todo("returns false when the repository did not delete");
  });
});

// Keep unused handles/fixtures referenced while scaffold still uses it.todo;
// delete these lines as real tests are filled in.
void mockedMealRepo;
void mockedIngredientRepo;
void mockedCompositeFoodRepo;
void MISSING_ID;
