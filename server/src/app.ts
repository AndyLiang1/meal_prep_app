import express from "express";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { ingredientRoutes } from "./routes/ingredient/ingredients.js";
import { compositeFoodRoutes } from "./routes/compositeFood/compositeFoods.js";
import { mealRoutes } from "./routes/meal/meals.js";
import { mealGroupRoutes } from "./routes/mealGroup/mealGroups.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);

  app.use("/api/ingredients", ingredientRoutes);
  app.use("/api/composite-foods", compositeFoodRoutes);
  app.use("/api/meals", mealRoutes);
  app.use("/api/meal-groups", mealGroupRoutes);

  app.use(errorHandler);

  return app;
}
