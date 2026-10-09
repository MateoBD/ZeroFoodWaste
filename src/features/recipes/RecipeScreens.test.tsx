import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocales } from 'expo-localization';
import { router } from 'expo-router';

import { FavoriteRecipesProvider } from './favorites/FavoriteRecipesContext';
import { favoriteRecipeStorage } from './favorites/favoriteRecipeStorage';
import { RecipeDetailScreen } from './RecipeDetailScreen';
import { RecipeResultsScreen } from './RecipeResultsScreen';

jest.mock('expo-localization', () => ({ useLocales: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const mockUseLocales = useLocales as jest.Mock;

describe('recipe screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocales.mockReturnValue([{ languageCode: 'en' }]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows ingredient-search results and opens the selected recipe', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        meals: [{ idMeal: '52772', strMeal: 'Teriyaki Chicken', strMealThumb: null }],
      }),
    } as Response);

    const screen = await render(
      <FavoriteRecipesProvider><RecipeResultsScreen ingredient="Chicken" /></FavoriteRecipesProvider>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Teriyaki Chicken' })).toBeTruthy());
    const recipe = screen.getByRole('button', { name: 'Teriyaki Chicken' });
    expect(screen.getByText('Recipes for: Chicken')).toBeTruthy();
    await fireEvent.press(recipe);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/recipes/[ingredient]/[mealId]',
      params: { ingredient: 'Chicken', mealId: '52772' },
    });
  });

  it('shows the selected recipe ingredients and cooking instructions', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        meals: [{
          idMeal: '52772',
          strMeal: 'Teriyaki Chicken',
          strMealThumb: null,
          strInstructions: 'Bake for 30 minutes.',
          strSource: null,
          strIngredient1: 'Chicken',
          strMeasure1: '3 cups',
        }],
      }),
    } as Response);

    const screen = await render(
      <FavoriteRecipesProvider>
        <RecipeDetailScreen
          mealId="52772"
          pantryItems={[{
            id: 'item-1',
            name: 'Chicken',
            recipeIngredient: null,
            expirationDate: '2999-10-15',
            createdAt: '2026-09-01T10:00:00.000Z',
          }]}
        />
      </FavoriteRecipesProvider>,
    );

    await waitFor(() => expect(screen.getByRole('header', { name: 'Teriyaki Chicken' })).toBeTruthy());
    expect(screen.getByText('Ingredients')).toBeTruthy();
    expect(screen.getByText('3 cups Chicken')).toBeTruthy();
    expect(screen.getByTestId('expiration-badge-fresh')).toBeTruthy();
    expect(screen.getByText('Instructions')).toBeTruthy();
    expect(screen.getByText('Bake for 30 minutes.')).toBeTruthy();

    await fireEvent.press(await screen.findByRole('button', { name: 'Save to favorites: Teriyaki Chicken' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove from favorites: Teriyaki Chicken' })).toBeTruthy());
    await expect(favoriteRecipeStorage.load()).resolves.toEqual([
      { id: '52772', name: 'Teriyaki Chicken', imageUrl: null, provider: 'themealdb' },
    ]);

    await fireEvent.press(screen.getByRole('button', { name: 'Remove from favorites: Teriyaki Chicken' }));
    expect(screen.getByRole('button', { name: 'Save to favorites: Teriyaki Chicken' })).toBeTruthy();
    await expect(favoriteRecipeStorage.load()).resolves.toEqual([]);
  });
});
