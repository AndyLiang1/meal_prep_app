import { z } from "zod/v4";

export const createCompositeFoodSchema = z.object({
  name: z.string().min(1),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.uuid(),
        amount: z.number().positive(),
      }),
    )
    .min(1),
});
export type CreateCompositeFoodData = z.infer<typeof createCompositeFoodSchema>;

export const updateCompositeFoodSchema = z
  .object({
    name: z.string().min(1).optional(),
    ingredients: z
      .array(
        z.object({
          ingredientId: z.uuid(),
          amount: z.number().positive(),
        }),
      )
      .min(1)
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.ingredients !== undefined, {
    message: "At least one of 'name' or 'ingredients' must be provided",
  });
export type UpdateCompositeFoodData = z.infer<typeof updateCompositeFoodSchema>;

export const idParamSchema = z.object({
  id: z.uuid(),
});
