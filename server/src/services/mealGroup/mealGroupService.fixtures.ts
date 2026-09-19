import type { MealGroupRow } from "../../repositories/mealGroup/mealGroupRepository.js";
import type { MealRow } from "../../repositories/meal/mealRepository.js";
import type { TMeal, TMealGroup } from "../../types.js";

export const MOCK_MEAL_GROUP_ID_1 = "meal-group-1-id";
export const MOCK_MEAL_GROUP_ID_2 = "meal-group-2-id";
export const MOCK_MEAL_ID_1 = "meal-1-id";
export const MOCK_MEAL_ID_2 = "meal-2-id";

export const mockMealGroupRow1: MealGroupRow = {
  id: MOCK_MEAL_GROUP_ID_1,
  name: "Weekday Breakfast",
  tags: ["chicken"],
  display_as_default: false,
  created_at: new Date("2026-06-01T12:00:00.000Z"),
  updated_at: new Date("2026-06-01T12:00:00.000Z"),
};

export const mockMealGroupRow2: MealGroupRow = {
  id: MOCK_MEAL_GROUP_ID_2,
  name: "Weekend Breakfast",
  tags: ["chicken"],
  display_as_default: true,
  created_at: new Date("2026-06-02T12:00:00.000Z"),
  updated_at: new Date("2026-06-02T12:00:00.000Z"),
};

export const mockMealRow1: MealRow = {
  id: MOCK_MEAL_ID_1,
  name: "Oatmeal Bowl",
  meal_group_id: MOCK_MEAL_GROUP_ID_1,
  sort_order: 0,
  created_at: new Date("2026-06-01T10:00:00.000Z"),
  updated_at: new Date("2026-06-01T10:00:00.000Z"),
};

export const mockMealRow2: MealRow = {
  id: MOCK_MEAL_ID_2,
  name: "Egg Scramble",
  meal_group_id: MOCK_MEAL_GROUP_ID_1,
  sort_order: 1,
  created_at: new Date("2026-06-01T11:00:00.000Z"),
  updated_at: new Date("2026-06-01T11:00:00.000Z"),
};

export const mockExpectedTMeal1: TMeal = {
  id: MOCK_MEAL_ID_1,
  name: "Oatmeal Bowl",
  mealGroupId: MOCK_MEAL_GROUP_ID_1,
  sortOrder: 0,
  foods: [],
};

export const mockExpectedTMeal2: TMeal = {
  id: MOCK_MEAL_ID_2,
  name: "Egg Scramble",
  mealGroupId: MOCK_MEAL_GROUP_ID_1,
  sortOrder: 1,
  foods: [],
};

export const mockExpectedTMealGroup1: TMealGroup = {
  id: MOCK_MEAL_GROUP_ID_1,
  name: "Weekday Breakfast",
  tags: ["chicken"],
  displayAsDefault: false,
  createdAt: new Date("2026-06-01T12:00:00.000Z"),
  updatedAt: new Date("2026-06-01T12:00:00.000Z"),
  meals: [mockExpectedTMeal1, mockExpectedTMeal2],
};
