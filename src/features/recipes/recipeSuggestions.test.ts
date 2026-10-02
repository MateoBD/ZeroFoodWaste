import type { PantryItem } from '@/features/pantry/pantryItem';

import {
  combineRecipeSuggestions,
  matchPantryItemsToRecipeIngredient,
  selectEligiblePantryItems,
} from './recipeSuggestions';

const today = new Date(2026, 9, 2, 20, 30);

function pantryItem(
  id: string,
  name: string,
  expirationDate: string,
  ingredientName: string | null,
): PantryItem {
  return {
    id,
    name,
    expirationDate,
    createdAt: '2026-09-01T10:00:00.000Z',
    recipeIngredient: ingredientName
      ? { provider: 'themealdb', id: ingredientName.toLowerCase(), name: ingredientName }
      : null,
  };
}

describe('recipe suggestions', () => {
  it('selects seven recently expired days and the existing five-day upcoming window', () => {
    const items = [
      pantryItem('expired-8', 'Old', '2026-09-24', 'Old'),
      pantryItem('future-6', 'Later', '2026-10-08', 'Later'),
      pantryItem('manual', 'Manual', '2026-10-02', null),
      pantryItem('expired-7', 'Seven', '2026-09-25', 'Seven'),
      pantryItem('expired-1', 'Yesterday', '2026-10-01', 'Yesterday'),
      pantryItem('today', 'Today', '2026-10-02', 'Today'),
      pantryItem('five', 'Five', '2026-10-07', 'Five'),
    ];

    expect(selectEligiblePantryItems(items, today).map((item) => item.id)).toEqual([
      'expired-1', 'expired-7', 'today', 'five',
    ]);
  });

  it('shows a recipe once and retains every matching pantry package', () => {
    const [chicken, rice] = selectEligiblePantryItems([
      pantryItem('chicken', 'Chicken', '2026-10-01', 'Chicken'),
      pantryItem('rice', 'Rice', '2026-10-03', 'Rice'),
    ], today);
    const sharedRecipe = { id: '1', name: 'Chicken rice', imageUrl: null, provider: 'themealdb' };

    const suggestions = combineRecipeSuggestions([
      { pantryItem: chicken, recipes: [sharedRecipe] },
      { pantryItem: rice, recipes: [sharedRecipe] },
    ]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].matches.map((match) => match.id)).toEqual(['chicken', 'rice']);
  });

  it('matches explicit canonical links and exact normalized manual names', () => {
    const items = [
      pantryItem('linked', 'Chicken breast', '2026-10-03', 'Chicken'),
      pantryItem('manual', '  CHÍCKEN ', '2026-10-04', null),
      pantryItem('other', 'Chicken stock', '2026-10-05', null),
    ];

    expect(matchPantryItemsToRecipeIngredient('chicken', items).map((item) => item.id)).toEqual([
      'linked', 'manual',
    ]);
  });
});
