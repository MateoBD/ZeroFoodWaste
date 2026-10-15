import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render } from '@testing-library/react-native';
import { useLocales } from 'expo-localization';
import { router } from 'expo-router';

import { FavoriteRecipesProvider } from './FavoriteRecipesContext';
import { FavoriteRecipesScreen } from './FavoriteRecipesScreen';
import { FAVORITE_RECIPES_STORAGE_KEY, parseFavoriteRecipes } from './favoriteRecipeStorage';

jest.mock('expo-localization', () => ({ useLocales: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual('react-native').FlatList,
}));

const mockUseLocales = useLocales as jest.Mock;

describe('FavoriteRecipesScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockUseLocales.mockReturnValue([{ languageCode: 'en' }]);
    await AsyncStorage.clear();
  });

  it('explains how to save a recipe when there are no favorites', async () => {
    const screen = await render(<FavoriteRecipesProvider><FavoriteRecipesScreen /></FavoriteRecipesProvider>);

    expect(await screen.findByText('No favorite recipes yet. Tap the heart on a recipe to save it.')).toBeTruthy();
  });

  it('lists saved favorites and opens the selected recipe', async () => {
    await AsyncStorage.setItem(FAVORITE_RECIPES_STORAGE_KEY, JSON.stringify({
      version: 1,
      recipes: [{ id: '52772', name: 'Teriyaki Chicken', imageUrl: null, provider: 'themealdb' }],
    }));
    const screen = await render(<FavoriteRecipesProvider><FavoriteRecipesScreen /></FavoriteRecipesProvider>);

    await fireEvent.press(await screen.findByRole('button', { name: 'Teriyaki Chicken' }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/recipes/[ingredient]/[mealId]',
      params: { ingredient: 'favorites', mealId: '52772' },
    });
  });

  it('ignores corrupt and unsupported saved favorites', () => {
    expect(parseFavoriteRecipes('{bad')).toEqual([]);
    expect(parseFavoriteRecipes(JSON.stringify({ version: 2, recipes: [] }))).toEqual([]);
    expect(parseFavoriteRecipes(JSON.stringify({ version: 1, recipes: [{ id: 1 }] }))).toEqual([]);
  });
});
