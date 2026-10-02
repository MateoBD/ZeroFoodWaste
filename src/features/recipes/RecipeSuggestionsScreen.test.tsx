import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocales } from 'expo-localization';

import { PantryProvider } from '@/features/pantry/PantryContext';
import { localDateToCalendarDate } from '@/features/pantry/calendarDate';
import { PANTRY_STORAGE_KEY } from '@/features/pantry/pantryRepository';

import { RecipeSuggestionsScreen } from './RecipeSuggestionsScreen';

jest.mock('expo-localization', () => ({ useLocales: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual('react-native').FlatList,
}));

const mockUseLocales = useLocales as jest.Mock;

describe('RecipeSuggestionsScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockUseLocales.mockReturnValue([{ languageCode: 'en' }]);
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('explains that suggestions need pantry food when the pantry is empty', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const screen = await render(
      <PantryProvider><RecipeSuggestionsScreen /></PantryProvider>,
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
        meals: [{ idMeal: '52772', strMeal: 'Teriyaki Chicken', strMealThumb: null }],
      }),
    } as Response);

    const screen = await render(
      <PantryProvider><RecipeSuggestionsScreen /></PantryProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Teriyaki Chicken' })).toBeTruthy();
    expect(screen.getAllByText('Chicken breast')).toHaveLength(2);
    expect(screen.getByText('Use today')).toBeTruthy();
    expect(screen.getByLabelText('Filter recipes by pantry ingredient')).toBeTruthy();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      'https://www.themealdb.com/api/json/v1/1/filter.php?i=Chicken',
    ));
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
      <PantryProvider><RecipeSuggestionsScreen /></PantryProvider>,
    );

    expect(await screen.findByText('No recipes were found for your urgent pantry foods.')).toBeTruthy();
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
      <PantryProvider><RecipeSuggestionsScreen /></PantryProvider>,
    );

    const label = await screen.findByText('Chicken Breasts');
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
      const isMilk = String(input).includes('Milk');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          meals: [{
            idMeal: isMilk ? 'milk-recipe' : 'chicken-recipe',
            strMeal: isMilk ? 'Milk pudding' : 'Chicken curry',
            strMealThumb: null,
          }],
        }),
      } as Response;
    });
    const screen = await render(
      <PantryProvider><RecipeSuggestionsScreen /></PantryProvider>,
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
});
