import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import {
  createMealSchema,
  updateMealSchema,
  idParamSchema,
  listMealsQuerySchema,
  reorderMealsSchema,
} from "../../schemas/meal.js";
import { mealService } from "../../services/meal/mealService.js";

export const mealRoutes = Router();

mealRoutes.post("/", validate({ body: createMealSchema }), async (req, res, next) => {
  try {
    const meal = await mealService.create(req.body);
    res.status(201).json(meal);
  } catch (err) {
    next(err);
  }
});

mealRoutes.get(
  "/",
  validate({ query: listMealsQuerySchema }),
  async (req, res, next) => {
    try {
      const mealGroupId = req.query.mealGroupId as string;
      const meals = await mealService.list(mealGroupId);
      res.json(meals);
    } catch (err) {
      next(err);
    }
  },
);

mealRoutes.patch(
  "/reorder",
  validate({ body: reorderMealsSchema }),
  async (req, res, next) => {
    try {
      await mealService.reorder(req.body.mealGroupId, req.body.mealIds);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

mealRoutes.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateMealSchema }),
  async (req, res, next) => {
    try {
      const meal = await mealService.update(req.params.id, req.body);
      if (!meal) {
        res.status(404).json({ error: "Meal not found" });
        return;
      }
      res.json(meal);
    } catch (err) {
      next(err);
    }
  },
);

mealRoutes.delete(
  "/:id",
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const deleted = await mealService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Meal not found" });
        return;
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
