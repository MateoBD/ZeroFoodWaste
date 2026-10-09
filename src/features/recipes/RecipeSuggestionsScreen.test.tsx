import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocales } from 'expo-localization';
import { router } from 'expo-router';
import { useEffect as mockUseEffect } from 'react';

import { PantryProvider } from '@/features/pantry/PantryContext';
import { localDateToCalendarDate } from '@/features/pantry/calendarDate';
import { PANTRY_STORAGE_KEY } from '@/features/pantry/pantryRepository';

import { FavoriteRecipesProvider } from './favorites/FavoriteRecipesContext';
import { RecipeSuggestionsScreen } from './RecipeSuggestionsScreen';
import { recipeRequestCache } from './recommendations/sharedCache';
import { RecommendationProvider } from './recommendations/RecommendationContext';
import { RECOMMENDATION_STORAGE_KEY } from './recommendations/storage';

jest.mock('expo-localization', () => ({ useLocales: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: (effect: () => void) => { mockUseEffect(effect, [effect]); } }));
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual('react-native').FlatList,
}));

const mockUseLocales = useLocales as jest.Mock;

describe('RecipeSuggestionsScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    recipeRequestCache.clear();
    mockUseLocales.mockReturnValue([{ languageCode: 'en' }]);
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('explains that suggestions need pantry food when the pantry is empty', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const screen = await render(
      <PantryProvider><RecommendationProvider><FavoriteRecipesProvider><RecipeSuggestionsScreen /></FavoriteRecipesProvider></RecommendationProvider></PantryProvider>,
    );

    expect(await screen.findByText('Your pantry is empty. Add food to get recipe suggestions.')).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('automatically loads recipes for an eligible linked pantry ingredient', async () => {
    const today = localDateToCalendarDate(new Date());
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify({
      version: 2,
      items: [{
        id: 'chicken-package',
        name: 'Chicken breast',
        recipeIngredient: { provider: 'themealdb', id: '1', name: 'Chicken' },
        expirationDate: today,
        createdAt: new Date().toISOString(),
      }],
    }));
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        meals: [{ idMeal: '52772', strMeal: 'Teriyaki Chicken', strMealThumb: null, strIngredient1: 'Chicken', strMeasure1: '1 cup', strInstructions: 'Cook' }],
      }),
    } as Response);

    const screen = await render(
      <PantryProvider><RecommendationProvider><FavoriteRecipesProvider><RecipeSuggestionsScreen /></FavoriteRecipesProvider></RecommendationProvider></PantryProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Teriyaki Chicken' })).toBeTruthy();
    expect(screen.getByText('Chicken breast')).toBeTruthy();
    expect(screen.getByText('Use today')).toBeTruthy();
    expect(screen.getByLabelText('Filter recipes by pantry ingredient')).toBeTruthy();
    expect(screen.getByText('1/1 ingredients matched')).toBeTruthy();
    expect(screen.getByText('All ingredient names matched')).toBeTruthy();
    expect(screen.getByText('Source: TheMealDB')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save to favorites: Teriyaki Chicken' }));
    expect(await screen.findByRole('button', { name: 'Remove from favorites: Teriyaki Chicken' })).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Teriyaki Chicken' }));
    expect(router.push).toHaveBeenCalledWith(expect.objectContaining({
      params: { ingredient: 'Chicken', mealId: '52772' },
    }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      'https://www.themealdb.com/api/json/v1/1/filter.php?i=Chicken',
    ));
  });

  it('shows a fresh saved list immediately without provider requests', async () => {
    const today = localDateToCalendarDate(new Date());
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify({ version: 2, items: [{
      id: 'saved-chicken', name: 'Chicken', expirationDate: today,
      recipeIngredient: null, createdAt: new Date().toISOString(),
    }] }));
    await AsyncStorage.setItem(RECOMMENDATION_STORAGE_KEY, JSON.stringify({
      version: 1,
      fetchedAt: new Date().toISOString(),
      searchedIngredients: ['chicken'],
      details: [{
        id: 'saved-meal', name: 'Saved chicken soup', provider: 'themealdb', imageUrl: null,
        ingredients: [{ name: 'Chicken', measure: '1' }], instructions: 'Cook', sourceUrl: null,
      }],
    }));
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        ok: true, status: 200,
        json: async () => ({ meals: [{
          idMeal: 'saved-meal', strMeal: 'Saved chicken soup', strMealThumb: null,
          strIngredient1: 'Chicken', strMeasure1: '1', strInstructions: 'Cook',
        }] }),
      } as Response;
    });
    const screen = await render(
      <PantryProvider><RecommendationProvider><FavoriteRecipesProvider><RecipeSuggestionsScreen /></FavoriteRecipesProvider></RecommendationProvider></PantryProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Saved chicken soup' })).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    await act(async () => {
      screen.getByTestId('recipe-suggestions-list').props.onRefresh();
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(fetchSpy).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Refresh recipes' })).toBeNull();
  });

  it('keeps successful recipes and uses a compact notice after a partial failure', async () => {
    const today = localDateToCalendarDate(new Date());
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify({ version: 2, items: [
      { id: 'chicken', name: 'Chicken', expirationDate: today, recipeIngredient: null, createdAt: new Date().toISOString() },
      { id: 'milk', name: 'Milk', expirationDate: today, recipeIngredient: null, createdAt: new Date().toISOString() },
    ] }));
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('filter.php?i=Milk')) throw new Error('offline');
      return {
        ok: true, status: 200,
        json: async () => ({ meals: [{
          idMeal: 'chicken-meal', strMeal: 'Chicken soup', strMealThumb: null,
          strIngredient1: 'Chicken', strInstructions: 'Cook',
        }] }),
      } as Response;
    });
    const screen = await render(
      <PantryProvider><RecommendationProvider><FavoriteRecipesProvider><RecipeSuggestionsScreen /></FavoriteRecipesProvider></RecommendationProvider></PantryProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Chicken soup' })).toBeTruthy();
    expect(await screen.findByTestId('undo-snackbar')).toBeTruthy();
    expect(screen.getByText("Some recipes couldn't refresh.")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('shows a clear message when an eligible ingredient has no recipes', async () => {
    const today = localDateToCalendarDate(new Date());
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify({
      version: 2,
      items: [{
        id: 'food-package',
        name: 'Mystery food',
        recipeIngredient: { provider: 'themealdb', id: '2', name: 'Mystery' },
        expirationDate: today,
        createdAt: new Date().toISOString(),
      }],
    }));
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ meals: null }),
    } as Response);

    const screen = await render(
      <PantryProvider><RecommendationProvider><FavoriteRecipesProvider><RecipeSuggestionsScreen /></FavoriteRecipesProvider></RecommendationProvider></PantryProvider>,
    );

    expect(await screen.findByText('No recipes matched your pantry ingredients.')).toBeTruthy();
  });

  it('keeps a multiline pantry name on one visible filter-chip line', async () => {
    const today = localDateToCalendarDate(new Date());
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify({
      version: 2,
      items: [{
        id: 'long-food',
        name: 'Chicken\nBreasts',
        recipeIngredient: { provider: 'themealdb', id: '3', name: 'Chicken' },
        expirationDate: today,
        createdAt: new Date().toISOString(),
      }],
    }));
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ meals: null }),
    } as Response);
    const screen = await render(
      <PantryProvider><RecommendationProvider><FavoriteRecipesProvider><RecipeSuggestionsScreen /></FavoriteRecipesProvider></RecommendationProvider></PantryProvider>,
    );

    const label = await screen.findByText('Chicken');
    expect(label.props.numberOfLines).toBe(1);
  });

  it('filters the flat recipe list to a selected pantry ingredient', async () => {
    const today = localDateToCalendarDate(new Date());
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify({
      version: 2,
      items: [
        {
          id: 'chicken', name: 'Chicken', expirationDate: today,
          recipeIngredient: { provider: 'themealdb', id: '1', name: 'Chicken' },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'milk', name: 'Milk', expirationDate: today,
          recipeIngredient: { provider: 'themealdb', id: '2', name: 'Milk' },
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const isMilk = /Milk|milk-recipe/.test(String(input));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          meals: [{
            idMeal: isMilk ? 'milk-recipe' : 'chicken-recipe',
            strMeal: isMilk ? 'Milk pudding' : 'Chicken curry',
            strMealThumb: null, strIngredient1: isMilk ? 'Milk' : 'Chicken', strInstructions: 'Cook',
          }],
        }),
      } as Response;
    });
    const screen = await render(
      <PantryProvider><RecommendationProvider><FavoriteRecipesProvider><RecipeSuggestionsScreen /></FavoriteRecipesProvider></RecommendationProvider></PantryProvider>,
    );
    await screen.findByRole('button', { name: 'Chicken curry' });
    await screen.findByRole('button', { name: 'Milk pudding' });

    await fireEvent.changeText(screen.getByLabelText('Filter recipes by pantry ingredient'), 'mil');
    await fireEvent.press(screen.getByRole('button', { name: 'Milk' }));

    expect(screen.queryByRole('button', { name: 'Chicken curry' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Milk pudding' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Milk' }));

    expect(screen.getByRole('button', { name: 'Chicken curry' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Milk pudding' })).toBeTruthy();
  });

  it('defaults to the meal time for the local hour and lets the user switch', async () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(19);
    const today = localDateToCalendarDate(new Date());
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify({ version: 2, items: [{
      id: 'eggs', name: 'Eggs', expirationDate: today,
      recipeIngredient: null, createdAt: new Date().toISOString(),
    }] }));
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ meals: [{
      idMeal: 'breakfast-meal', strMeal: 'Omelette', strMealThumb: null, strCategory: 'Breakfast',
      strIngredient1: 'Eggs', strInstructions: 'Cook',
    }] }) } as Response);
    const screen = await render(
      <PantryProvider><RecommendationProvider><RecipeSuggestionsScreen /></RecommendationProvider></PantryProvider>,
    );

    expect(await screen.findByText('No recipes for this meal time. Try another one.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dinner' }).props.accessibilityState.selected).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Breakfast' }));

    expect(screen.getByRole('button', { name: 'Omelette' })).toBeTruthy();
  });

  it('renders Spanish matched counts and missing ingredient copy', async () => {
    mockUseLocales.mockReturnValue([{ languageCode: 'es' }]);
    const today = localDateToCalendarDate(new Date());
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify({ version: 2, items: [{
      id: 'spanish-chicken', name: 'Chicken', expirationDate: today,
      recipeIngredient: null, createdAt: new Date().toISOString(),
    }] }));
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ meals: [{
      idMeal: 'spanish-meal', strMeal: 'Chicken soup', strMealThumb: null,
      strIngredient1: 'Chicken', strIngredient2: 'Carrot', strMeasure2: '2', strInstructions: 'Cook',
    }] }) } as Response);
    const screen = await render(
      <PantryProvider><RecommendationProvider><FavoriteRecipesProvider><RecipeSuggestionsScreen /></FavoriteRecipesProvider></RecommendationProvider></PantryProvider>,
    );
    await screen.findByRole('button', { name: 'Chicken soup' });
    expect(screen.getByText('1/2 ingredientes coincidentes')).toBeTruthy();
    expect(screen.getByText('Ingredientes faltantes: Carrot')).toBeTruthy();
  });
});
