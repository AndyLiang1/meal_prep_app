import { describe, it, expect } from "vitest";
import { mealGroupRepository } from "./mealGroupRepository.js";
import {
  MISSING_ID,
  UUID_REGEX,
} from "../ingredient/ingredientRepository.fixtures.js";
import { createTestMeal } from "../meal/mealRepository.fixtures.js";
import { createTestMealGroup } from "./mealGroupRepository.fixtures.js";

describe("mealGroupRepository", () => {
  describe("createWithMeals", () => {
    it("creates a meal group with no meals and returns the persisted shape", async () => {
      const mealGroup = await mealGroupRepository.createWithMeals({
        name: "meal-group-empty",
        tag: "breakfast",
        meals: [],
      });

      expect(mealGroup).toEqual({
        id: expect.stringMatching(UUID_REGEX),
        name: "meal-group-empty",
        tag: "breakfast",
        display_as_default: false,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
      expect(
        await mealGroupRepository.findMealsByMealGroupId(mealGroup.id)
      ).toEqual([]);
    });

    it("creates a meal group with multiple meals and explicit sort_order", async () => {
      const mealFirst = await createTestMeal("meal-1");
      const mealSecond = await createTestMeal("meal-2");

      const mealGroup = await mealGroupRepository.createWithMeals({
        name: "meal-group-pair",
        tag: "lunch",
        meals: [
          { mealId: mealFirst.id, sortOrder: 0 },
          { mealId: mealSecond.id, sortOrder: 1 },
        ],
      });

      const mealGroupMeals = await mealGroupRepository.findMealsByMealGroupId(
        mealGroup.id
      );
      expect(mealGroupMeals).toHaveLength(2);
      expect(mealGroupMeals.map((row) => row.meal_id)).toEqual([
        mealFirst.id,
        mealSecond.id,
      ]);
      expect(mealGroupMeals.map((row) => row.sort_order)).toEqual([0, 1]);
      expect(
        mealGroupMeals.every((row) => row.meal_group_id === mealGroup.id)
      ).toBe(true);
    });

    it("persists display_as_default=true when requested", async () => {
      const mealGroup = await mealGroupRepository.createWithMeals({
        name: "meal-group-default",
        tag: "breakfast",
        displayAsDefault: true,
        meals: [],
      });
      expect(mealGroup.display_as_default).toBe(true);
    });

    it("defaults sort_order to the array index when not provided", async () => {
      const mealA = await createTestMeal("meal-a");
      const mealB = await createTestMeal("meal-b");

      const mealGroup = await mealGroupRepository.createWithMeals({
        name: "meal-group-auto-sort",
        tag: "dinner",
        meals: [{ mealId: mealA.id }, { mealId: mealB.id }],
      });

      const rows = await mealGroupRepository.findMealsByMealGroupId(
        mealGroup.id
      );
      expect(rows.map((row) => row.sort_order)).toEqual([0, 1]);
    });

    it("rolls back the meal_group insert when a meal FK is invalid", async () => {
      await expect(
        mealGroupRepository.createWithMeals({
          name: "meal-group-bad-fk",
          tag: "breakfast",
          meals: [{ mealId: MISSING_ID }],
        })
      ).rejects.toThrow();

      expect(await mealGroupRepository.findAll()).toEqual([]);
    });
  });

  describe("findAll", () => {
    it("returns an empty array when none exist", async () => {
      expect(await mealGroupRepository.findAll()).toEqual([]);
    });

    it("returns meal groups sorted by created_at asc (oldest first)", async () => {
      const older = await createTestMealGroup("meal-group-sort-1");
      const newer = await createTestMealGroup("meal-group-sort-2");

      const rows = await mealGroupRepository.findAll();
      expect(rows.map((row) => row.id)).toEqual([older.id, newer.id]);
    });
  });

  describe("findById", () => {
    it("returns the row when it exists", async () => {
      const mealGroup = await createTestMealGroup("meal-group-lookup");
      const found = await mealGroupRepository.findById(mealGroup.id);
      expect(found).toEqual(mealGroup);
    });

    it("returns null when not found", async () => {
      expect(await mealGroupRepository.findById(MISSING_ID)).toBeNull();
    });
  });

  describe("findMealsByMealGroupId", () => {
    it("returns meal_group_meal rows ordered by sort_order asc", async () => {
      const meal1 = await createTestMeal("meal-order-1");
      const meal2 = await createTestMeal("meal-order-2");
      const meal3 = await createTestMeal("meal-order-3");

      const mealGroup = await mealGroupRepository.createWithMeals({
        name: "meal-group-order",
        tag: "breakfast",
        meals: [
          { mealId: meal1.id, sortOrder: 2 },
          { mealId: meal2.id, sortOrder: 0 },
          { mealId: meal3.id, sortOrder: 1 },
        ],
      });

      const rows = await mealGroupRepository.findMealsByMealGroupId(
        mealGroup.id
      );
      expect(rows.map((row) => row.meal_id)).toEqual([
        meal2.id,
        meal3.id,
        meal1.id,
      ]);
    });

    it("returns an empty array for an unknown meal group id", async () => {
      expect(
        await mealGroupRepository.findMealsByMealGroupId(MISSING_ID)
      ).toEqual([]);
    });
  });

  describe("unsetDefaultsForTag", () => {
    it("clears display_as_default for all rows with the given tag", async () => {
      const meal = await createTestMeal("meal-unset");
      const breakfastA = await mealGroupRepository.createWithMeals({
        name: "bf-a",
        tag: "breakfast",
        displayAsDefault: true,
        meals: [{ mealId: meal.id }],
      });
      const breakfastB = await mealGroupRepository.createWithMeals({
        name: "bf-b",
        tag: "breakfast",
        displayAsDefault: true,
        meals: [{ mealId: meal.id }],
      });
      const lunch = await mealGroupRepository.createWithMeals({
        name: "lnc",
        tag: "lunch",
        displayAsDefault: true,
        meals: [{ mealId: meal.id }],
      });

      await mealGroupRepository.unsetDefaultsForTag("breakfast");

      expect(
        (await mealGroupRepository.findById(breakfastA.id))!.display_as_default
      ).toBe(false);
      expect(
        (await mealGroupRepository.findById(breakfastB.id))!.display_as_default
      ).toBe(false);
      expect(
        (await mealGroupRepository.findById(lunch.id))!.display_as_default
      ).toBe(true);
    });

    it("skips the row identified by exceptId", async () => {
      const meal = await createTestMeal("meal-unset-except");
      const keep = await mealGroupRepository.createWithMeals({
        name: "keep",
        tag: "breakfast",
        displayAsDefault: true,
        meals: [{ mealId: meal.id }],
      });
      const other = await mealGroupRepository.createWithMeals({
        name: "other",
        tag: "breakfast",
        displayAsDefault: true,
        meals: [{ mealId: meal.id }],
      });

      await mealGroupRepository.unsetDefaultsForTag("breakfast", keep.id);

      expect(
        (await mealGroupRepository.findById(keep.id))!.display_as_default
      ).toBe(true);
      expect(
        (await mealGroupRepository.findById(other.id))!.display_as_default
      ).toBe(false);
    });
  });

  describe("update", () => {
    it("patches fields and bumps updated_at", async () => {
      const beforeUpdate = await createTestMealGroup("meal-group-before");

      const updated = await mealGroupRepository.update(beforeUpdate.id, {
        name: "meal-group-after",
        tag: "dinner",
        displayAsDefault: true,
      });

      expect(updated).toEqual({
        ...beforeUpdate,
        name: "meal-group-after",
        tag: "dinner",
        display_as_default: true,
        updated_at: expect.any(Date),
      });
      expect(updated!.updated_at.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.updated_at.getTime()
      );
    });

    it("returns null when the row does not exist", async () => {
      const result = await mealGroupRepository.update(MISSING_ID, {
        name: "meal-group-ghost",
      });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("returns true and cascades meal_group_meal when the row exists", async () => {
      const mealGroup = await createTestMealGroup("meal-group-delete", 2);
      expect(
        await mealGroupRepository.findMealsByMealGroupId(mealGroup.id)
      ).toHaveLength(2);

      const deleted = await mealGroupRepository.delete(mealGroup.id);
      expect(deleted).toBe(true);
      expect(await mealGroupRepository.findById(mealGroup.id)).toBeNull();
      expect(
        await mealGroupRepository.findMealsByMealGroupId(mealGroup.id)
      ).toEqual([]);
    });

    it("returns false when the row does not exist", async () => {
      expect(await mealGroupRepository.delete(MISSING_ID)).toBe(false);
    });
  });
});
