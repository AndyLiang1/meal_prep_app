import { z } from "zod/v4";
import { ingredientUnitSchema } from "./ingredient.js";

export const createCompositeFoodSchema = z.object({
  name: z.string().min(1),
  servingSize: z.number().positive(),
  unit: ingredientUnitSchema,
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
    servingSize: z.number().positive().optional(),
    unit: ingredientUnitSchema.optional(),
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
  .refine(
    (data) =>
      data.name !== undefined ||
      data.servingSize !== undefined ||
      data.unit !== undefined ||
      data.ingredients !== undefined,
    {
      message: "At least one field must be provided",
    },
  );
export type UpdateCompositeFoodData = z.infer<typeof updateCompositeFoodSchema>;

export const idParamSchema = z.object({
  id: z.uuid(),
});
