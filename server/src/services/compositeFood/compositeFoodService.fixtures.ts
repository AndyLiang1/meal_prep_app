import type { TCompositeFood } from "../../types.js";
import type {
  CompositeFoodRow,
  CompositeFoodWithIngredientsJoinRow,
  CompositeIngredientJoinRow,
} from "../../repositories/compositeFood/compositeFoodRepository.js";
import type { CreateCompositeFoodInput } from "./compositeFoodService.js";
import { mockCreateIngredientData } from "../../repositories/ingredient/ingredientRepository.fixtures.js";

export const MOCK_COMPOSITE_FOOD_ID_1 = "composite-food-1-id";
export const MOCK_COMPOSITE_FOOD_ID_2 = "composite-food-2-id";

export const MOCK_INGREDIENT_ID_1 = "ingredient-1-id";
export const MOCK_INGREDIENT_ID_2 = "ingredient-2-id";
export const MOCK_INGREDIENT_ID_3 = "ingredient-3-id";

// --- Repo-layer rows (what the mocked repositories return) ---

export const mockCompositeFoodRow1: CompositeFoodRow = {
  id: MOCK_COMPOSITE_FOOD_ID_1,
  name: "composite-food-1",
  created_at: new Date("2026-05-01T12:00:00.000Z"),
  updated_at: new Date("2026-05-01T12:00:00.000Z"),
};

export const mockCompositeFoodRow2: CompositeFoodRow = {
  id: MOCK_COMPOSITE_FOOD_ID_2,
  name: "composite-food-2",
  created_at: new Date("2026-05-02T12:00:00.000Z"),
  updated_at: new Date("2026-05-02T12:00:00.000Z"),
};

export const mockIngredientJoinRow1: CompositeIngredientJoinRow = {
  ingredient_id: MOCK_INGREDIENT_ID_1,
  name: "ingredient-a",
  amount: 100,
  serving_size: mockCreateIngredientData.servingSize,
  unit: mockCreateIngredientData.unit,
  calories: mockCreateIngredientData.calories,
  protein: mockCreateIngredientData.protein,
  carbs: mockCreateIngredientData.carbs,
  fats: mockCreateIngredientData.fats,
};

export const mockIngredientJoinRow2: CompositeIngredientJoinRow = {
  ingredient_id: MOCK_INGREDIENT_ID_2,
  name: "ingredient-b",
  amount: 200,
  serving_size: mockCreateIngredientData.servingSize,
  unit: mockCreateIngredientData.unit,
  calories: mockCreateIngredientData.calories,
  protein: mockCreateIngredientData.protein,
  carbs: mockCreateIngredientData.carbs,
  fats: mockCreateIngredientData.fats,
};

/** Same base ingredient as Row 1, but amount=50 vs serving_size=100 → scale 0.5 */
export const mockIngredientJoinRow3: CompositeIngredientJoinRow = {
  ingredient_id: MOCK_INGREDIENT_ID_1,
  name: "ingredient-a",
  amount: 50,
  serving_size: mockCreateIngredientData.servingSize,
  unit: mockCreateIngredientData.unit,
  calories: mockCreateIngredientData.calories,
  protein: mockCreateIngredientData.protein,
  carbs: mockCreateIngredientData.carbs,
  fats: mockCreateIngredientData.fats,
};

// --- Service-layer input ---

export const mockCreateCompositeFoodInput1: CreateCompositeFoodInput = {
  name: "composite-food-1",
  ingredients: [
    { ingredientId: MOCK_INGREDIENT_ID_1, amount: 100 },
    { ingredientId: MOCK_INGREDIENT_ID_2, amount: 200 },
  ],
};

export const mockCreateCompositeFoodInput2: CreateCompositeFoodInput = {
  name: "composite-food-2",
  ingredients: [{ ingredientId: MOCK_INGREDIENT_ID_1, amount: 50 }],
};

