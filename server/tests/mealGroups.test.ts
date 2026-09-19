import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./testApp.js";

describe("Meal Groups API", () => {
  describe("POST /api/meal-groups", () => {
    it("creates a meal group with 3 auto-created empty meals", async () => {
      const res = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Breakfast Options",
          tags: ["chicken"],
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Breakfast Options");
      expect(res.body.tags).toEqual(["chicken"]);
      expect(res.body.displayAsDefault).toBe(false);
      expect(res.body.meals).toHaveLength(3);
      expect(res.body.meals[0]).toMatchObject({
        name: "Meal 1",
        sortOrder: 0,
      });
      expect(res.body.meals[1]).toMatchObject({
        name: "Meal 2",
        sortOrder: 1,
      });
      expect(res.body.meals[2]).toMatchObject({
        name: "Meal 3",
        sortOrder: 2,
      });
    });

    it("creates a meal group without tags", async () => {
      const res = await request(app).post("/api/meal-groups").send({ name: "No Tags" });

      expect(res.status).toBe(201);
      expect(res.body.tags).toEqual([]);
    });

    it("rejects creation when name is missing", async () => {
      const res = await request(app)
        .post("/api/meal-groups")
        .send({ tags: ["chicken"] });

      expect(res.status).toBe(400);
    });

    it("unsets display_as_default on all other groups when creating a new default", async () => {
      const firstDefault = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Default A",
          tags: ["chicken"],
          displayAsDefault: true,
        });
      expect(firstDefault.body.displayAsDefault).toBe(true);

      const secondDefault = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Default B",
          tags: ["lunch"],
          displayAsDefault: true,
        });
      expect(secondDefault.body.displayAsDefault).toBe(true);

      const firstRefetched = await request(app).get(
        `/api/meal-groups/${firstDefault.body.id}`,
      );
      expect(firstRefetched.body.displayAsDefault).toBe(false);
    });
  });

  describe("GET /api/meal-groups", () => {
    it("returns an empty list when none exist", async () => {
      const res = await request(app).get("/api/meal-groups");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns meal groups with nested meals", async () => {
      await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Lunch Options",
          tags: ["lunch"],
        });

      const res = await request(app).get("/api/meal-groups");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].meals).toHaveLength(3);
      expect(res.body[0].meals[0].name).toBe("Meal 1");
    });
  });

  describe("GET /api/meal-groups/:id", () => {
    it("returns the meal group when it exists", async () => {
      const created = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Dinner Ideas",
          tags: ["dinner"],
        });

      const res = await request(app).get(`/api/meal-groups/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Dinner Ideas");
      expect(res.body.meals).toHaveLength(3);
      expect(res.body.meals[0].name).toBe("Meal 1");
    });

    it("returns 404 for a non-existent meal group", async () => {
      const res = await request(app).get(
        "/api/meal-groups/00000000-0000-0000-0000-000000000000",
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/meal-groups/:id", () => {
    it("updates name and tags", async () => {
      const created = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Old Name",
          tags: ["old-tag"],
        });

      const res = await request(app)
        .patch(`/api/meal-groups/${created.body.id}`)
        .send({ name: "New Name", tags: ["new-tag"] });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("New Name");
      expect(res.body.tags).toEqual(["new-tag"]);
    });

    it("unsets defaults on all other groups when setting display_as_default true via patch", async () => {
      const firstDefault = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "First",
          tags: ["dinner"],
          displayAsDefault: true,
        });
      const second = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "Second",
          tags: ["lunch"],
        });

      const patched = await request(app)
        .patch(`/api/meal-groups/${second.body.id}`)
        .send({ displayAsDefault: true });
      expect(patched.body.displayAsDefault).toBe(true);

      const firstRefetched = await request(app).get(
        `/api/meal-groups/${firstDefault.body.id}`,
      );
      expect(firstRefetched.body.displayAsDefault).toBe(false);
    });

    it("returns 404 for a non-existent meal group", async () => {
      const res = await request(app)
        .patch("/api/meal-groups/00000000-0000-0000-0000-000000000000")
        .send({ name: "Ghost" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/meal-groups/:id", () => {
    it("deletes a meal group and cascades to its meals", async () => {
      const created = await request(app)
        .post("/api/meal-groups")
        .send({
          name: "To Delete",
          tags: ["dinner"],
        });

      const res = await request(app).delete(`/api/meal-groups/${created.body.id}`);
      expect(res.status).toBe(204);

      const listResponse = await request(app).get("/api/meal-groups");
      expect(listResponse.body).toHaveLength(0);
    });

    it("returns 404 for a non-existent meal group", async () => {
      const res = await request(app).delete(
        "/api/meal-groups/00000000-0000-0000-0000-000000000000",
      );
      expect(res.status).toBe(404);
    });
  });
});
