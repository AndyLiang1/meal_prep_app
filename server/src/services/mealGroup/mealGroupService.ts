import {
  mealGroupRepository,
  type MealGroupRow,
  type UpdateMealGroupData,
} from "../../repositories/mealGroup/mealGroupRepository.js";
import { mealRepository } from "../../repositories/meal/mealRepository.js";
import { toMeal } from "../meal/mealService.js";
import { getDb } from "../../db/database.js";
import type { TMeal, TMealGroup } from "../../types.js";

export interface CreateMealGroupInput {
  name: string;
  tags?: string[];
  displayAsDefault?: boolean;
}

function toMealGroup(mealGroupRow: MealGroupRow, meals: TMeal[]): TMealGroup {
  const mealGroup: TMealGroup = {
    id: mealGroupRow.id,
    name: mealGroupRow.name,
    tags: mealGroupRow.tags,
    displayAsDefault: mealGroupRow.display_as_default,
    createdAt: mealGroupRow.created_at,
    updatedAt: mealGroupRow.updated_at,
    meals,
  };
  return mealGroup;
}

async function buildMealGroup(mealGroupRow: MealGroupRow): Promise<TMealGroup> {
  const mealRows = await mealRepository.findByMealGroupId(mealGroupRow.id);
  const meals = mealRows.map((mealRow) => {
    const meal = toMeal(mealRow);
    return meal;
  });
  const mealGroup = toMealGroup(mealGroupRow, meals);
  return mealGroup;
}

export const mealGroupService = {
  async create(input: CreateMealGroupInput): Promise<TMealGroup> {
    const mealNames = ["Meal 1", "Meal 2", "Meal 3"];

    const mealGroupRow = await getDb()
      .transaction()
      .execute(async (transaction) => {
        const insertedMealGroup = await mealGroupRepository.create(
          {
            name: input.name,
            tags: input.tags,
            displayAsDefault: input.displayAsDefault,
          },
          transaction,
        );

        await Promise.all(
          mealNames.map((mealName, mealIndex) => {
            const createdMealPromise = mealRepository.create(
              {
                name: mealName,
                mealGroupId: insertedMealGroup.id,
                sortOrder: mealIndex,
              },
              transaction,
            );
            return createdMealPromise;
          }),
        );

        return insertedMealGroup;
      });

    const createdMealGroup = await buildMealGroup(mealGroupRow);
    return createdMealGroup;
  },

  async list(): Promise<TMealGroup[]> {
    const groupRows = await mealGroupRepository.findAll();
    const mealGroups = await Promise.all(groupRows.map(buildMealGroup));
    return mealGroups;
  },

  async getById(id: string): Promise<TMealGroup | null> {
    const groupRow = await mealGroupRepository.findById(id);
    if (!groupRow) return null;
    const mealGroup = await buildMealGroup(groupRow);
    return mealGroup;
  },

  async update(id: string, input: UpdateMealGroupData): Promise<TMealGroup | null> {
    const existing = await mealGroupRepository.findById(id);
    if (!existing) return null;

    const finalDefault = input.displayAsDefault ?? existing.display_as_default;

    if (finalDefault) {
      await mealGroupRepository.unsetAllDefaults(id);
    }

    const updatedRow = await mealGroupRepository.update(id, input);
    if (!updatedRow) return null;
    const updatedMealGroup = await buildMealGroup(updatedRow);
    return updatedMealGroup;
  },

  async delete(id: string): Promise<boolean> {
    const deleted = await mealGroupRepository.delete(id);
    return deleted;
  },
};
