import { describe, it, expect, beforeEach, vi } from "vitest";
import { mealGroupService } from "./mealGroupService.js";
import { mealGroupRepository } from "../../repositories/mealGroup/mealGroupRepository.js";
import { mealRepository } from "../../repositories/meal/mealRepository.js";
import { getDb } from "../../db/database.js";
import {
  MOCK_MEAL_GROUP_ID_1,
  mockMealGroupRow1,
  mockMealGroupRow2,
  mockMealRow1,
  mockMealRow2,
  mockExpectedTMealGroup1,
} from "./mealGroupService.fixtures.js";

const mockTransaction = {} as any;

vi.mock("../../db/database.js", () => {
  return {
    getDb: vi.fn(),
  };
});

vi.mock("../../repositories/mealGroup/mealGroupRepository.js", () => {
  return {
    mealGroupRepository: {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      unsetAllDefaults: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock("../../repositories/meal/mealRepository.js", () => {
  return {
    mealRepository: {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      findByIds: vi.fn(),
      findByMealGroupId: vi.fn(),
      findExistingIds: vi.fn(),
      findFoodsByMealId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockedGetDb = vi.mocked(getDb, true);
const mockedMealGroupRepo = vi.mocked(mealGroupRepository, true);
const mockedMealRepo = vi.mocked(mealRepository, true);

describe("mealGroupService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetDb.mockReturnValue({
      transaction: () => ({
        execute: (callback: any) => callback(mockTransaction),
      }),
    } as any);
  });

  describe("create", () => {
    it("creates a meal group then 3 empty meals belonging to it atomically", async () => {
      const autoCreatedMeals = [
        {
          id: "auto-meal-1-id",
          name: "Meal 1",
          meal_group_id: MOCK_MEAL_GROUP_ID_1,
          sort_order: 0,
          created_at: new Date("2026-06-01T12:00:00.000Z"),
          updated_at: new Date("2026-06-01T12:00:00.000Z"),
        },
        {
          id: "auto-meal-2-id",
          name: "Meal 2",
          meal_group_id: MOCK_MEAL_GROUP_ID_1,
          sort_order: 1,
          created_at: new Date("2026-06-01T12:00:00.000Z"),
          updated_at: new Date("2026-06-01T12:00:00.000Z"),
        },
        {
          id: "auto-meal-3-id",
          name: "Meal 3",
          meal_group_id: MOCK_MEAL_GROUP_ID_1,
          sort_order: 2,
          created_at: new Date("2026-06-01T12:00:00.000Z"),
          updated_at: new Date("2026-06-01T12:00:00.000Z"),
        },
      ];

      mockedMealGroupRepo.create.mockResolvedValue(mockMealGroupRow1);
      mockedMealRepo.create
        .mockResolvedValueOnce(autoCreatedMeals[0]!)
        .mockResolvedValueOnce(autoCreatedMeals[1]!)
        .mockResolvedValueOnce(autoCreatedMeals[2]!);
      mockedMealRepo.findByMealGroupId.mockResolvedValue(autoCreatedMeals);

      const createdMealGroup = await mealGroupService.create({
        name: "Weekday Breakfast",
        tags: ["chicken"],
      });

      expect(mockedMealGroupRepo.create).toHaveBeenCalledWith(
        {
          name: "Weekday Breakfast",
          tags: ["chicken"],
          displayAsDefault: undefined,
        },
        mockTransaction,
      );
      expect(mockedMealRepo.create).toHaveBeenCalledTimes(3);
      expect(mockedMealRepo.create).toHaveBeenNthCalledWith(
        1,
        { name: "Meal 1", mealGroupId: MOCK_MEAL_GROUP_ID_1, sortOrder: 0 },
        mockTransaction,
      );
      expect(mockedMealRepo.create).toHaveBeenNthCalledWith(
        2,
        { name: "Meal 2", mealGroupId: MOCK_MEAL_GROUP_ID_1, sortOrder: 1 },
        mockTransaction,
      );
      expect(mockedMealRepo.create).toHaveBeenNthCalledWith(
        3,
        { name: "Meal 3", mealGroupId: MOCK_MEAL_GROUP_ID_1, sortOrder: 2 },
        mockTransaction,
      );
      expect(mockedMealRepo.findByMealGroupId).toHaveBeenCalledWith(
        MOCK_MEAL_GROUP_ID_1,
      );
      expect(createdMealGroup).toEqual({
        id: MOCK_MEAL_GROUP_ID_1,
        name: "Weekday Breakfast",
        tags: ["chicken"],
        displayAsDefault: false,
        createdAt: mockMealGroupRow1.created_at,
        updatedAt: mockMealGroupRow1.updated_at,
        meals: [
          {
            id: "auto-meal-1-id",
            name: "Meal 1",
            mealGroupId: MOCK_MEAL_GROUP_ID_1,
            sortOrder: 0,
            foods: [],
          },
          {
            id: "auto-meal-2-id",
            name: "Meal 2",
            mealGroupId: MOCK_MEAL_GROUP_ID_1,
            sortOrder: 1,
            foods: [],
          },
          {
            id: "auto-meal-3-id",
            name: "Meal 3",
            mealGroupId: MOCK_MEAL_GROUP_ID_1,
            sortOrder: 2,
            foods: [],
          },
        ],
      });
    });

    it("does not create orphan meals if group creation fails", async () => {
      mockedMealGroupRepo.create.mockRejectedValue(new Error("DB constraint error"));

      await expect(
        mealGroupService.create({ name: "Fail", tags: ["chicken"] }),
      ).rejects.toThrow("DB constraint error");

      expect(mockedMealGroupRepo.create).toHaveBeenCalled();
      expect(mockedMealRepo.create).not.toHaveBeenCalled();
    });

    it("passes displayAsDefault through to the group creation", async () => {
      const autoCreatedMeals = [
        {
          id: "auto-meal-1-id",
          name: "Meal 1",
          meal_group_id: "meal-group-2-id",
          sort_order: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      mockedMealGroupRepo.create.mockResolvedValue(mockMealGroupRow2);
      mockedMealRepo.create.mockResolvedValue(autoCreatedMeals[0]!);
      mockedMealRepo.findByMealGroupId.mockResolvedValue(autoCreatedMeals);

      await mealGroupService.create({
        name: "Default Group",
        tags: ["chicken"],
        displayAsDefault: true,
      });

      expect(mockedMealGroupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Default Group",
          tags: ["chicken"],
          displayAsDefault: true,
        }),
        mockTransaction,
      );
    });
  });

  describe("list", () => {
    it("returns an empty array when no meal groups exist", async () => {
      mockedMealGroupRepo.findAll.mockResolvedValue([]);

      const listedMealGroups = await mealGroupService.list();

      expect(listedMealGroups).toEqual([]);
    });

    it("returns each meal group with its expanded meals", async () => {
      mockedMealGroupRepo.findAll.mockResolvedValue([mockMealGroupRow1]);
      mockedMealRepo.findByMealGroupId.mockResolvedValue([mockMealRow1, mockMealRow2]);

      const listedMealGroups = await mealGroupService.list();

      expect(listedMealGroups).toEqual([mockExpectedTMealGroup1]);
    });
  });

  describe("getById", () => {
    it("returns null when the meal group does not exist", async () => {
      mockedMealGroupRepo.findById.mockResolvedValue(null);

      const missingMealGroup = await mealGroupService.getById("non-existent-id");

      expect(missingMealGroup).toBeNull();
    });

    it("returns the meal group with its expanded meals", async () => {
      mockedMealGroupRepo.findById.mockResolvedValue(mockMealGroupRow1);
      mockedMealRepo.findByMealGroupId.mockResolvedValue([mockMealRow1, mockMealRow2]);

      const fetchedMealGroup = await mealGroupService.getById(MOCK_MEAL_GROUP_ID_1);

      expect(fetchedMealGroup).toEqual(mockExpectedTMealGroup1);
    });
  });

  describe("update", () => {
    it.todo("returns null when the meal group does not exist");
    it.todo("does NOT call unsetAllDefaults when effective displayAsDefault is false");
    it.todo("calls unsetAllDefaults when effective displayAsDefault is true");
    it.todo(
      "passes the current id to unsetAllDefaults so the group itself isn't unset",
    );
    it.todo("returns null when repo.update returns null");
    it.todo("returns the updated meal group with meals expanded on success");
  });

  describe("delete", () => {
    it.todo("returns true when the repository deletes the row");
    it.todo("returns false when the repository did not delete");
  });
});
