import {
  mealRepository,
  type MealRow,
  type MealFoodRow,
  type MealFoodRef,
} from "../../repositories/meal/mealRepository.js";
import { mealGroupRepository } from "../../repositories/mealGroup/mealGroupRepository.js";
import {
  ingredientRepository,
  type IngredientRow,
} from "../../repositories/ingredient/ingredientRepository.js";
import {
  compositeFoodRepository,
  type CompositeFoodWithIngredientsJoinRow,
} from "../../repositories/compositeFood/compositeFoodRepository.js";
import { getDb } from "../../db/database.js";
import type { CreateMealData } from "../../schemas/meal.js";
import type {
  TIngredient,
  TCompositeFood,
  TCompositeFoodIngredient,
  TMeal,
  TMealFood,
} from "../../types.js";

export interface UpdateMealInput {
  name?: string;
  foods?: MealFoodRef[];
}

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

/**
 * Grabs all the ingredient and composite food rows for this meal and returns
 * a map of them by id.
 */
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

  const ingredientMap = new Map(
    ingredientRows.map((ingredientRow) => [ingredientRow.id, ingredientRow]),
  );

  const compositeFoodMap = new Map<string, CompositeFoodWithIngredientsJoinRow[]>();
  for (const joinRow of compositeFoodJoinRows) {
    const existing = compositeFoodMap.get(joinRow.id) ?? [];
    existing.push(joinRow);
    compositeFoodMap.set(joinRow.id, existing);
  }

  return { ingredientMap, compositeFoodMap };
}

function toMealFoodFromIngredient(
  ingredientRow: IngredientRow,
  amount: number,
): TMealFood {
  const ingredient = toIngredient(ingredientRow);
  const mealFood: TMealFood = { ...ingredient, amount };
  return mealFood;
}

function toMealFoodFromCompositeFood(
  compositeFoodId: string,
  joinRows: CompositeFoodWithIngredientsJoinRow[],
  amount: number,
): TMealFood {
  const compositeFood = toCompositeFood(compositeFoodId, joinRows);
  const mealFood: TMealFood = { ...compositeFood, amount };
  return mealFood;
}

function assembleMealFoodsFromCatalog(
  mealFoodRows: MealFoodRow[],
  catalog: FoodCatalog,
): TMealFood[] {
  const foods: TMealFood[] = [];

  for (const mealFoodRow of mealFoodRows) {
    if (mealFoodRow.ingredient_id) {
      const ingredientRow = catalog.ingredientMap.get(mealFoodRow.ingredient_id);
      if (!ingredientRow) continue;
      const mealFood = toMealFoodFromIngredient(ingredientRow, mealFoodRow.amount);
      foods.push(mealFood);
    }

    if (mealFoodRow.composite_food_id) {
      const joinRows = catalog.compositeFoodMap.get(mealFoodRow.composite_food_id);
      if (!joinRows || joinRows.length === 0) continue;
      const mealFood = toMealFoodFromCompositeFood(
        mealFoodRow.composite_food_id,
        joinRows,
        mealFoodRow.amount,
      );
      foods.push(mealFood);
    }
  }

  return foods;
}

function refsToMealFoodRows(foodRefs: MealFoodRef[]): MealFoodRow[] {
  const mealFoodRows = foodRefs.map((foodRef) => ({
    id: "",
    meal_id: "",
    ingredient_id: foodRef.ingredientId ?? null,
    composite_food_id: foodRef.compositeFoodId ?? null,
    amount: foodRef.amount,
  }));
  return mealFoodRows;
}

function assertMealFoodRefsExist(
  foodRefs: MealFoodRef[],
  foodCatalog: FoodCatalog,
): void {
  const uniqueIngredientIds = [
    ...new Set(
      foodRefs
        .filter((foodRef) => foodRef.ingredientId)
        .map((foodRef) => foodRef.ingredientId!),
    ),
  ];
  const uniqueCompositeFoodIds = [
    ...new Set(
      foodRefs
        .filter((foodRef) => foodRef.compositeFoodId)
        .map((foodRef) => foodRef.compositeFoodId!),
    ),
  ];

  if (
    foodCatalog.ingredientMap.size !== uniqueIngredientIds.length ||
    foodCatalog.compositeFoodMap.size !== uniqueCompositeFoodIds.length
  ) {
    throw new Error("One or more meal foods not found");
  }
}

function findLowestAvailableSortOrder(existingSortOrders: Set<number>): number {
  let candidateSortOrder = 0;
  while (existingSortOrders.has(candidateSortOrder)) {
    candidateSortOrder += 1;
  }
  return candidateSortOrder;
}

export function toMeal(mealRow: MealRow, foods: TMealFood[] = []): TMeal {
  const meal: TMeal = {
    id: mealRow.id,
    name: mealRow.name,
    mealGroupId: mealRow.meal_group_id,
    sortOrder: mealRow.sort_order,
    foods,
  };
  return meal;
}

