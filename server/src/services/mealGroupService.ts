import {
  mealGroupRepository,
  type CreateMealGroupData,
  type MealGroupRow,
  type UpdateMealGroupData,
} from "../repositories/mealGroup/mealGroupRepository.js";
import { mealRepository } from "../repositories/meal/mealRepository.js";

async function buildMealGroupResponse(group: MealGroupRow) {
  const joinRows = await mealGroupRepository.findMealsByMealGroupId(group.id);

  const meals = await Promise.all(
    joinRows.map(async (row) => {
      const meal = await mealRepository.findById(row.meal_id);
      const mealDetail = {
        mealGroupMealId: row.id,
        mealId: row.meal_id,
        name: meal?.name ?? "Unknown",
        sortOrder: row.sort_order,
      };
      return mealDetail;
    })
  );

  const response = {
    ...group,
    meals,
  };
  return response;
}

export const mealGroupService = {
  async create(input: CreateMealGroupData) {
    const uniqueMealIds = [...new Set(input.meals.map((m) => m.mealId))];
    const existingIds = await mealRepository.findExistingIds(uniqueMealIds);
    if (existingIds.length !== uniqueMealIds.length) {
      return { error: "One or more meals not found" };
    }

    if (input.displayAsDefault) {
      await mealGroupRepository.unsetDefaultsForTag(input.tag);
    }

    const mealGroup = await mealGroupRepository.createWithMeals(input);
    const response = await buildMealGroupResponse(mealGroup);
    return response;
  },

  async list() {
    const groups = await mealGroupRepository.findAll();
    const responses = await Promise.all(groups.map(buildMealGroupResponse));
    return responses;
  },

  async getById(id: string) {
    const group = await mealGroupRepository.findById(id);
    if (!group) return null;
    const response = await buildMealGroupResponse(group);
    return response;
  },

  async update(id: string, input: UpdateMealGroupData) {
    const existing = await mealGroupRepository.findById(id);
    if (!existing) return null;

    const finalTag = input.tag ?? existing.tag;
    const finalDefault =
      input.displayAsDefault ?? existing.display_as_default;

    if (finalDefault) {
      await mealGroupRepository.unsetDefaultsForTag(finalTag, id);
    }

    const updated = await mealGroupRepository.update(id, input);
    if (!updated) return null;
    const response = await buildMealGroupResponse(updated);
    return response;
  },

  async delete(id: string) {
    const deleted = await mealGroupRepository.delete(id);
    return deleted;
  },
};
