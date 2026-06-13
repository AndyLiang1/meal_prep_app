import { z } from "zod/v4";
import type { IngredientUnit } from "../db/types.js";

// Single source of truth for food units in the app.
//
// The DB has the `ingredient_unit` Postgres enum, which kysely-codegen emits
// as `IngredientUnit` in `db/types.ts`. That file is generated — don't import
// it elsewhere. Instead, this file defines the values + zod schema + TS type
// used everywhere in the app (`TIngredientUnit`), and the `satisfies` check
// below forces a compile-time error if this list ever drifts from the DB.
const INGREDIENT_UNITS = [
  "GRAM",
  "MILLILITER",
  "PIECE",
] as const satisfies readonly IngredientUnit[];

export const ingredientUnitSchema = z.enum(INGREDIENT_UNITS);
export type TIngredientUnit = z.infer<typeof ingredientUnitSchema>;

export const createIngredientSchema = z.object({
  name: z.string().min(1),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fats: z.number().nonnegative(),
  servingSize: z.number().positive(),
  unit: ingredientUnitSchema,
});
export type CreateIngredientData = z.infer<typeof createIngredientSchema>;

export const updateIngredientSchema = z
  .object({
    name: z.string().min(1).optional(),
    calories: z.number().nonnegative().optional(),
    protein: z.number().nonnegative().optional(),
    carbs: z.number().nonnegative().optional(),
    fats: z.number().nonnegative().optional(),
    servingSize: z.number().positive().optional(),
    unit: ingredientUnitSchema.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });
export type UpdateIngredientData = z.infer<typeof updateIngredientSchema>;

export const idParamSchema = z.object({
  id: z.uuid(),
});