export const mealService = {
  async create(input: CreateMealData): Promise<TMeal> {
    const mealGroup = await mealGroupRepository.findById(input.mealGroupId);
    if (!mealGroup) {
      throw new Error("Meal group not found");
    }

    const existingMeals = await mealRepository.findByMealGroupId(input.mealGroupId);
    const existingSortOrders = new Set(
      existingMeals.map((mealRow) => mealRow.sort_order),
    );
    const resolvedSortOrder = findLowestAvailableSortOrder(existingSortOrders);

    const mealRecord = await mealRepository.create({
      name: input.name,
      mealGroupId: input.mealGroupId,
      sortOrder: resolvedSortOrder,
    });

    const createdMeal = toMeal(mealRecord);
    return createdMeal;
  },

  async list(mealGroupId: string): Promise<TMeal[]> {
    const mealRows = await mealRepository.findByMealGroupId(mealGroupId);
    const mealIds = mealRows.map((mealRow) => mealRow.id);
    const allMealFoodRows = await mealRepository.findFoodsByMealIds(mealIds);

    const catalog = await fetchFoodCatalog(allMealFoodRows);

    const mealFoodRowsByMealId = new Map<string, MealFoodRow[]>();
    for (const foodRow of allMealFoodRows) {
      const existing = mealFoodRowsByMealId.get(foodRow.meal_id) ?? [];
      existing.push(foodRow);
      mealFoodRowsByMealId.set(foodRow.meal_id, existing);
    }

    const meals: TMeal[] = mealRows.map((mealRow) => {
      const mealFoodRowsForMeal = mealFoodRowsByMealId.get(mealRow.id) ?? [];
      const foods = assembleMealFoodsFromCatalog(mealFoodRowsForMeal, catalog);
      const meal = toMeal(mealRow, foods);
      return meal;
    });
    return meals;
  },

  async update(id: string, input: UpdateMealInput): Promise<TMeal | null> {
    const existingMeal = await mealRepository.findById(id);
    if (!existingMeal) return null;

    if (input.foods !== undefined) {
      const mealFoodRows = refsToMealFoodRows(input.foods);
      const foodCatalog = await fetchFoodCatalog(mealFoodRows);
      assertMealFoodRefsExist(input.foods, foodCatalog);
      await mealRepository.replaceFoods(id, input.foods);

      const updatedMealRecord = await mealRepository.update(id, { name: input.name });
      if (!updatedMealRecord) return null;

      const mealFoods = assembleMealFoodsFromCatalog(mealFoodRows, foodCatalog);
      const updatedMeal = toMeal(updatedMealRecord, mealFoods);
      return updatedMeal;
    }

    const updatedMealRecord = await mealRepository.update(id, { name: input.name });
    if (!updatedMealRecord) return null;

    const mealFoodRows = await mealRepository.findFoodsByMealId(updatedMealRecord.id);
    const foodCatalog = await fetchFoodCatalog(mealFoodRows);
    const mealFoods = assembleMealFoodsFromCatalog(mealFoodRows, foodCatalog);
    const updatedMeal = toMeal(updatedMealRecord, mealFoods);
    return updatedMeal;
  },

  async reorder(mealGroupId: string, mealIds: string[]): Promise<void> {
    const existingMeals = await mealRepository.findByMealGroupId(mealGroupId);
    const existingMealIds = new Set(existingMeals.map((mealRow) => mealRow.id));

    const uniqueRequestedMealIds = new Set(mealIds);
    const allIdsExist = mealIds.every((mealId) => existingMealIds.has(mealId));
    const hasDuplicateMealIds = uniqueRequestedMealIds.size !== mealIds.length;
    if (
      !allIdsExist ||
      hasDuplicateMealIds ||
      mealIds.length !== existingMeals.length
    ) {
      throw new Error("Meal IDs do not match the meals in this group");
    }

    await getDb()
      .transaction()
      .execute(async (transaction) => {
        await Promise.all(
          mealIds.map((mealId, sortOrder) =>
            mealRepository.update(mealId, { sortOrder }, transaction),
          ),
        );
      });
  },

  async delete(id: string): Promise<boolean> {
    const mealToDelete = await mealRepository.findById(id);
    if (!mealToDelete) {
      return false;
    }

    const deleted = await mealRepository.delete(id);
    if (deleted) {
      const remainingMeals = await mealRepository.findByMealGroupId(
        mealToDelete.meal_group_id,
      );
      const mealsToShift = remainingMeals.filter(
        (meal) => meal.sort_order > mealToDelete.sort_order,
      );
      await Promise.all(
        mealsToShift.map((meal) =>
          mealRepository.update(meal.id, { sortOrder: meal.sort_order - 1 }),
        ),
      );
    }
    return deleted;
  },
};
