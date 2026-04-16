import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./testApp.js";

describe("Ingredients API", () => {
  const validIngredient = {
    name: "Banana",
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fats: 0.4,
  };

  describe("POST /api/ingredients", () => {
    it("should create an ingredient with valid data", async () => {
      const res = await request(app)
        .post("/api/ingredients")
        .send(validIngredient);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: "Banana",
        calories: 105,
        protein: 1.3,
        carbs: 27,
        fats: 0.4,
      });
      expect(res.body.id).toBeDefined();
      expect(res.body.created_at).toBeDefined();
    });

    it("should reject missing required fields", async () => {
      const res = await request(app)
        .post("/api/ingredients")
        .send({ name: "Banana" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });

    it("should reject negative macro values", async () => {
      const res = await request(app)
        .post("/api/ingredients")
        .send({ ...validIngredient, calories: -10 });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/ingredients", () => {
    it("should return an empty list when no ingredients exist", async () => {
      const res = await request(app).get("/api/ingredients");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return all created ingredients", async () => {
      await request(app).post("/api/ingredients").send(validIngredient);
      await request(app)
        .post("/api/ingredients")
        .send({ ...validIngredient, name: "Protein Powder" });

      const res = await request(app).get("/api/ingredients");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe("PATCH /api/ingredients/:id", () => {
    it("should update an ingredient's macros", async () => {
      const created = await request(app)
        .post("/api/ingredients")
        .send(validIngredient);

      const res = await request(app)
        .patch(`/api/ingredients/${created.body.id}`)
        .send({ calories: 110, protein: 1.5 });

      expect(res.status).toBe(200);
      expect(res.body.calories).toBe(110);
      expect(res.body.protein).toBe(1.5);
      expect(res.body.carbs).toBe(27);
    });

    it("should update an ingredient's name", async () => {
      const created = await request(app)
        .post("/api/ingredients")
        .send(validIngredient);

      const res = await request(app)
        .patch(`/api/ingredients/${created.body.id}`)
        .send({ name: "Ripe Banana" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Ripe Banana");
    });

    it("should return 404 for non-existent ingredient", async () => {
      const res = await request(app)
        .patch("/api/ingredients/00000000-0000-0000-0000-000000000000")
        .send({ name: "Ghost" });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/ingredients/:id", () => {
    it("should delete an ingredient", async () => {
      const created = await request(app)
        .post("/api/ingredients")
        .send(validIngredient);

      const res = await request(app).delete(
        `/api/ingredients/${created.body.id}`
      );
      expect(res.status).toBe(204);

      const list = await request(app).get("/api/ingredients");
      expect(list.body).toHaveLength(0);
    });

    it("should return 404 for non-existent ingredient", async () => {
      const res = await request(app).delete(
        "/api/ingredients/00000000-0000-0000-0000-000000000000"
      );
      expect(res.status).toBe(404);
    });
  });
});
