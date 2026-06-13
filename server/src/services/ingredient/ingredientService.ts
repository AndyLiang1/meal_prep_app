import { ingredientRepository } from "../../repositories/ingredient/ingredientRepository.js";
import {
  createIngredientSchema,
  updateIngredientSchema,
  type CreateIngredientData,
  type UpdateIngredientData,
} from "../../schemas/ingredient.js";
import { ingredientRowToTIngredient } from "./ingredientRowToTIngredient.js";

export const ingredientService = {
  async create(input: CreateIngredientData) {
    const validatedIngredient = createIngredientSchema.safeParse(input);
    if (!validatedIngredient.success) {
      throw new Error("Invalid ingredient data");
    }
    const ingredientRow = await ingredientRepository.create(validatedIngredient.data);
    const ingredient = ingredientRowToTIngredient(ingredientRow);
    return ingredient;
  },

  async list() {
    const rows = await ingredientRepository.findAll();
    const ingredients = rows.map((row) => ingredientRowToTIngredient(row));
    return ingredients;
  },

  // async getById(id: string) {
  //   const row = await ingredientRepository.findById(id);
  //   if (!row) return null;
  //   const ingredient = ingredientRowToTIngredient(row);
  //   return ingredient;
  // },

  async update(id: string, input: UpdateIngredientData) {
    const validatedInput = updateIngredientSchema.safeParse(input);
    if (!validatedInput.success) {
      throw new Error("Invalid ingredient data");
    }
    const row = await ingredientRepository.update(id, validatedInput.data);
    if (!row) return null;
    const ingredient = ingredientRowToTIngredient(row);
    return ingredient;
  },

  async delete(id: string) {
    const deleted = await ingredientRepository.delete(id);
    return deleted;
  },
};
