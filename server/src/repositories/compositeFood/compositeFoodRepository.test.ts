import { describe, it, expect } from "vitest";
import { compositeFoodRepository } from "./compositeFoodRepository.js";
import { ingredientRepository } from "../ingredient/ingredientRepository.js";
import { generateIngredientInput } from "../ingredient/ingredientRepository.fixtures.js";
import { createTestCompositeFood } from "./compositeFoodRepository.fixtures.js";
import { MISSING_ID, UUID_REGEX } from "../../constants.js";

describe("compositeFoodRepository", () => {
  describe("createWithIngredients", () => {
    it("creates a composite food and its ingredient links atomically", async () => {
      const ingredient1 = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-1" }),
      );
      const ingredient2 = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-2" }),
      );

      const compositeFood = await compositeFoodRepository.createWithIngredients({
        name: "composite-food-1",
        servingSize: 250,
        unit: "GRAM",
        ingredients: [
          { ingredientId: ingredient1.id, amount: 50 },
          { ingredientId: ingredient2.id, amount: 200 },
        ],
      });

      expect(compositeFood).toEqual({
        id: expect.stringMatching(UUID_REGEX),
        name: "composite-food-1",
        serving_size: 250,
        unit: "GRAM",
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });

      const joinRows = await compositeFoodRepository.findIngredientRows(
        compositeFood.id,
      );
      const linkSummaries = joinRows.map((row) => ({
        ingredient_id: row.ingredient_id,
        name: row.name,
        amount: row.amount,
      }));

      expect(linkSummaries).toEqual([
        {
          ingredient_id: ingredient1.id,
          name: "ingredient-1",
          amount: 50,
        },
        {
          ingredient_id: ingredient2.id,
          name: "ingredient-2",
          amount: 200,
        },
      ]);
    });

    it("rolls back the composite_food insert when an ingredient FK is invalid", async () => {
      expect(await compositeFoodRepository.findAll()).toEqual([]);

      await expect(
        compositeFoodRepository.createWithIngredients({
          name: "composite-food-invalid-fk",
          servingSize: 100,
          unit: "GRAM",
          ingredients: [{ ingredientId: MISSING_ID, amount: 100 }],
        }),
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
      const compositeFoodOlder = await createTestCompositeFood("composite-food-sort-1");
      const compositeFoodNewer = await createTestCompositeFood("composite-food-sort-2");

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
        "composite-food-lookup",
      );
      const found = await compositeFoodRepository.findById(persistedCompositeFood.id);

      expect(found).toEqual(persistedCompositeFood);
    });

    it("returns null when not found", async () => {
      const found = await compositeFoodRepository.findById(MISSING_ID);
      expect(found).toBeNull();
    });
  });

  describe("findAllWithIngredients", () => {
    it("returns an empty array when none exist", async () => {
      const rows = await compositeFoodRepository.findAllWithIngredients();
      expect(rows).toEqual([]);
    });

    it("returns one flattened row per composite food ingredient row, oldest composite first", async () => {
      const ingredient1 = await ingredientRepository.create(generateIngredientInput());
      const ingredient2 = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-2" }),
      );

      const compositeFoodRow1 = await compositeFoodRepository.createWithIngredients({
        name: "composite-older",
        servingSize: 200,
        unit: "GRAM",
        ingredients: [
          { ingredientId: ingredient1.id, amount: 50 },
          { ingredientId: ingredient2.id, amount: 150 },
        ],
      });
      const compositeFoodRow2 = await compositeFoodRepository.createWithIngredients({
        name: "composite-newer",
        servingSize: 200,
        unit: "GRAM",
        ingredients: [{ ingredientId: ingredient2.id, amount: 200 }],
      });

      const rows = await compositeFoodRepository.findAllWithIngredients();

      expect(rows).toHaveLength(3);
      expect(rows).toEqual([
        {
          id: compositeFoodRow1.id,
          name: compositeFoodRow1.name,
          cf_serving_size: 200,
          cf_unit: "GRAM",
          ingredient_id: ingredient1.id,
          ingredient_name: "ingredient-1",
          amount: 50,
          serving_size: 100,
          unit: "GRAM",
          calories: 102,
          protein: 1.1,
          carbs: 1.2,
          fats: 1.3,
        },
        {
          id: compositeFoodRow1.id,
          name: compositeFoodRow1.name,
          cf_serving_size: 200,
          cf_unit: "GRAM",
          ingredient_id: ingredient2.id,
          ingredient_name: "ingredient-2",
          amount: 150,
          serving_size: 100,
          unit: "GRAM",
          calories: 102,
          protein: 1.1,
          carbs: 1.2,
          fats: 1.3,
        },
        {
          id: compositeFoodRow2.id,
          name: compositeFoodRow2.name,
          cf_serving_size: 200,
          cf_unit: "GRAM",
          ingredient_id: ingredient2.id,
          ingredient_name: "ingredient-2",
          amount: 200,
          serving_size: 100,
          unit: "GRAM",
          calories: 102,
          protein: 1.1,
          carbs: 1.2,
          fats: 1.3,
        },
      ]);
    });
  });

  describe("findByIdWithIngredients", () => {
    it("returns an empty array when no composite exists for the id", async () => {
      const rows = await compositeFoodRepository.findByIdWithIngredients(MISSING_ID);
      expect(rows).toEqual([]);
    });

    it("returns one row per ingredient link with joined ingredient nutrition fields", async () => {
      const ingredient1 = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-a" }),
      );
      const ingredient2 = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-b" }),
      );

      const compositeFoodRow1 = await compositeFoodRepository.createWithIngredients({
        name: "composite-with-two",
        servingSize: 350,
        unit: "GRAM",
        ingredients: [
          { ingredientId: ingredient1.id, amount: 100 },
          { ingredientId: ingredient2.id, amount: 250 },
        ],
      });

      await compositeFoodRepository.createWithIngredients({
        name: "composite-with-two",
        servingSize: 350,
        unit: "GRAM",
        ingredients: [
          { ingredientId: ingredient1.id, amount: 100 },
          { ingredientId: ingredient2.id, amount: 250 },
        ],
      });

      const rows = await compositeFoodRepository.findByIdWithIngredients(
        compositeFoodRow1.id,
      );

      expect(rows).toHaveLength(2);
      expect(rows).toEqual(
        expect.arrayContaining([
          {
            id: compositeFoodRow1.id,
            name: compositeFoodRow1.name,
            cf_serving_size: 350,
            cf_unit: "GRAM",
            ingredient_id: ingredient1.id,
            ingredient_name: "ingredient-a",
            amount: 100,
            serving_size: 100,
            unit: "GRAM",
            calories: 102,
            protein: 1.1,
            carbs: 1.2,
            fats: 1.3,
          },
          {
            id: compositeFoodRow1.id,
            name: compositeFoodRow1.name,
            cf_serving_size: 350,
            cf_unit: "GRAM",
            ingredient_id: ingredient2.id,
            ingredient_name: "ingredient-b",
            amount: 250,
            serving_size: 100,
            unit: "GRAM",
            calories: 102,
            protein: 1.1,
            carbs: 1.2,
            fats: 1.3,
          },
        ]),
      );
    });
  });

  describe("findIngredientRows", () => {
    it("returns the join shape with ingredient macros, serving size, unit, and amount", async () => {
      const ingredient1 = await ingredientRepository.create(generateIngredientInput());

      const compositeFood = await compositeFoodRepository.createWithIngredients({
        name: "composite-food-1",
        servingSize: 200,
        unit: "GRAM",
        ingredients: [{ ingredientId: ingredient1.id, amount: 200 }],
      });

      const joinRows = await compositeFoodRepository.findIngredientRows(
        compositeFood.id,
      );

      expect(joinRows).toEqual([
        {
          ingredient_id: ingredient1.id,
          name: "ingredient-1",
          amount: 200,
          serving_size: 100,
          unit: "GRAM",
          calories: 102,
          protein: 1.1,
          carbs: 1.2,
          fats: 1.3,
        },
      ]);
    });

    it("returns an empty array for an unknown composite id", async () => {
      const joinRows = await compositeFoodRepository.findIngredientRows(MISSING_ID);
      expect(joinRows).toEqual([]);
    });
  });

  describe("update", () => {
    it("returns null when the composite food does not exist", async () => {
      const result = await compositeFoodRepository.update(MISSING_ID, {
        name: "nope",
      });
      expect(result).toBeNull();
    });

    it("updates the name without changing ingredients", async () => {
      const ingredient = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-rename" }),
      );
      const cf = await compositeFoodRepository.createWithIngredients({
        name: "before-rename",
        servingSize: 100,
        unit: "GRAM",
        ingredients: [{ ingredientId: ingredient.id, amount: 100 }],
      });

      const updated = await compositeFoodRepository.update(cf.id, {
        name: "after-rename",
        servingSize: 150,
        unit: "MILLILITER",
      });

      expect(updated).toEqual({
        id: cf.id,
        name: "after-rename",
        serving_size: 150,
        unit: "MILLILITER",
        created_at: cf.created_at,
        updated_at: expect.any(Date),
      });

      const ingredientRows = await compositeFoodRepository.findIngredientRows(cf.id);
      expect(ingredientRows).toHaveLength(1);
      expect(ingredientRows[0].ingredient_id).toBe(ingredient.id);
      expect(ingredientRows[0].amount).toBe(100);
    });

    it("replaces ingredients without changing the metadata", async () => {
      const ingredient1 = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-swap-1" }),
      );
      const ingredient2 = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-swap-2" }),
      );
      const cf = await compositeFoodRepository.createWithIngredients({
        name: "swap-test",
        servingSize: 100,
        unit: "GRAM",
        ingredients: [{ ingredientId: ingredient1.id, amount: 100 }],
      });

      const updated = await compositeFoodRepository.update(cf.id, {
        ingredients: [{ ingredientId: ingredient2.id, amount: 250 }],
      });

      expect(updated).toEqual({
        id: cf.id,
        name: "swap-test",
        serving_size: 100,
        unit: "GRAM",
        created_at: cf.created_at,
        updated_at: expect.any(Date),
      });

      const ingredientRows = await compositeFoodRepository.findIngredientRows(cf.id);
      expect(ingredientRows).toHaveLength(1);
      expect(ingredientRows[0].ingredient_id).toBe(ingredient2.id);
      expect(ingredientRows[0].amount).toBe(250);
    });

    it("updates metadata and ingredients together", async () => {
      const ingredient1 = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-both-1" }),
      );
      const ingredient2 = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-both-2" }),
      );
      const cf = await compositeFoodRepository.createWithIngredients({
        name: "both-before",
        servingSize: 50,
        unit: "GRAM",
        ingredients: [{ ingredientId: ingredient1.id, amount: 50 }],
      });

      const updated = await compositeFoodRepository.update(cf.id, {
        name: "both-after",
        ingredients: [
          { ingredientId: ingredient1.id, amount: 75 },
          { ingredientId: ingredient2.id, amount: 300 },
        ],
      });

      expect(updated).toEqual({
        id: cf.id,
        name: "both-after",
        serving_size: 50,
        unit: "GRAM",
        created_at: cf.created_at,
        updated_at: expect.any(Date),
      });

      const ingredientRows = await compositeFoodRepository.findIngredientRows(cf.id);
      const summaries = ingredientRows.map((r) => ({
        ingredient_id: r.ingredient_id,
        amount: r.amount,
      }));
      expect(summaries).toEqual(
        expect.arrayContaining([
          { ingredient_id: ingredient1.id, amount: 75 },
          { ingredient_id: ingredient2.id, amount: 300 },
        ]),
      );
    });

    it("can remove an ingredient by omitting it from the replacement list", async () => {
      const ingredient1 = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-remove-1" }),
      );
      const ingredient2 = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-remove-2" }),
      );
      const cf = await compositeFoodRepository.createWithIngredients({
        name: "remove-test",
        servingSize: 300,
        unit: "GRAM",
        ingredients: [
          { ingredientId: ingredient1.id, amount: 100 },
          { ingredientId: ingredient2.id, amount: 200 },
        ],
      });

      await compositeFoodRepository.update(cf.id, {
        ingredients: [{ ingredientId: ingredient1.id, amount: 100 }],
      });

      const ingredientRows = await compositeFoodRepository.findIngredientRows(cf.id);
      expect(ingredientRows).toHaveLength(1);
      expect(ingredientRows[0].ingredient_id).toBe(ingredient1.id);
    });

    it("can add an ingredient by including it in the replacement list", async () => {
      const ingredient1 = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-add-1" }),
      );
      const ingredient2 = await ingredientRepository.create(
        generateIngredientInput({ name: "ingredient-add-2" }),
      );
      const cf = await compositeFoodRepository.createWithIngredients({
        name: "add-test",
        servingSize: 100,
        unit: "GRAM",
        ingredients: [{ ingredientId: ingredient1.id, amount: 100 }],
      });

      await compositeFoodRepository.update(cf.id, {
        ingredients: [
          { ingredientId: ingredient1.id, amount: 100 },
          { ingredientId: ingredient2.id, amount: 150 },
        ],
      });

      const ingredientRows = await compositeFoodRepository.findIngredientRows(cf.id);
      expect(ingredientRows).toHaveLength(2);
    });
  });

  describe("delete", () => {
    it("returns true and removes the row when it exists", async () => {
      const compositeFood = await createTestCompositeFood("composite-food-delete");
      const deleted = await compositeFoodRepository.delete(compositeFood.id);

      expect(deleted).toBe(true);
      expect(await compositeFoodRepository.findById(compositeFood.id)).toBeNull();
    });

    it("returns false when the row does not exist", async () => {
      const deleted = await compositeFoodRepository.delete(MISSING_ID);
      expect(deleted).toBe(false);
    });
  });
});
