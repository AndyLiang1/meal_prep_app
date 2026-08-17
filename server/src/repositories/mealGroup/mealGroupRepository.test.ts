import { describe, it, expect } from "vitest";
import { mealGroupRepository } from "./mealGroupRepository.js";
import type { CreateMealGroupData, MealGroupRow } from "./mealGroupRepository.js";
import { MISSING_ID, UUID_REGEX } from "../../constants.js";
import { createTestMealGroup } from "./mealGroupRepository.fixtures.js";
import { getDb } from "../../db/database.js";

async function createMealGroup(
  createMealGroupData: CreateMealGroupData,
): Promise<MealGroupRow> {
  const mealGroup = await getDb()
    .transaction()
    .execute((transaction) =>
      mealGroupRepository.create(createMealGroupData, transaction),
    );
  return mealGroup;
}

describe("mealGroupRepository", () => {
  describe("create", () => {
    it("creates a meal group with defaults and returns the persisted shape", async () => {
      const mealGroup = await createMealGroup({
        name: "meal-group-empty",
      });

      expect(mealGroup).toEqual({
        id: expect.stringMatching(UUID_REGEX),
        name: "meal-group-empty",
        tags: [],
        display_as_default: false,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it("creates a meal group with tags and displayAsDefault", async () => {
      const mealGroup = await createMealGroup({
        name: "meal-group-full",
        tags: ["chicken", "high-protein"],
        displayAsDefault: true,
      });

      expect(mealGroup).toEqual({
        id: expect.stringMatching(UUID_REGEX),
        name: "meal-group-full",
        tags: ["chicken", "high-protein"],
        display_as_default: true,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it("unsets the previous default when creating a new default group", async () => {
      const previousDefault = await createMealGroup({
        name: "previous-default",
        displayAsDefault: true,
      });
      expect(previousDefault.display_as_default).toBe(true);

      const newDefault = await createMealGroup({
        name: "new-default",
        displayAsDefault: true,
      });
      expect(newDefault.display_as_default).toBe(true);

      const previousRefetched = await mealGroupRepository.findById(previousDefault.id);
      expect(previousRefetched!.display_as_default).toBe(false);
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

  describe("unsetAllDefaults", () => {
    it("clears display_as_default on all default groups", async () => {
      const groupA = await createMealGroup({
        name: "group-a",
        tags: ["chicken"],
        displayAsDefault: true,
      });
      const groupB = await createMealGroup({
        name: "group-b",
        tags: ["lunch"],
      });
      await mealGroupRepository.update(groupB.id, { displayAsDefault: true });

      await mealGroupRepository.unsetAllDefaults();

      expect((await mealGroupRepository.findById(groupA.id))!.display_as_default).toBe(
        false,
      );
      expect((await mealGroupRepository.findById(groupB.id))!.display_as_default).toBe(
        false,
      );
    });

    it("skips the row identified by exceptId", async () => {
      const keepGroup = await createMealGroup({
        name: "keep",
        tags: ["chicken"],
        displayAsDefault: true,
      });
      const otherGroup = await createMealGroup({
        name: "other",
        tags: ["lunch"],
      });
      await mealGroupRepository.update(otherGroup.id, { displayAsDefault: true });

      await mealGroupRepository.unsetAllDefaults(keepGroup.id);

      expect(
        (await mealGroupRepository.findById(keepGroup.id))!.display_as_default,
      ).toBe(true);
      expect(
        (await mealGroupRepository.findById(otherGroup.id))!.display_as_default,
      ).toBe(false);
    });
  });

  describe("update", () => {
    it("patches fields and bumps updated_at", async () => {
      const beforeUpdate = await createTestMealGroup("meal-group-before");

      const updated = await mealGroupRepository.update(beforeUpdate.id, {
        name: "meal-group-after",
        tags: ["dinner"],
        displayAsDefault: true,
      });

      expect(updated).toEqual({
        ...beforeUpdate,
        name: "meal-group-after",
        tags: ["dinner"],
        display_as_default: true,
        updated_at: expect.any(Date),
      });
      expect(updated!.updated_at.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.updated_at.getTime(),
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
    it("returns true when the row exists", async () => {
      const mealGroup = await createTestMealGroup("meal-group-delete");

      const deleted = await mealGroupRepository.delete(mealGroup.id);
      expect(deleted).toBe(true);
      expect(await mealGroupRepository.findById(mealGroup.id)).toBeNull();
    });

    it("returns false when the row does not exist", async () => {
      expect(await mealGroupRepository.delete(MISSING_ID)).toBe(false);
    });
  });
});
