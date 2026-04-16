import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  createCompositeFoodSchema,
  idParamSchema,
} from "../schemas/compositeFood.js";
import { compositeFoodService } from "../services/compositeFoodService.js";

export const compositeFoodRoutes = Router();

compositeFoodRoutes.post(
  "/",
  validate({ body: createCompositeFoodSchema }),
  async (req, res, next) => {
    try {
      const result = await compositeFoodService.create(req.body);
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

compositeFoodRoutes.get("/", async (_req, res, next) => {
  try {
    const foods = await compositeFoodService.list();
    res.json(foods);
  } catch (err) {
    next(err);
  }
});

compositeFoodRoutes.get(
  "/:id",
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const food = await compositeFoodService.getById(req.params.id);
      if (!food) {
        res.status(404).json({ error: "Composite food not found" });
        return;
      }
      res.json(food);
    } catch (err) {
      next(err);
    }
  }
);

compositeFoodRoutes.delete(
  "/:id",
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const deleted = await compositeFoodService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Composite food not found" });
        return;
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
