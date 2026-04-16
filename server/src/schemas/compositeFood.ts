import { z } from "zod/v4";

export const createCompositeFoodSchema = z.object({
  name: z.string().min(1),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.uuid(),
        quantity: z.number().positive(),
      })
    )
    .min(1),
});

export const idParamSchema = z.object({
  id: z.uuid(),
});
