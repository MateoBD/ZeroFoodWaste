import type { PantryItem } from '@/features/pantry/pantryItem';
import type { RecipeDetail } from '../recipe';
import { recommendRecipes } from './engine';
import { matchRecipe } from './matching';
import { preparePantry } from './preparation';
import { compareRecommendations } from './ranking';
import { scoreMatches } from './scoring';

const today = new Date(2026, 9, 7, 12);
const pantry = (id: string, name: string, expirationDate: string, canonical?: string): PantryItem => ({ id, name, expirationDate, createdAt: '', recipeIngredient: canonical ? { provider: 'themealdb', id: canonical, name: canonical } : null });
const recipe = (id: string, name: string, ingredients: string[]): RecipeDetail => ({ id, name, provider: 'themealdb', imageUrl: null, sourceUrl: null, instructions: '', ingredients: ingredients.map((ingredient) => ({ name: ingredient, measure: null })) });

describe('recommendation modules', () => {
  it('prepares all valid manual and linked foods across expiry boundaries', () => {
    const prepared = preparePantry([
      pantry('old', 'Old', '2026-09-29'), pantry('seven', 'Seven', '2026-09-30'),
      pantry('today', 'Chicken breast', '2026-10-07', 'Chicken'), pantry('five', 'Rice', '2026-10-12'),
      pantry('six', 'Milk', '2026-10-13'), pantry('invalid', 'Bad', '2026-02-30'),
    ], today);
    expect(prepared.packages.map((item) => item.id)).toEqual(['seven', 'today', 'five', 'six']);
    expect(prepared.packages.map((item) => item.priority)).toEqual([true, true, true, false]);
    expect(prepared.searches.map((item) => item.name)).toEqual(['Seven', 'Chicken', 'Rice', 'Milk']);
  });

  it('matches distinct names, retains duplicate packages, and reports missing ingredients', () => {
    const prepared = preparePantry([pantry('a', 'Chicken breast', '2026-10-07', 'Chicken'), pantry('b', 'CHÍCKEN', '2026-10-13'), pantry('c', 'Chicken stock', '2026-10-08')], today);
    const result = matchRecipe(recipe('1', 'Meal', ['Chicken', 'CHICKEN', 'Mushroom']), prepared);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].packages.map((item) => item.id)).toEqual(['a', 'b']);
    expect(result.missing.map((item) => item.name)).toEqual(['Mushroom']);
    expect(scoreMatches(result.matches)).toEqual({ priorityMatchCount: 1, totalMatchCount: 1, nearestExpirationDays: 0 });
  });

  it('ranks priority, total, expiry, name and ID deterministically without mutation', () => {
    const items = Object.freeze([pantry('a', 'Chicken', '2026-10-06'), pantry('b', 'Rice', '2026-10-13'), pantry('c', 'Milk', '2026-10-12')]);
    const recipes = Object.freeze([recipe('3', 'Zed', ['Rice', 'Milk']), recipe('2', 'Alpha', ['Chicken']), recipe('1', 'Alpha', ['Chicken'])]);
    const first = recommendRecipes(items, recipes, today);
    expect(first.map((item) => item.recipe.id)).toEqual(['3', '1', '2']);
    expect(recommendRecipes(items, recipes, today)).toEqual(first);
    expect(items[0].name).toBe('Chicken');
    expect(recipes[0].name).toBe('Zed');
    expect(compareRecommendations(first[1], first[2])).toBeLessThan(0);
  });
});
