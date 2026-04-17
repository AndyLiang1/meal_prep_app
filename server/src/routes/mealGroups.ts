import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  createMealGroupSchema,
  updateMealGroupSchema,
  idParamSchema,
} from "../schemas/mealGroup.js";
import { mealGroupService } from "../services/mealGroupService.js";

export const mealGroupRoutes = Router();

mealGroupRoutes.post(
  "/",
  validate({ body: createMealGroupSchema }),
  async (req, res, next) => {
    try {
      const result = await mealGroupService.create(req.body);
      if ("error" in result) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

mealGroupRoutes.get("/", async (_req, res, next) => {
  try {
    const groups = await mealGroupService.list();
    res.json(groups);
  } catch (err) {
    next(err);
  }
});

mealGroupRoutes.get(
  "/:id",
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const group = await mealGroupService.getById(req.params.id);
      if (!group) {
        res.status(404).json({ error: "Meal group not found" });
        return;
      }
      res.json(group);
    } catch (err) {
      next(err);
    }
  }
);

mealGroupRoutes.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateMealGroupSchema }),
  async (req, res, next) => {
    try {
      const group = await mealGroupService.update(req.params.id, req.body);
      if (!group) {
        res.status(404).json({ error: "Meal group not found" });
        return;
      }
      res.json(group);
    } catch (err) {
      next(err);
    }
  }
);

mealGroupRoutes.delete(
  "/:id",
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const deleted = await mealGroupService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Meal group not found" });
        return;
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
