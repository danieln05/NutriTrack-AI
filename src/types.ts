/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  sugar: number;
  fat: number;
  saturatedFat: number;
  fiber: number;
  salt: number;
}

export interface MealItem {
  id: string;
  name: string;
  portionGrams: number;
  nutrition: Nutrition;
  timestamp: number;
  imageUrl?: string;
}

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const DEFAULT_GOALS: DailyGoals = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 70,
};
