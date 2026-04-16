import { z } from "zod/v4";

export const createIngredientSchema = z.object({
  name: z.string().min(1),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fats: z.number().nonnegative(),
});

export const updateIngredientSchema = z.object({
  name: z.string().min(1).optional(),
  calories: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fats: z.number().nonnegative().optional(),
});

export const idParamSchema = z.object({
  id: z.uuid(),
});
