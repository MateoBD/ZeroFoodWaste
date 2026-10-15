import AsyncStorage from '@react-native-async-storage/async-storage';

import { RECOMMENDATION_STORAGE_KEY, parseRecommendationCache, recommendationStorage } from './storage';

const detail = {
  id: '1', name: 'Soup', provider: 'themealdb', imageUrl: null,
  ingredients: [{ name: 'Chicken', measure: '1' }], instructions: 'Cook', sourceUrl: null,
};

describe('recommendation storage', () => {
  beforeEach(async () => AsyncStorage.clear());

  it('round trips verified recipes and searched ingredients', async () => {
    await recommendationStorage.save({
      fetchedAt: '2026-10-07T10:00:00.000Z', searchedIngredients: ['chicken'], details: [detail],
    });
    await expect(recommendationStorage.load()).resolves.toEqual({
      fetchedAt: '2026-10-07T10:00:00.000Z', searchedIngredients: ['chicken'], details: [detail],
    });
  });

  it('ignores corrupt and unsupported values', async () => {
    expect(parseRecommendationCache('{bad')).toBeNull();
    expect(parseRecommendationCache(JSON.stringify({ version: 2 }))).toBeNull();
    await AsyncStorage.setItem(RECOMMENDATION_STORAGE_KEY, JSON.stringify({ version: 1, fetchedAt: 'bad', searchedIngredients: [], details: [] }));
    await expect(recommendationStorage.load()).resolves.toBeNull();
  });
});