// --- Expected domain objects (what the service should return) ---
//
// Macro math: each join row's macros are scaled by (amount / serving_size),
// then summed across all ingredients.
//
// Base macros per 100g: cal 102, protein 1.1, carbs 1.2, fats 1.3
//
// Row 1: amount=100, serving_size=100, scale=1  → cal 102, protein 1.1,  carbs 1.2,  fats 1.3
// Row 2: amount=200, serving_size=100, scale=2  → cal 204, protein 2.2,  carbs 2.4,  fats 2.6
// CF1 totals (Row1+Row2):                         cal 306, protein 3.3,  carbs 3.6,  fats 3.9
//
// CF2:   amount=50,  serving_size=100, scale=0.5 → cal 51,  protein 0.55, carbs 0.6,  fats 0.65

export const mockExpectedTCompositeFood1: TCompositeFood = {
  id: MOCK_COMPOSITE_FOOD_ID_1,
  name: "composite-food-1",
  calories: 306,
  protein: 3.3,
  carbs: 3.6,
  fats: 3.9,
  ingredients: [
    {
      ingredientId: MOCK_INGREDIENT_ID_1,
      name: "ingredient-a",
      calories: 102,
      protein: 1.1,
      carbs: 1.2,
      fats: 1.3,
      servingSize: 100,
      amount: 100,
      unit: "GRAM",
    },
    {
      ingredientId: MOCK_INGREDIENT_ID_2,
      name: "ingredient-b",
      calories: 204,
      protein: 2.2,
      carbs: 2.4,
      fats: 2.6,
      servingSize: 100,
      amount: 200,
      unit: "GRAM",
    },
  ],
};

export const mockExpectedTCompositeFood2: TCompositeFood = {
  id: MOCK_COMPOSITE_FOOD_ID_2,
  name: "composite-food-2",
  calories: 51,
  protein: 0.55,
  carbs: 0.6,
  fats: 0.65,
  ingredients: [
    {
      ingredientId: MOCK_INGREDIENT_ID_1,
      name: "ingredient-a",
      calories: 51,
      protein: 0.55,
      carbs: 0.6,
      fats: 0.65,
      amount: 50,
      unit: "GRAM",
      servingSize: 100,
    },
  ],
};

// --- Flat join rows (what findAllWithIngredients / findByIdWithIngredients return) ---

export const mockFlatJoinRowsCompositeFood1: CompositeFoodWithIngredientsJoinRow[] = [
  {
    id: MOCK_COMPOSITE_FOOD_ID_1,
    name: "composite-food-1",
    ingredient_id: MOCK_INGREDIENT_ID_1,
    ingredient_name: "ingredient-a",
    amount: 100,
    serving_size: mockCreateIngredientData.servingSize,
    unit: mockCreateIngredientData.unit,
    calories: mockCreateIngredientData.calories,
    protein: mockCreateIngredientData.protein,
    carbs: mockCreateIngredientData.carbs,
    fats: mockCreateIngredientData.fats,
  },
  {
    id: MOCK_COMPOSITE_FOOD_ID_1,
    name: "composite-food-1",
    ingredient_id: MOCK_INGREDIENT_ID_2,
    ingredient_name: "ingredient-b",
    amount: 200,
    serving_size: mockCreateIngredientData.servingSize,
    unit: mockCreateIngredientData.unit,
    calories: mockCreateIngredientData.calories,
    protein: mockCreateIngredientData.protein,
    carbs: mockCreateIngredientData.carbs,
    fats: mockCreateIngredientData.fats,
  },
];

export const mockFlatJoinRowsCompositeFood2: CompositeFoodWithIngredientsJoinRow[] = [
  {
    id: MOCK_COMPOSITE_FOOD_ID_2,
    name: "composite-food-2",
    ingredient_id: MOCK_INGREDIENT_ID_1,
    ingredient_name: "ingredient-a",
    amount: 50,
    serving_size: mockCreateIngredientData.servingSize,
    unit: mockCreateIngredientData.unit,
    calories: mockCreateIngredientData.calories,
    protein: mockCreateIngredientData.protein,
    carbs: mockCreateIngredientData.carbs,
    fats: mockCreateIngredientData.fats,
  },
];
