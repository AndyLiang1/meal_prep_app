import { z } from "zod/v4";

const mealFoodSchema = z
  .object({
    ingredientId: z.uuid().optional(),
    compositeFoodId: z.uuid().optional(),
    amount: z.number().positive(),
  })
  .refine(
    (data) => {
      const hasIngredient = data.ingredientId !== undefined;
      const hasComposite = data.compositeFoodId !== undefined;
      return (hasIngredient || hasComposite) && !(hasIngredient && hasComposite);
    },
    {
      message: "Each food must have exactly one of ingredientId or compositeFoodId",
    },
  );

export const createMealSchema = z.object({
  name: z.string().min(1),
  mealGroupId: z.uuid(),
});

export type CreateMealData = z.infer<typeof createMealSchema>;

export const updateMealSchema = z
  .object({
    name: z.string().min(1).optional(),
    foods: z.array(mealFoodSchema).min(1).optional(),
  })
  .refine((data) => data.name !== undefined || data.foods !== undefined, {
    message: "At least one of name or foods must be provided",
  });

export const idParamSchema = z.object({
  id: z.uuid(),
});

export const listMealsQuerySchema = z.object({
  mealGroupId: z.uuid(),
});

export const reorderMealsSchema = z.object({
  mealGroupId: z.uuid(),
  mealIds: z.array(z.uuid()).min(1),
});
