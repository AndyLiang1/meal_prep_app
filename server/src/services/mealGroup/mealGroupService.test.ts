import { describe, it, beforeEach, vi } from "vitest";
import { mealGroupService } from "./mealGroupService.js";
import { mealGroupRepository } from "../../repositories/mealGroup/mealGroupRepository.js";
import { mealRepository } from "../../repositories/meal/mealRepository.js";
import { MISSING_ID } from "../../constants.js";

// Unit tests for the service: both repositories are fully mocked so these
// tests don't touch the database. The service has branching logic around
// `displayAsDefault` / `unsetDefaultsForTag` and existence checks, which is
// the main thing worth covering here.
vi.mock("../../repositories/mealGroup/mealGroupRepository.js", () => {
  return {
    mealGroupRepository: {
      createWithMeals: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      findMealsByMealGroupId: vi.fn(),
      unsetDefaultsForTag: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

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

const mockedMealGroupRepo = vi.mocked(mealGroupRepository, true);
const mockedMealRepo = vi.mocked(mealRepository, true);

describe("mealGroupService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it.todo("returns an error when one of the meal ids does not exist");
    it.todo("deduplicates meal ids before the existence check");
    it.todo(
      "does NOT call unsetDefaultsForTag when displayAsDefault is false / undefined",
    );
    it.todo(
      "calls unsetDefaultsForTag(tag) before creating when displayAsDefault is true",
    );
    it.todo("returns the created meal group with meals expanded (name + sortOrder)");
    it.todo('returns "Unknown" for a meal whose lookup returns null');
  });

  describe("list", () => {
    it.todo("returns an empty array when no meal groups exist");
    it.todo("returns each meal group with its expanded meals");
  });

  describe("getById", () => {
    it.todo("returns null when the meal group does not exist");
    it.todo("returns the meal group with its expanded meals");
  });

  describe("update", () => {
    it.todo("returns null when the meal group does not exist");
    it.todo(
      "does NOT call unsetDefaultsForTag when effective displayAsDefault is false",
    );
    it.todo(
      "calls unsetDefaultsForTag with the input tag when provided and effective default is true",
    );
    it.todo(
      "calls unsetDefaultsForTag with the existing tag when input tag is omitted and existing default is true",
    );
    it.todo(
      "passes the current id to unsetDefaultsForTag so the group itself isn't unset",
    );
    it.todo("returns null when repo.update returns null");
    it.todo("returns the updated meal group with meals expanded on success");
  });

  describe("delete", () => {
    it.todo("returns true when the repository deletes the row");
    it.todo("returns false when the repository did not delete");
  });
});

// Keep unused handles referenced while scaffold still uses it.todo;
// delete these lines as real tests are filled in.
void mockedMealGroupRepo;
void mockedMealRepo;
void MISSING_ID;
