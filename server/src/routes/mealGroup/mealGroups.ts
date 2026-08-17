import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import {
  createMealGroupSchema,
  updateMealGroupSchema,
  idParamSchema,
} from "../../schemas/mealGroup.js";
import { mealGroupService } from "../../services/mealGroup/mealGroupService.js";

export const mealGroupRoutes = Router();

mealGroupRoutes.post(
  "/",
  validate({ body: createMealGroupSchema }),
  async (req, res, next) => {
    try {
      const createdMealGroup = await mealGroupService.create(req.body);
      res.status(201).json(createdMealGroup);
    } catch (err) {
      next(err);
    }
  },
);

mealGroupRoutes.get("/", async (_req, res, next) => {
  try {
    const mealGroups = await mealGroupService.list();
    res.json(mealGroups);
  } catch (err) {
    next(err);
  }
});

mealGroupRoutes.get(
  "/:id",
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const mealGroup = await mealGroupService.getById(req.params.id);
      if (!mealGroup) {
        res.status(404).json({ error: "Meal group not found" });
        return;
      }
      res.json(mealGroup);
    } catch (err) {
      next(err);
    }
  },
);

mealGroupRoutes.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateMealGroupSchema }),
  async (req, res, next) => {
    try {
      const updatedMealGroup = await mealGroupService.update(req.params.id, req.body);
      if (!updatedMealGroup) {
        res.status(404).json({ error: "Meal group not found" });
        return;
      }
      res.json(updatedMealGroup);
    } catch (err) {
      next(err);
    }
  },
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
  },
);
