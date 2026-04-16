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

describe("Composite Foods API", () => {
  describe("POST /api/composite-foods", () => {
    it("should create a composite food from ingredients", async () => {
      const banana = await createIngredient();
      const milk = await createIngredient({
        name: "Milk",
        calories: 150,
        protein: 8,
        carbs: 12,
        fats: 8,
      });

      const res = await request(app)
        .post("/api/composite-foods")
        .send({
          name: "Protein Shake",
          ingredients: [
            { ingredientId: banana.id, quantity: 1 },
            { ingredientId: milk.id, quantity: 2 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Protein Shake");
      expect(res.body.id).toBeDefined();
      expect(res.body.ingredients).toHaveLength(2);
    });

    it("should reject when no ingredients are provided", async () => {
      const res = await request(app)
        .post("/api/composite-foods")
        .send({ name: "Empty Food", ingredients: [] });

      expect(res.status).toBe(400);
    });

    it("should reject when referencing a non-existent ingredient", async () => {
      const res = await request(app)
        .post("/api/composite-foods")
        .send({
          name: "Ghost Food",
          ingredients: [
            {
              ingredientId: "00000000-0000-0000-0000-000000000000",
              quantity: 1,
            },
          ],
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/composite-foods", () => {
    it("should return an empty list when none exist", async () => {
      const res = await request(app).get("/api/composite-foods");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return composite foods with derived macros", async () => {
      const banana = await createIngredient();
      const milk = await createIngredient({
        name: "Milk",
        calories: 150,
        protein: 8,
        carbs: 12,
        fats: 8,
      });

      await request(app)
        .post("/api/composite-foods")
        .send({
          name: "Protein Shake",
          ingredients: [
            { ingredientId: banana.id, quantity: 1 },
            { ingredientId: milk.id, quantity: 2 },
          ],
        });

      const res = await request(app).get("/api/composite-foods");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);

      const shake = res.body[0];
      expect(shake.name).toBe("Protein Shake");
      // 105 + (150*2) = 405
      expect(shake.calories).toBe(405);
      // 1.3 + (8*2) = 17.3
      expect(shake.protein).toBe(17.3);
      // 27 + (12*2) = 51
      expect(shake.carbs).toBe(51);
      // 0.4 + (8*2) = 16.4
      expect(shake.fats).toBe(16.4);
    });
  });

  describe("GET /api/composite-foods/:id", () => {
    it("should return a single composite food with ingredients and macros", async () => {
      const banana = await createIngredient();

      const created = await request(app)
        .post("/api/composite-foods")
        .send({
          name: "Banana Smoothie",
          ingredients: [{ ingredientId: banana.id, quantity: 3 }],
        });

      const res = await request(app).get(
        `/api/composite-foods/${created.body.id}`
      );

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Banana Smoothie");
      expect(res.body.calories).toBe(315);
      expect(res.body.protein).toBeCloseTo(3.9);
      expect(res.body.ingredients).toHaveLength(1);
      expect(res.body.ingredients[0].name).toBe("Banana");
      expect(res.body.ingredients[0].quantity).toBe(3);
    });

    it("should return 404 for non-existent composite food", async () => {
      const res = await request(app).get(
        "/api/composite-foods/00000000-0000-0000-0000-000000000000"
      );

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/composite-foods/:id", () => {
    it("should delete a composite food", async () => {
      const banana = await createIngredient();

      const created = await request(app)
        .post("/api/composite-foods")
        .send({
          name: "Banana Smoothie",
          ingredients: [{ ingredientId: banana.id, quantity: 1 }],
        });

      const res = await request(app).delete(
        `/api/composite-foods/${created.body.id}`
      );
      expect(res.status).toBe(204);

      const list = await request(app).get("/api/composite-foods");
      expect(list.body).toHaveLength(0);
    });

    it("should return 404 for non-existent composite food", async () => {
      const res = await request(app).delete(
        "/api/composite-foods/00000000-0000-0000-0000-000000000000"
      );
      expect(res.status).toBe(404);
    });
  });
});
