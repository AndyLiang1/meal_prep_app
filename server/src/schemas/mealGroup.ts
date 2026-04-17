import { z } from "zod/v4";

const mealGroupMealSchema = z.object({
  mealId: z.uuid(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const createMealGroupSchema = z.object({
  name: z.string().min(1),
  tag: z.string().min(1),
  displayAsDefault: z.boolean().optional(),
  meals: z.array(mealGroupMealSchema).min(1),
});

export const updateMealGroupSchema = z.object({
  name: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  displayAsDefault: z.boolean().optional(),
});

export const idParamSchema = z.object({
  id: z.uuid(),
});
