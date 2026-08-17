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
      servingSize: 100,
      unit: "GRAM",
      ...overrides,
    });
  return res.body;
}

async function createCompositeFood(
  name: string,
  ingredients: { ingredientId: string; amount: number }[],
) {
  const res = await request(app)
    .post("/api/composite-foods")
    .send({ name, servingSize: 100, unit: "GRAM", ingredients });
  return res.body;
}

async function createMealGroup(name = "Test Group") {
  const res = await request(app).post("/api/meal-groups").send({ name });
  return res.body;
}

describe("Meals API", () => {
  describe("POST /api/meals", () => {
    it("should create an empty meal belonging to a meal group", async () => {
      const mealGroup = await createMealGroup();

      const res = await request(app).post("/api/meals").send({
        name: "Snack",
        mealGroupId: mealGroup.id,
      });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Snack");
      expect(res.body.foods).toEqual([]);
    });

    it("should reject creation when mealGroupId is missing", async () => {
      const res = await request(app).post("/api/meals").send({ name: "Snack" });

      expect(res.status).toBe(400);
    });

    it("should reject creation when the meal group does not exist", async () => {
      const res = await request(app).post("/api/meals").send({
        name: "Snack",
        mealGroupId: "00000000-0000-0000-0000-000000000000",
      });

      expect(res.status).toBe(500);
    });
  });

  describe("GET /api/meals", () => {
    it("should return an empty list when the group has no meals", async () => {
      const mealGroup = await createMealGroup();

      await request(app).delete(`/api/meals/${mealGroup.meals[0].id}`);
      await request(app).delete(`/api/meals/${mealGroup.meals[1].id}`);
      await request(app).delete(`/api/meals/${mealGroup.meals[2].id}`);

      const res = await request(app)
        .get("/api/meals")
        .query({ mealGroupId: mealGroup.id });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return meals with hydrated food objects", async () => {
      const mealGroup = await createMealGroup();
      const mealId = mealGroup.meals[0].id;

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
        .patch(`/api/meals/${mealId}`)
        .send({
          foods: [
            { ingredientId: egg.id, amount: 100 },
            { ingredientId: waffle.id, amount: 100 },
          ],
        });

      const res = await request(app)
        .get("/api/meals")
        .query({ mealGroupId: mealGroup.id });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);

      const breakfastMeal = res.body.find((meal: { id: string }) => meal.id === mealId);
      expect(breakfastMeal.foods).toHaveLength(2);

      const foodNames = breakfastMeal.foods
        .map((food: { name: string }) => food.name)
        .sort();
      expect(foodNames).toEqual(["Egg", "Waffles"]);

      const eggFood = breakfastMeal.foods.find(
        (food: { name: string }) => food.name === "Egg",
      );
      const waffleFood = breakfastMeal.foods.find(
        (food: { name: string }) => food.name === "Waffles",
      );
      expect(eggFood.calories).toBe(70);
      expect(waffleFood.calories).toBe(200);
    });
  });

  describe("PATCH /api/meals/:id", () => {
    it("should update a meal name", async () => {
      const mealGroup = await createMealGroup();
      const mealId = mealGroup.meals[0].id;

      const res = await request(app)
        .patch(`/api/meals/${mealId}`)
        .send({ name: "Morning Meal" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Morning Meal");
    });

    it("should replace a meal's foods and name", async () => {
      const mealGroup = await createMealGroup();
      const mealId = mealGroup.meals[0].id;

      const originalIngredient = await createIngredient({ name: "Egg" });
      const replacementIngredient = await createIngredient({ name: "Waffle" });
      const originalCompositeFood = await createCompositeFood("Original Shake", [
        { ingredientId: originalIngredient.id, amount: 100 },
      ]);
      const replacementCompositeFood = await createCompositeFood("Replacement Shake", [
        { ingredientId: replacementIngredient.id, amount: 100 },
      ]);

      await request(app)
        .patch(`/api/meals/${mealId}`)
        .send({
          foods: [
            { ingredientId: originalIngredient.id, amount: 100 },
            { compositeFoodId: originalCompositeFood.id, amount: 300 },
          ],
        });

      const updateResponse = await request(app)
        .patch(`/api/meals/${mealId}`)
        .send({
          name: "Renamed Meal",
          foods: [
            { ingredientId: replacementIngredient.id, amount: 250 },
            { compositeFoodId: replacementCompositeFood.id, amount: 75 },
          ],
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toEqual({
        id: mealId,
        name: "Renamed Meal",
        mealGroupId: mealGroup.id,
        sortOrder: 0,
        foods: [
          expect.objectContaining({
            id: replacementIngredient.id,
            name: "Waffle",
            amount: 250,
          }),
          expect.objectContaining({
            id: replacementCompositeFood.id,
            name: "Replacement Shake",
            amount: 75,
          }),
        ],
      });

      const listResponse = await request(app)
        .get("/api/meals")
        .query({ mealGroupId: mealGroup.id });
      const persistedMeal = listResponse.body.find(
        (meal: { id: string }) => meal.id === mealId,
      );

      expect(persistedMeal).toEqual(updateResponse.body);
    });

    it("should reject a food with both ingredientId and compositeFoodId", async () => {
      const mealGroup = await createMealGroup();
      const mealId = mealGroup.meals[0].id;

      const res = await request(app)
        .patch(`/api/meals/${mealId}`)
        .send({
          foods: [
            {
              ingredientId: "00000000-0000-0000-0000-000000000000",
              compositeFoodId: "00000000-0000-0000-0000-000000000000",
              amount: 100,
            },
          ],
        });

      expect(res.status).toBe(400);
    });

    it("should reject a food with neither ingredientId nor compositeFoodId", async () => {
      const mealGroup = await createMealGroup();
      const mealId = mealGroup.meals[0].id;

      const res = await request(app)
        .patch(`/api/meals/${mealId}`)
        .send({
          foods: [{}],
        });

      expect(res.status).toBe(400);
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
      const mealGroup = await createMealGroup();
      const mealId = mealGroup.meals[0].id;

      const egg = await createIngredient({
        name: "Egg",
        calories: 70,
        protein: 6,
        carbs: 0.5,
        fats: 5,
      });

      await request(app)
        .patch(`/api/meals/${mealId}`)
        .send({
          foods: [{ ingredientId: egg.id, amount: 100 }],
        });

      const res = await request(app).delete(`/api/meals/${mealId}`);
      expect(res.status).toBe(204);

      const list = await request(app)
        .get("/api/meals")
        .query({ mealGroupId: mealGroup.id });
      expect(list.body).toHaveLength(2);
    });

    it("should return 404 for non-existent meal", async () => {
      const res = await request(app).delete(
        "/api/meals/00000000-0000-0000-0000-000000000000",
      );
      expect(res.status).toBe(404);
    });
  });
});
