import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./testApp.js";

async function createIngredient(overrides = {}) {
  const res = await request(app)
    .post("/api/ingredients")
    .send({
      name: "Banana",
      calories: 105,
      protein: 1.3,
      carbs: 27,
      fats: 0.4,
      ...overrides,
    });
  return res.body;
}

async function createMeal(name: string) {
  const ingredient = await createIngredient({ name: `${name}-ingredient` });
  const res = await request(app)
    .post("/api/meals")
    .send({
      name,
      foods: [{ ingredientId: ingredient.id }],
    });
  return res.body;
}

describe("Meal Groups API", () => {
  describe("POST /api/meal-groups", () => {
    it("creates a meal group with meals and returns nested meal details", async () => {
      const mealFirst = await createMeal("Oatmeal");
      const mealSecond = await createMeal("Eggs");

      const res = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Breakfast Options",
          tag: "breakfast",
          meals: [
            { mealId: mealFirst.id, sortOrder: 0 },
            { mealId: mealSecond.id, sortOrder: 1 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Breakfast Options");
      expect(res.body.tag).toBe("breakfast");
      expect(res.body.display_as_default).toBe(false);
      expect(res.body.meals).toHaveLength(2);
      expect(res.body.meals[0]).toMatchObject({
        mealId: mealFirst.id,
        name: "Oatmeal",
        sortOrder: 0,
      });
      expect(res.body.meals[1]).toMatchObject({
        mealId: mealSecond.id,
        name: "Eggs",
        sortOrder: 1,
      });
    });

    it("rejects creation with a non-existent meal id", async () => {
      const res = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Bad",
          tag: "lunch",
          meals: [{ mealId: "00000000-0000-0000-0000-000000000000" }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/meals not found/i);
    });

    it("rejects creation when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/meal-groups")
        .send({ name: "Missing tag", meals: [] });

      expect(res.status).toBe(400);
    });

    it("unsets display_as_default on other groups with the same tag when creating a new default", async () => {
      const meal = await createMeal("Pancakes");

      const firstDefault = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Default A",
          tag: "breakfast",
          displayAsDefault: true,
          meals: [{ mealId: meal.id }],
        });
      expect(firstDefault.body.display_as_default).toBe(true);

      const secondDefault = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Default B",
          tag: "breakfast",
          displayAsDefault: true,
          meals: [{ mealId: meal.id }],
        });
      expect(secondDefault.body.display_as_default).toBe(true);

      const firstRefetched = await request(app).get(
        `/api/meal-groups/${firstDefault.body.id}`
      );
      expect(firstRefetched.body.display_as_default).toBe(false);
    });

    it("does not affect defaults in other tags", async () => {
      const meal = await createMeal("Food");

      const breakfastDefault = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Breakfast",
          tag: "breakfast",
          displayAsDefault: true,
          meals: [{ mealId: meal.id }],
        });

      await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Lunch",
          tag: "lunch",
          displayAsDefault: true,
          meals: [{ mealId: meal.id }],
        });

      const refetched = await request(app).get(
        `/api/meal-groups/${breakfastDefault.body.id}`
      );
      expect(refetched.body.display_as_default).toBe(true);
    });
  });

  describe("GET /api/meal-groups", () => {
    it("returns an empty list when none exist", async () => {
      const res = await request(app).get("/api/meal-groups");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns meal groups with nested meals", async () => {
      const meal = await createMeal("Salad");
      await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Lunch Options",
          tag: "lunch",
          meals: [{ mealId: meal.id }],
        });

      const res = await request(app).get("/api/meal-groups");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].meals).toHaveLength(1);
      expect(res.body[0].meals[0].name).toBe("Salad");
    });
  });

  describe("GET /api/meal-groups/:id", () => {
    it("returns the meal group when it exists", async () => {
      const meal = await createMeal("Soup");
      const created = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Dinner Ideas",
          tag: "dinner",
          meals: [{ mealId: meal.id }],
        });

      const res = await request(app).get(
        `/api/meal-groups/${created.body.id}`
      );

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Dinner Ideas");
      expect(res.body.meals[0].name).toBe("Soup");
    });

    it("returns 404 for a non-existent meal group", async () => {
      const res = await request(app).get(
        "/api/meal-groups/00000000-0000-0000-0000-000000000000"
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/meal-groups/:id", () => {
    it("updates name and tag", async () => {
      const meal = await createMeal("Tofu");
      const created = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Old Name",
          tag: "old-tag",
          meals: [{ mealId: meal.id }],
        });

      const res = await request(app)
        .patch(`/api/meal-groups/${created.body.id}`)
        .send({ name: "New Name", tag: "new-tag" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("New Name");
      expect(res.body.tag).toBe("new-tag");
    });

    it("unsets defaults on other groups in the same tag when setting display_as_default true via patch", async () => {
      const meal = await createMeal("Bowl");
      const firstDefault = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "First",
          tag: "dinner",
          displayAsDefault: true,
          meals: [{ mealId: meal.id }],
        });
      const second = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Second",
          tag: "dinner",
          meals: [{ mealId: meal.id }],
        });

      const patched = await request(app)
        .patch(`/api/meal-groups/${second.body.id}`)
        .send({ displayAsDefault: true });
      expect(patched.body.display_as_default).toBe(true);

      const firstRefetched = await request(app).get(
        `/api/meal-groups/${firstDefault.body.id}`
      );
      expect(firstRefetched.body.display_as_default).toBe(false);
    });

    it("returns 404 for a non-existent meal group", async () => {
      const res = await request(app)
        .patch("/api/meal-groups/00000000-0000-0000-0000-000000000000")
        .send({ name: "Ghost" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/meal-groups/:id", () => {
    it("deletes a meal group and its meal_group_meal entries", async () => {
      const meal = await createMeal("Stew");
      const created = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "To Delete",
          tag: "dinner",
          meals: [{ mealId: meal.id }],
        });

      const res = await request(app).delete(
        `/api/meal-groups/${created.body.id}`
      );
      expect(res.status).toBe(204);

      const list = await request(app).get("/api/meal-groups");
      expect(list.body).toHaveLength(0);
    });

    it("returns 404 for a non-existent meal group", async () => {
      const res = await request(app).delete(
        "/api/meal-groups/00000000-0000-0000-0000-000000000000"
      );
      expect(res.status).toBe(404);
    });
  });
});
