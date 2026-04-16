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

async function createCompositeFood(
  name: string,
  ingredients: { ingredientId: string; quantity: number }[]
) {
  const res = await request(app)
    .post("/api/composite-foods")
    .send({ name, ingredients });
  return res.body;
}

describe("Meals API", () => {
  describe("POST /api/meals", () => {
    it("should create a meal with ingredient foods", async () => {
      const egg = await createIngredient({
        name: "Egg",
        calories: 70,
        protein: 6,
        carbs: 0.5,
        fats: 5,
      });

      const res = await request(app)
        .post("/api/meals")
        .send({
          name: "Breakfast",
          foods: [{ ingredientId: egg.id }],
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Breakfast");
      expect(res.body.foods).toHaveLength(1);
    });

    it("should create a meal with composite food references", async () => {
      const banana = await createIngredient();
      const shake = await createCompositeFood("Protein Shake", [
        { ingredientId: banana.id, quantity: 2 },
      ]);

      const res = await request(app)
        .post("/api/meals")
        .send({
          name: "Post-Workout",
          foods: [{ compositeFoodId: shake.id }],
        });

      expect(res.status).toBe(201);
      expect(res.body.foods).toHaveLength(1);
    });

    it("should create a meal with both ingredient and composite foods", async () => {
      const waffle = await createIngredient({
        name: "Waffles",
        calories: 200,
        protein: 5,
        carbs: 30,
        fats: 8,
      });
      const banana = await createIngredient();
      const shake = await createCompositeFood("Protein Shake", [
        { ingredientId: banana.id, quantity: 1 },
      ]);

      const res = await request(app)
        .post("/api/meals")
        .send({
          name: "Breakfast",
          foods: [
            { ingredientId: waffle.id },
            { compositeFoodId: shake.id },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.foods).toHaveLength(2);
    });

    it("should reject a food with both ingredientId and compositeFoodId", async () => {
      const res = await request(app)
        .post("/api/meals")
        .send({
          name: "Bad Meal",
          foods: [
            {
              ingredientId: "00000000-0000-0000-0000-000000000000",
              compositeFoodId: "00000000-0000-0000-0000-000000000000",
            },
          ],
        });

      expect(res.status).toBe(400);
    });

    it("should reject a food with neither ingredientId nor compositeFoodId", async () => {
      const res = await request(app)
        .post("/api/meals")
        .send({
          name: "Empty Meal",
          foods: [{}],
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/meals", () => {
    it("should return an empty list when no meals exist", async () => {
      const res = await request(app).get("/api/meals");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return meals with derived macros", async () => {
      const egg = await createIngredient({
        name: "Egg",
        calories: 70,
        protein: 6,
        carbs: 0.5,
        fats: 5,
      });
      const waffle = await createIngredient({
        name: "Waffles",
        calories: 200,
        protein: 5,
        carbs: 30,
        fats: 8,
      });

      await request(app)
        .post("/api/meals")
        .send({
          name: "Breakfast",
          foods: [{ ingredientId: egg.id }, { ingredientId: waffle.id }],
        });

      const res = await request(app).get("/api/meals");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].calories).toBe(270);
      expect(res.body[0].protein).toBe(11);
    });
  });

  describe("PATCH /api/meals/:id", () => {
    it("should update a meal name", async () => {
      const egg = await createIngredient({
        name: "Egg",
        calories: 70,
        protein: 6,
        carbs: 0.5,
        fats: 5,
      });

      const created = await request(app)
        .post("/api/meals")
        .send({
          name: "Breakfast",
          foods: [{ ingredientId: egg.id }],
        });

      const res = await request(app)
        .patch(`/api/meals/${created.body.id}`)
        .send({ name: "Morning Meal" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Morning Meal");
    });

    it("should return 404 for non-existent meal", async () => {
      const res = await request(app)
        .patch("/api/meals/00000000-0000-0000-0000-000000000000")
        .send({ name: "Ghost" });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/meals/:id", () => {
    it("should delete a meal and its meal_food entries", async () => {
      const egg = await createIngredient({
        name: "Egg",
        calories: 70,
        protein: 6,
        carbs: 0.5,
        fats: 5,
      });

      const created = await request(app)
        .post("/api/meals")
        .send({
          name: "Breakfast",
          foods: [{ ingredientId: egg.id }],
        });

      const res = await request(app).delete(`/api/meals/${created.body.id}`);
      expect(res.status).toBe(204);

      const list = await request(app).get("/api/meals");
      expect(list.body).toHaveLength(0);
    });

    it("should return 404 for non-existent meal", async () => {
      const res = await request(app).delete(
        "/api/meals/00000000-0000-0000-0000-000000000000"
      );
      expect(res.status).toBe(404);
    });
  });
});
