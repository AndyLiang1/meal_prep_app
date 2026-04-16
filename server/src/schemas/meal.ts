import { z } from "zod/v4";

const mealFoodSchema = z
  .object({
    ingredientId: z.uuid().optional(),
    compositeFoodId: z.uuid().optional(),
  })
  .refine(
    (data) => {
      const hasIngredient = data.ingredientId !== undefined;
      const hasComposite = data.compositeFoodId !== undefined;
      return (hasIngredient || hasComposite) && !(hasIngredient && hasComposite);
    },
    {
      message:
        "Each food must have exactly one of ingredientId or compositeFoodId",
    }
  );

export const createMealSchema = z.object({
  name: z.string().min(1),
  foods: z.array(mealFoodSchema).min(1),
});

export const updateMealSchema = z.object({
  name: z.string().min(1).optional(),
});

export const idParamSchema = z.object({
  id: z.uuid(),
});
