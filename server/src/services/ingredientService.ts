import {
  ingredientRepository,
  type CreateIngredientData,
  type UpdateIngredientData,
} from "../repositories/ingredient/ingredientRepository.js";

export const ingredientService = {
  async create(input: CreateIngredientData) {
    return await ingredientRepository.create(input);
  },

  async list() {
    return await ingredientRepository.findAll();
  },

  async getById(id: string) {
    return await ingredientRepository.findById(id);
  },

  async update(id: string, input: UpdateIngredientData) {
    return await ingredientRepository.update(id, input);
  },

  async delete(id: string) {
    return await ingredientRepository.delete(id);
  },
};
