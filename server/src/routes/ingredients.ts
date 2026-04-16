import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  createIngredientSchema,
  updateIngredientSchema,
  idParamSchema,
} from "../schemas/ingredient.js";
import { ingredientService } from "../services/ingredientService.js";

export const ingredientRoutes = Router();

ingredientRoutes.post(
  "/",
  validate({ body: createIngredientSchema }),
  async (req, res, next) => {
    try {
      const ingredient = await ingredientService.create(req.body);
      res.status(201).json(ingredient);
    } catch (err) {
      next(err);
    }
  }
);

ingredientRoutes.get("/", async (_req, res, next) => {
  try {
    const ingredients = await ingredientService.list();
    res.json(ingredients);
  } catch (err) {
    next(err);
  }
});

ingredientRoutes.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateIngredientSchema }),
  async (req, res, next) => {
    try {
      const ingredient = await ingredientService.update(req.params.id, req.body);
      if (!ingredient) {
        res.status(404).json({ error: "Ingredient not found" });
        return;
      }
      res.json(ingredient);
    } catch (err) {
      next(err);
    }
  }
);

ingredientRoutes.delete(
  "/:id",
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const deleted = await ingredientService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Ingredient not found" });
        return;
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
