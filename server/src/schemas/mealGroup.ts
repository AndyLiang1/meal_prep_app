import { z } from "zod/v4";

export const createMealGroupSchema = z.object({
  name: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  displayAsDefault: z.boolean().optional(),
});

export const updateMealGroupSchema = z.object({
  name: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).optional(),
  displayAsDefault: z.boolean().optional(),
});

export const idParamSchema = z.object({
  id: z.uuid(),
});
