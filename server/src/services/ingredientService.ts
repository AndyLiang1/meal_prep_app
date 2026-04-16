import { getDb } from "../db/database.js";

interface CreateIngredientInput {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

type UpdateIngredientInput = Partial<CreateIngredientInput>;

export const ingredientService = {
  async create(input: CreateIngredientInput) {
    return await getDb()
      .insertInto("ingredient")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async list() {
    return await getDb()
      .selectFrom("ingredient")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();
  },

  async getById(id: string) {
    const ingredient = await getDb()
      .selectFrom("ingredient")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return ingredient ?? null;
  },

  async update(id: string, input: UpdateIngredientInput) {
    const updated = await getDb()
      .updateTable("ingredient")
      .set({ ...input, updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    return updated ?? null;
  },

  async delete(id: string) {
    const result = await getDb()
      .deleteFrom("ingredient")
      .where("id", "=", id)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  },
};
