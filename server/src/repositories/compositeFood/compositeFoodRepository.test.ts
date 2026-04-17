import { describe, it, expect } from "vitest";
import { compositeFoodRepository } from "./compositeFoodRepository.js";
import { ingredientRepository } from "../ingredient/ingredientRepository.js";
import {
  MISSING_ID,
  UUID_REGEX,
  buildIngredientInput,
} from "../ingredient/ingredientRepository.fixtures.js";
import { createTestCompositeFood } from "./compositeFoodRepository.fixtures.js";


describe("compositeFoodRepository", () => {
  describe("createWithIngredients", () => {
    it("creates a composite food and its ingredient links atomically", async () => {
      const ingredient1 = await ingredientRepository.create(
        buildIngredientInput({ name: "ingredient-1" })
      );
      const ingredient2 = await ingredientRepository.create(
        buildIngredientInput({ name: "ingredient-2" })
      );

      const compositeFood = await compositeFoodRepository.createWithIngredients({
        name: "composite-food-1",
        ingredients: [
          { ingredientId: ingredient1.id, quantity: 1 },
          { ingredientId: ingredient2.id, quantity: 2 },
        ],
      });

      expect(compositeFood).toEqual({
        id: expect.stringMatching(UUID_REGEX),
        name: "composite-food-1",
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });

      const joinRows = await compositeFoodRepository.findIngredientRows(
        compositeFood.id
      );
      expect(joinRows).toHaveLength(2);
      expect(joinRows).toEqual([
        {
          ingredient_id: ingredient1.id,
          name: "ingredient-1",
          quantity: 1,
        },
        {
          ingredient_id: ingredient2.id,
          name: "ingredient-2",
          quantity: 2,
        },
      ]);
    });

    it("rolls back the composite_food insert when an ingredient FK is invalid", async () => {
      expect(await compositeFoodRepository.findAll()).toEqual([]);

      await expect(
        compositeFoodRepository.createWithIngredients({
          name: "composite-food-invalid-fk",
          ingredients: [{ ingredientId: MISSING_ID, quantity: 1 }],
        })
      ).rejects.toThrow();

      expect(await compositeFoodRepository.findAll()).toEqual([]);
    });
  });

  describe("findAll", () => {
    it("returns an empty array when none exist", async () => {
      const rows = await compositeFoodRepository.findAll();
      expect(rows).toEqual([]);
    });

    it("returns rows sorted by created_at asc (oldest first)", async () => {
      const compositeFoodOlder = await createTestCompositeFood(
        "composite-food-sort-1"
      );
      const compositeFoodNewer = await createTestCompositeFood(
        "composite-food-sort-2"
      );

      const rows = await compositeFoodRepository.findAll();
      expect(rows.map((row) => row.id)).toEqual([
        compositeFoodOlder.id,
        compositeFoodNewer.id,
      ]);
    });
  });

  describe("findById", () => {
    it("returns the row when it exists", async () => {
      const persistedCompositeFood = await createTestCompositeFood(
        "composite-food-lookup"
      );
      const found = await compositeFoodRepository.findById(
        persistedCompositeFood.id
      );

      expect(found).toEqual(persistedCompositeFood);
    });

    it("returns null when not found", async () => {
      const found = await compositeFoodRepository.findById(MISSING_ID);
      expect(found).toBeNull();
    });
  });

  describe("findIngredientRows", () => {
    it("returns the join shape with ingredient macros and quantity", async () => {
      const ingredient1 = await ingredientRepository.create(
        buildIngredientInput()
      );

      const compositeFood = await compositeFoodRepository.createWithIngredients({
        name: "composite-food-1",
        ingredients: [{ ingredientId: ingredient1.id, quantity: 2 }],
      });

      const joinRows = await compositeFoodRepository.findIngredientRows(
        compositeFood.id
      );

      expect(joinRows).toEqual([
        {
          ingredient_id: ingredient1.id,
          name: "Banana",
          quantity: 2,
          calories: 105,
          protein: 1.3,
          carbs: 27,
          fats: 0.4,
        },
      ]);
    });

    it("returns an empty array for an unknown composite id", async () => {
      const joinRows = await compositeFoodRepository.findIngredientRows(
        MISSING_ID
      );
      expect(joinRows).toEqual([]);
    });
  });

  describe("delete", () => {
    it("returns true and removes the row when it exists", async () => {
      const compositeFood = await createTestCompositeFood("composite-food-delete");
      const deleted = await compositeFoodRepository.delete(compositeFood.id);

      expect(deleted).toBe(true);
      expect(
        await compositeFoodRepository.findById(compositeFood.id)
      ).toBeNull();
    });

    it("returns false when the row does not exist", async () => {
      const deleted = await compositeFoodRepository.delete(MISSING_ID);
      expect(deleted).toBe(false);
    });
  });
});
