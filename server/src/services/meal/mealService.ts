import {
  mealRepository,
  type CreateMealData,
  type UpdateMealData,
  type MealFoodRow,
} from "../../repositories/meal/mealRepository.js";
import {
  ingredientRepository,
  type IngredientRow,
} from "../../repositories/ingredient/ingredientRepository.js";
import {
  compositeFoodRepository,
  type CompositeFoodWithIngredientsJoinRow,
} from "../../repositories/compositeFood/compositeFoodRepository.js";
import type {
  TIngredient,
  TCompositeFood,
  TCompositeFoodIngredient,
  TMeal,
} from "../../types.js";

function round2(value: number): number {
  const scaled = Math.round(value * 100);
  return scaled / 100;
}

function toIngredient(row: IngredientRow): TIngredient {
  const ingredient: TIngredient = {
    id: row.id,
    name: row.name,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fats: row.fats,
    servingSize: row.serving_size,
    unit: row.unit,
  };
  return ingredient;
}

function toCompositeFood(
  compositeFoodId: string,
  joinRows: CompositeFoodWithIngredientsJoinRow[],
): TCompositeFood {
  const firstRow = joinRows[0];
  const ingredients: TCompositeFoodIngredient[] = [];
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;

  for (const joinRow of joinRows) {
    if (!joinRow.ingredient_id) continue;

    const scale = (joinRow.amount ?? 0) / (joinRow.serving_size ?? 1);

    const compositeFoodIngredient: TCompositeFoodIngredient = {
      ingredientId: joinRow.ingredient_id,
      name: joinRow.ingredient_name ?? "Unknown",
      calories: joinRow.calories ?? 0,
      protein: joinRow.protein ?? 0,
      carbs: joinRow.carbs ?? 0,
      fats: joinRow.fats ?? 0,
      amount: joinRow.amount ?? 0,
      unit: joinRow.unit ?? "GRAM",
      servingSize: joinRow.serving_size ?? 0,
    };
    ingredients.push(compositeFoodIngredient);

    totalCalories += (joinRow.calories ?? 0) * scale;
    totalProtein += (joinRow.protein ?? 0) * scale;
    totalCarbs += (joinRow.carbs ?? 0) * scale;
    totalFats += (joinRow.fats ?? 0) * scale;
  }

  const compositeFood: TCompositeFood = {
    id: compositeFoodId,
    name: firstRow.name,
    calories: round2(totalCalories),
    protein: round2(totalProtein),
    carbs: round2(totalCarbs),
    fats: round2(totalFats),
    servingSize: firstRow.cf_serving_size,
    unit: firstRow.cf_unit,
    ingredients,
  };
  return compositeFood;
}

interface FoodCatalog {
  ingredientMap: Map<string, IngredientRow>;
  compositeFoodMap: Map<string, CompositeFoodWithIngredientsJoinRow[]>;
}

async function fetchFoodCatalog(mealFoodRows: MealFoodRow[]): Promise<FoodCatalog> {
  const ingredientIds = mealFoodRows
    .filter((foodRow) => foodRow.ingredient_id !== null)
    .map((foodRow) => foodRow.ingredient_id!);

  const compositeFoodIds = mealFoodRows
    .filter((foodRow) => foodRow.composite_food_id !== null)
    .map((foodRow) => foodRow.composite_food_id!);

  const [ingredientRows, compositeFoodJoinRows] = await Promise.all([
    ingredientRepository.findByIds(ingredientIds),
    compositeFoodRepository.findByIdsWithIngredients(compositeFoodIds),
  ]);

  const ingredientMap = new Map(ingredientRows.map((row) => [row.id, row]));

  const compositeFoodMap = new Map<string, CompositeFoodWithIngredientsJoinRow[]>();
  for (const joinRow of compositeFoodJoinRows) {
    const existing = compositeFoodMap.get(joinRow.id) ?? [];
    existing.push(joinRow);
    compositeFoodMap.set(joinRow.id, existing);
  }

  return { ingredientMap, compositeFoodMap };
}

function assembleFoods(
  mealFoodRows: MealFoodRow[],
  catalog: FoodCatalog,
): (TIngredient | TCompositeFood)[] {
  const foods: (TIngredient | TCompositeFood)[] = [];

  for (const mealFoodRow of mealFoodRows) {
    if (mealFoodRow.ingredient_id) {
      const ingredientRow = catalog.ingredientMap.get(mealFoodRow.ingredient_id);
      if (!ingredientRow) continue;
      foods.push(toIngredient(ingredientRow));
    }

    if (mealFoodRow.composite_food_id) {
      const joinRows = catalog.compositeFoodMap.get(mealFoodRow.composite_food_id);
      if (!joinRows || joinRows.length === 0) continue;
      foods.push(toCompositeFood(mealFoodRow.composite_food_id, joinRows));
    }
  }

  return foods;
}

export const mealService = {
  async create(input: CreateMealData): Promise<TMeal> {
    const mealRecord = await mealRepository.createWithFoods(input);
    const mealFoodRows = await mealRepository.findFoodsByMealId(mealRecord.id);
    const catalog = await fetchFoodCatalog(mealFoodRows);
    const foods = assembleFoods(mealFoodRows, catalog);
    const createdMeal: TMeal = {
      id: mealRecord.id,
      name: mealRecord.name,
      foods,
    };
    return createdMeal;
  },

  async list(): Promise<TMeal[]> {
    const mealRows = await mealRepository.findAll();
    const allMealIds = mealRows.map((mealRow) => mealRow.id);
    const allMealFoodRows = await mealRepository.findFoodsByMealIds(allMealIds);

    const catalog = await fetchFoodCatalog(allMealFoodRows);

    const mealFoodRowsByMealId = new Map<string, MealFoodRow[]>();
    for (const foodRow of allMealFoodRows) {
      const existing = mealFoodRowsByMealId.get(foodRow.meal_id) ?? [];
      existing.push(foodRow);
      mealFoodRowsByMealId.set(foodRow.meal_id, existing);
    }

    const meals: TMeal[] = mealRows.map((mealRow) => {
      const mealFoodRowsForMeal = mealFoodRowsByMealId.get(mealRow.id) ?? [];
      const foods = assembleFoods(mealFoodRowsForMeal, catalog);
      const meal: TMeal = {
        id: mealRow.id,
        name: mealRow.name,
        foods,
      };
      return meal;
    });
    return meals;
  },

  async update(id: string, input: UpdateMealData): Promise<TMeal | null> {
    const updatedRecord = await mealRepository.update(id, input);
    if (!updatedRecord) return null;

    const mealFoodRows = await mealRepository.findFoodsByMealId(updatedRecord.id);
    const catalog = await fetchFoodCatalog(mealFoodRows);
    const foods = assembleFoods(mealFoodRows, catalog);
    const updatedMeal: TMeal = {
      id: updatedRecord.id,
      name: updatedRecord.name,
      foods,
    };
    return updatedMeal;
  },

  async delete(id: string): Promise<boolean> {
    const deleted = await mealRepository.delete(id);
    return deleted;
  },
};
