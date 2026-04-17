import {
  ingredientRepository,
  type CreateIngredientData,
  type UpdateIngredientData,
} from "../repositories/ingredient/ingredientRepository.js";

export const ingredientService = {
  async create(input: CreateIngredientData) {
    const ingredient = await ingredientRepository.create(input);
    return ingredient;
  },

  async list() {
    const ingredients = await ingredientRepository.findAll();
    return ingredients;
  },

  async getById(id: string) {
    const ingredient = await ingredientRepository.findById(id);
    return ingredient;
  },

  async update(id: string, input: UpdateIngredientData) {
    const ingredient = await ingredientRepository.update(id, input);
    return ingredient;
  },

  async delete(id: string) {
    const deleted = await ingredientRepository.delete(id);
    return deleted;
  },
};
