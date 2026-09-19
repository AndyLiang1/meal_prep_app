import { z } from "zod/v4";
import { ingredientUnitSchema } from "./ingredient.js";

export const compositeFoodIngredientRefSchema = z.object({
  ingredientId: z.uuid(),
  amount: z.number().positive(),
});

export type CompositeFoodIngredientRef = z.infer<
  typeof compositeFoodIngredientRefSchema
>;

export const createCompositeFoodSchema = z.object({
  name: z.string().min(1),
  servingSize: z.number().positive(),
  unit: ingredientUnitSchema,
  ingredients: z.array(compositeFoodIngredientRefSchema).min(1),
});
export type CreateCompositeFoodInput = z.infer<typeof createCompositeFoodSchema>;

export const updateCompositeFoodSchema = z
  .object({
    name: z.string().min(1).optional(),
    servingSize: z.number().positive().optional(),
    unit: ingredientUnitSchema.optional(),
    ingredients: z.array(compositeFoodIngredientRefSchema).min(1).optional(),
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
export type UpdateCompositeFoodInput = z.infer<typeof updateCompositeFoodSchema>;

export const idParamSchema = z.object({
  id: z.uuid(),
});
