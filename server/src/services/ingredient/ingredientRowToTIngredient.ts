import { IngredientRow } from "../../repositories/ingredient/ingredientRepository.js";
import { TIngredient } from "../../types.js";

export function ingredientRowToTIngredient(row: IngredientRow): TIngredient {
  const ingredient: TIngredient = {
    id: row.id,
    name: row.name,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fats: row.fats,
    servingSize: row.serving_size,
    unit: row.unit,
  };

  return ingredient;
}
