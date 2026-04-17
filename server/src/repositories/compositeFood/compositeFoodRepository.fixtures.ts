import { compositeFoodRepository } from "./compositeFoodRepository.js";
import type { CompositeFoodRow } from "./compositeFoodRepository.js";
import { ingredientRepository } from "../ingredient/ingredientRepository.js";
import { buildIngredientInput } from "../ingredient/ingredientRepository.fixtures.js";

export async function createTestCompositeFood(
  compositeFoodName = "composite-food-default",
  ingredientCount = 1
): Promise<CompositeFoodRow> {
  const ingredientRows = await Promise.all(
    Array.from({ length: ingredientCount }, (_, index) =>
      ingredientRepository.create(
        buildIngredientInput({
          name: `${compositeFoodName}-ingredient-${index}`,
        })
      )
    )
  );

  return await compositeFoodRepository.createWithIngredients({
    name: compositeFoodName,
    ingredients: ingredientRows.map((ingredientRow) => ({
      ingredientId: ingredientRow.id,
      quantity: 1,
    })),
  });
}
