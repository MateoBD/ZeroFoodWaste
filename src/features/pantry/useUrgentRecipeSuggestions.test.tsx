import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { PantryItem } from './pantryItem';
import { useUrgentRecipeSuggestions } from './useUrgentRecipeSuggestions';

function pantryItem(
  id: string,
  expirationDate: string,
  ingredient: string | null,
): PantryItem {
  return {
    id,
    name: id,
    recipeIngredient: ingredient
      ? { provider: 'themealdb', id, name: ingredient }
      : null,
    expirationDate,
    createdAt: '2026-09-01T10:00:00.000Z',
  };
}

function SuggestionsProbe({ items }: { items: readonly PantryItem[] }) {
  const suggestions = useUrgentRecipeSuggestions(items);

  return (
    <>
      <Text testID="urgent-item">{suggestions.urgentItem?.id ?? 'none'}</Text>
      <Text testID="ingredient">{suggestions.ingredient?.name ?? 'none'}</Text>
      <Text testID="status">{suggestions.status}</Text>
    </>
  );
}

describe('useUrgentRecipeSuggestions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('automatically searches for the ingredient linked to the soonest-expiring item', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ meals: [] }),
    } as Response);
    const items = [
      pantryItem('later', '2026-10-20', 'Milk'),
      pantryItem('urgent', '2026-10-03', 'Chicken'),
    ];
    const screen = await render(<SuggestionsProbe items={items} />);

    expect(screen.getByTestId('urgent-item').props.children).toBe('urgent');
    expect(screen.getByTestId('ingredient').props.children).toBe('Chicken');
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'https://www.themealdb.com/api/json/v1/1/filter.php?i=Chicken',
      );
    });
  });

  it('does not search when the pantry has no items', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const screen = await render(<SuggestionsProbe items={[]} />);

    expect(screen.getByTestId('urgent-item').props.children).toBe('none');
    expect(screen.getByTestId('ingredient').props.children).toBe('none');
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('ready'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('searches the most urgent item by name when it has no linked ingredient', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ meals: [] }),
    } as Response);
    const screen = await render(<SuggestionsProbe items={[
      pantryItem('Zucchini', '2026-10-03', null),
      pantryItem('Chicken', '2026-10-20', 'Chicken'),
    ]} />);

    expect(screen.getByTestId('urgent-item').props.children).toBe('Zucchini');
    expect(screen.getByTestId('ingredient').props.children).toBe('none');
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('ready'));
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://www.themealdb.com/api/json/v1/1/filter.php?i=Zucchini',
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});