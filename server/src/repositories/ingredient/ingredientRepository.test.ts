import { describe, it, expect } from "vitest";
import { ingredientRepository } from "./ingredientRepository.js";
import {
  MISSING_ID,
  UUID_REGEX,
  buildIngredientInput,
  sampleIngredientInput,
} from "./ingredientRepository.fixtures.js";

describe("ingredientRepository", () => {
  describe("create", () => {
    it("inserts a row and returns the full persisted shape", async () => {
      const persistedIngredient = await ingredientRepository.create(
        sampleIngredientInput
      );

      expect(persistedIngredient).toEqual({
        id: expect.stringMatching(UUID_REGEX),
        ...sampleIngredientInput,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });
  });

  describe("findAll", () => {
    it("returns an empty array when nothing exists", async () => {
      const rows = await ingredientRepository.findAll();
      expect(rows).toEqual([]);
    });

    it("returns all rows sorted by created_at desc (newest first)", async () => {
      const ingredientOldest = await ingredientRepository.create(
        buildIngredientInput({ name: "ingredient-1" })
      );
      const ingredientMiddle = await ingredientRepository.create(
        buildIngredientInput({ name: "ingredient-2" })
      );
      const ingredientNewest = await ingredientRepository.create(
        buildIngredientInput({ name: "ingredient-3" })
      );

      const rows = await ingredientRepository.findAll();

      expect(rows.map((row) => row.id)).toEqual([
        ingredientNewest.id,
        ingredientMiddle.id,
        ingredientOldest.id,
      ]);
      expect(rows.map((row) => row.name)).toEqual([
        "ingredient-3",
        "ingredient-2",
        "ingredient-1",
      ]);
    });
  });

  describe("findById", () => {
    it("returns the row when it exists", async () => {
      const persistedIngredient = await ingredientRepository.create(
        sampleIngredientInput
      );
      const found = await ingredientRepository.findById(persistedIngredient.id);

      expect(found).toEqual(persistedIngredient);
    });

    it("returns null when not found", async () => {
      const found = await ingredientRepository.findById(MISSING_ID);
      expect(found).toBeNull();
    });
  });

  describe("findExistingIds", () => {
    it("short-circuits and returns empty array for an empty input", async () => {
      const ids = await ingredientRepository.findExistingIds([]);
      expect(ids).toEqual([]);
    });

    it("returns all ids when all exist", async () => {
      const ingredient1 = await ingredientRepository.create(
        buildIngredientInput({ name: "ingredient-1" })
      );
      const ingredient2 = await ingredientRepository.create(
        buildIngredientInput({ name: "ingredient-2" })
      );

      const result = await ingredientRepository.findExistingIds([
        ingredient1.id,
        ingredient2.id,
      ]);
      expect(result.sort()).toEqual([ingredient1.id, ingredient2.id].sort());
    });

    it("returns only the subset of ids that exist", async () => {
      const ingredient1 = await ingredientRepository.create(
        buildIngredientInput({ name: "ingredient-1" })
      );

      const result = await ingredientRepository.findExistingIds([
        ingredient1.id,
        MISSING_ID,
      ]);
      expect(result).toEqual([ingredient1.id]);
    });

    it("returns empty array when none of the input ids exist", async () => {
      const result = await ingredientRepository.findExistingIds([MISSING_ID]);
      expect(result).toEqual([]);
    });

    it("deduplicates repeated ids in the input", async () => {
      const ingredient1 = await ingredientRepository.create(
        buildIngredientInput({ name: "ingredient-1" })
      );

      const result = await ingredientRepository.findExistingIds([
        ingredient1.id,
        ingredient1.id,
        ingredient1.id,
      ]);
      expect(result).toEqual([ingredient1.id]);
    });
  });

  describe("update", () => {
    it("returns the full row with patched fields and a bumped updated_at", async () => {
      const beforeUpdate = await ingredientRepository.create(sampleIngredientInput);

      const updatedIngredient = await ingredientRepository.update(beforeUpdate.id, {
        calories: 200,
        protein: 5,
      });

      expect(updatedIngredient).toEqual({
        ...beforeUpdate,
        calories: 200,
        protein: 5,
        updated_at: expect.any(Date),
      });
      expect(updatedIngredient!.updated_at.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.updated_at.getTime()
      );
    });

    it("returns null when the row does not exist", async () => {
      const result = await ingredientRepository.update(MISSING_ID, {
        name: "Ingredient 1 New",
      });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("returns true and removes the row when it exists", async () => {
      const persistedIngredient = await ingredientRepository.create(
        sampleIngredientInput
      );
      const deleted = await ingredientRepository.delete(persistedIngredient.id);

      expect(deleted).toBe(true);
      expect(
        await ingredientRepository.findById(persistedIngredient.id)
      ).toBeNull();
    });

    it("returns false when the row does not exist", async () => {
      const deleted = await ingredientRepository.delete(MISSING_ID);
      expect(deleted).toBe(false);
    });
  });
});
