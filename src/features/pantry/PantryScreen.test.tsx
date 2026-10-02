import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocales } from 'expo-localization';
import { router } from 'expo-router';
import { StyleSheet, TextInput } from 'react-native';

import { PantryScreen } from './PantryScreen';
import { calendarDateToLocalDate, localDateToCalendarDate } from './calendarDate';
import { PANTRY_STORAGE_KEY } from './pantryRepository';
import { colors } from '@/theme/tokens';

jest.mock('expo-localization', () => ({ useLocales: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual('react-native').FlatList,
}));

const mockUseLocales = useLocales as jest.Mock;

// Renders the screen and waits until stored items have loaded and adding is
// available.
async function renderLoadedPantry(addLabel = 'Add food') {
  const screen = await render(<PantryScreen />);
  await screen.findByRole('button', { name: addLabel });
  return screen;
}

async function addFood(
  screen: Awaited<ReturnType<typeof render>>,
  name: string,
  expirationDate: string,
) {
  await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
  await fireEvent.changeText(screen.getByLabelText('Food name'), name);
  await fireEvent.changeText(screen.getByLabelText('Expiration date'), expirationDate);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
}

async function openDetails(screen: Awaited<ReturnType<typeof render>>, name: string) {
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${name}, (Expires|Caduca):`) }));
}

async function openEdit(screen: Awaited<ReturnType<typeof render>>, name: string, label = 'Edit food') {
  await openDetails(screen, name);
  await fireEvent.press(screen.getByRole('button', { name: label }));
}

function ingredientCatalogueResponse(
  ingredients: { id: string; name: string }[],
): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      meals: ingredients.map((ingredient) => ({
        idIngredient: ingredient.id,
        strIngredient: ingredient.name,
      })),
    }),
  } as Response;
}

async function storeLinkedChicken() {
  await AsyncStorage.setItem(
    PANTRY_STORAGE_KEY,
    JSON.stringify({
      version: 2,
      items: [{
        id: 'item-1',
        name: 'Chicken',
        recipeIngredient: { provider: 'themealdb', id: '1', name: 'Chicken' },
        expirationDate: '2999-10-15',
        createdAt: '2026-09-01T10:00:00.000Z',
      }],
    }),
  );
}

describe('PantryScreen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUseLocales.mockReturnValue([{ languageCode: 'en' }]);
    await AsyncStorage.clear();
  });

  it('shows the English pantry copy and empty state', async () => {
    const screen = await renderLoadedPantry();

    expect(screen.getByRole('header', { name: 'Your pantry' })).toBeTruthy();
    expect(screen.getByText('Items are saved on this device.')).toBeTruthy();
    expect(screen.getByText('Your pantry is empty. Add a food to get started.')).toBeTruthy();
  });

  it('shows the Spanish pantry copy', async () => {
    mockUseLocales.mockReturnValue([{ languageCode: 'es' }]);

    const screen = await renderLoadedPantry('Añadir alimento');

    expect(screen.getByRole('header', { name: 'Tu despensa' })).toBeTruthy();
    expect(
      screen.getByText('Tu despensa está vacía. Añade un alimento para empezar.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Añadir alimento' }));
    expect(screen.getByLabelText('Nombre del alimento')).toBeTruthy();
    expect(screen.getByLabelText('Fecha de caducidad')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Nombre del alimento'), 'Pan');
    await fireEvent.changeText(screen.getByLabelText('Fecha de caducidad'), '2000-01-01');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText('Elige la fecha de hoy o una fecha futura.')).toBeTruthy();
  });

  it('opens and cancels the form while discarding its draft', async () => {
    const screen = await renderLoadedPantry();
    const addButton = screen.getByRole('button', { name: 'Add food' });

    expect(screen.getByText('+')).toBeTruthy();
    await fireEvent.press(addButton);
    const modal = screen.getByTestId('pantry-item-form-modal');
    expect(modal.props.presentationStyle).toBe('formSheet');
    expect(modal.props.allowSwipeDismissal).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Bread');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Bread')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Enter a food name.')).toBeTruthy();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await fireEvent.press(cancelButton);
    expect(screen.queryByTestId('pantry-item-form-modal')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));

    expect(screen.getByLabelText('Food name').props.value).toBe('');
    expect(screen.getByLabelText('Expiration date').props.value).toBe('');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('dismisses the modal and discards its draft', async () => {
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Bread');
    await fireEvent(screen.getByTestId('pantry-item-form-modal'), 'requestClose');

    expect(screen.queryByLabelText('Food name')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    expect(screen.getByLabelText('Food name').props.value).toBe('');
  });

  it('moves focus from the name field to the expiration field on Next', async () => {
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    const focusSpy = jest.mocked(TextInput.prototype.focus);
    focusSpy.mockClear();
    await fireEvent(screen.getByLabelText('Food name'), 'submitEditing');

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('rejects a whitespace-only name with an announced error', async () => {
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), '   ');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    const error = screen.getByRole('alert');
    expect(error.props.accessibilityLiveRegion).toBe('assertive');
    expect(screen.getByText('Enter a food name.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('rejects a missing expiration date with an announced error', async () => {
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Bread');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    const error = screen.getByRole('alert');
    expect(error.props.accessibilityLiveRegion).toBe('assertive');
    expect(screen.getByText('Enter an expiration date.')).toBeTruthy();
  });

  it('rejects an invalid expiration date with an announced error', async () => {
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Bread');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2026-02-31');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    const error = screen.getByRole('alert');
    expect(error.props.accessibilityLiveRegion).toBe('assertive');
    expect(screen.getByText('Enter a valid date (YYYY-MM-DD).')).toBeTruthy();
  });

  it('rejects a past expiration date with an announced error', async () => {
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Bread');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2000-01-01');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    const error = screen.getByRole('alert');
    expect(error.props.accessibilityLiveRegion).toBe('assertive');
    expect(screen.getByText('Choose today or a future date.')).toBeTruthy();
  });

  it('accepts the current local calendar date', async () => {
    const screen = await renderLoadedPantry();
    const today = localDateToCalendarDate(new Date());

    await addFood(screen, 'Bread', today);

    expect(screen.getByText('Bread')).toBeTruthy();
    expect(screen.getByText(`Expires: ${today}`)).toBeTruthy();
    expect(screen.getByTestId('expiration-badge-urgent')).toBeTruthy();
    expect(screen.getByText('Use today')).toBeTruthy();
  });

  it('shows a fresh badge in the list for food with plenty of time left', async () => {
    const screen = await renderLoadedPantry();

    await addFood(screen, 'Rice', '2999-10-15');

    expect(screen.getByTestId('expiration-badge-fresh')).toBeTruthy();
    expect(screen.getByText(/days left$/)).toBeTruthy();
    expect(screen.getByLabelText('Rice, Expires: 2999-10-15, Fresh')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rice, Expires: 2999-10-15, Fresh' })).toBeTruthy();
  });

  it('opens all item actions from one row and closes the details modal', async () => {
    const screen = await renderLoadedPantry();
    await addFood(screen, 'Banana', '2999-10-15');

    expect(screen.queryByRole('button', { name: 'Mark consumed' })).toBeNull();
    await openDetails(screen, 'Banana');

    expect(screen.getByTestId('pantry-item-details-modal')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Banana' })).toBeTruthy();
    expect(screen.getByText('No recipe ingredient linked. Edit the name to find a match.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit food' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark consumed' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('pantry-item-details-modal')).toBeNull();
  });

  it('suggests an English ingredient and persists its TheMealDB reference', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(ingredientCatalogueResponse([
      { id: '1', name: 'Chicken' },
      { id: '2', name: 'Chicken Stock' },
    ]));

    const screen = await renderLoadedPantry();
    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'chick');

    expect(await screen.findByLabelText('Ingredient suggestions')).toBeTruthy();
    const suggestion = screen.getByRole('button', { name: 'Chicken' });
    expect(suggestion.props.accessibilityRole).toBe('button');
    const highlights = screen.getAllByText('Chick');
    expect(highlights).toHaveLength(2);
    highlights.forEach((highlight) => {
      expect(StyleSheet.flatten(highlight.props.style)).toMatchObject({
        color: colors.light.accent,
        fontWeight: '700',
      });
    });

    await fireEvent.press(suggestion);
    expect(screen.getByLabelText('Food name').props.value).toBe('Chicken');
    expect(screen.getByText('Recipe ingredient: Chicken')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items[0];
      expect(stored.recipeIngredient).toEqual({ provider: 'themealdb', id: '1', name: 'Chicken' });
    });
  });

  it('shows a loading message while ingredient suggestions are pending', async () => {
    let resolveFetch!: (response: Response) => void;
    jest.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'ch');

    expect(await screen.findByText('Loading ingredient suggestions…')).toBeTruthy();
    await act(async () => resolveFetch(ingredientCatalogueResponse([])));
  });

  it('allows an unmatched manual food and stores no recipe reference', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(ingredientCatalogueResponse([
      { id: '2', name: 'Milk' },
    ]));
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Zucchini');
    expect(await screen.findByText(
      'No ingredient match found. You can still save this food.',
    )).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items[0];
      expect(stored.recipeIngredient).toBeNull();
    });
  });

  it('keeps manual save available when ingredient suggestions are unavailable', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Bread');
    expect(await screen.findByText(
      'Ingredient suggestions are unavailable. You can still save this food.',
    )).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items[0];
      expect(stored.recipeIngredient).toBeNull();
    });
  });

  it('preserves a linked ingredient when only its date is edited', async () => {
    await storeLinkedChicken();
    const screen = await renderLoadedPantry();

    await openEdit(screen, 'Chicken');
    expect(screen.getByText('Recipe ingredient: Chicken')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-20');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items[0];
      expect(stored).toMatchObject({
        expirationDate: '2999-10-20',
        recipeIngredient: { provider: 'themealdb', id: '1', name: 'Chicken' },
      });
    });
  });

  it('opens recipe results for a linked pantry ingredient', async () => {
    await storeLinkedChicken();
    const screen = await renderLoadedPantry();

    await openDetails(screen, 'Chicken');
    await fireEvent.press(screen.getByRole('button', { name: 'Find recipes: Chicken' }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/recipes/[ingredient]',
      params: { ingredient: 'Chicken' },
    });
  });

  it('clears the TheMealDB reference when an edited name changes', async () => {
    await storeLinkedChicken();

    const screen = await renderLoadedPantry();
    await openEdit(screen, 'Chicken');
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Chicken Soup');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items[0];
      expect(stored.recipeIngredient).toBeNull();
    });
  });

  it('replaces a linked ingredient after the edited name selects a new suggestion', async () => {
    await storeLinkedChicken();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(ingredientCatalogueResponse([
      { id: '1', name: 'Chicken' },
      { id: '2', name: 'Milk' },
    ]));
    const screen = await renderLoadedPantry();

    await openEdit(screen, 'Chicken');
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'mi');
    await fireEvent.press(await screen.findByRole('button', { name: 'Milk' }));
    expect(screen.getByText('Recipe ingredient: Milk')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items[0];
      expect(stored).toMatchObject({
        name: 'Milk',
        recipeIngredient: { provider: 'themealdb', id: '2', name: 'Milk' },
      });
    });
  });

  it('shows matching suggestions only while the saved food name is active', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(ingredientCatalogueResponse([
      { id: '1', name: 'Banana' },
    ]));
    const screen = await renderLoadedPantry();
    await addFood(screen, 'Banana', '2999-10-15');
    await openEdit(screen, 'Banana');

    expect(screen.getByText('No recipe ingredient linked. Tap the food name to see suggestions.')).toBeTruthy();
    expect(screen.queryByLabelText('Ingredient suggestions')).toBeNull();
    await fireEvent(screen.getByLabelText('Food name'), 'focus');
    expect(await screen.findByRole('button', { name: 'Banana' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Banana' }));
    expect(screen.queryByLabelText('Ingredient suggestions')).toBeNull();
    expect(screen.getByText('Recipe ingredient: Banana')).toBeTruthy();
  });

  it('opens the picker at today and prevents earlier selections', async () => {
    const screen = await renderLoadedPantry();
    const today = localDateToCalendarDate(new Date());

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Choose expiration date' }));
    const picker = screen.getByTestId('expiration-date-picker');

    expect(localDateToCalendarDate(new Date(picker.props.minimumDate))).toBe(today);
    expect(localDateToCalendarDate(new Date(picker.props.date))).toBe(today);
    expect(picker.props.minimumDate).toBe(calendarDateToLocalDate(today)?.getTime());
  });

  it('keeps the typed expiration date when picker changes are cancelled', async () => {
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    const dateInput = screen.getByLabelText('Expiration date');
    await fireEvent.changeText(dateInput, '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Choose expiration date' }));
    await fireEvent(
      screen.getByTestId('expiration-date-picker'),
      'valueChange',
      { nativeEvent: { timestamp: 0, utcOffset: 0 } },
      new Date(2999, 9, 20, 12),
    );
    await fireEvent.press(screen.getByTestId('expiration-date-picker-cancel'));

    expect(screen.getByLabelText('Expiration date').props.value).toBe('2999-10-15');
    expect(screen.queryByTestId('expiration-date-picker')).toBeNull();
  });

  it('fills the expiration field from the date picker', async () => {
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Choose expiration date' }));
    const picker = screen.getByTestId('expiration-date-picker');
    await fireEvent(
      picker,
      'valueChange',
      { nativeEvent: { timestamp: 0, utcOffset: 0 } },
      new Date(2999, 9, 15, 12),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByLabelText('Expiration date').props.value).toBe('2999-10-15');
  });

  it('trims submitted values, displays expiration date, closes the form, and resets it', async () => {
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    const nameInput = screen.getByLabelText('Food name');
    const dateInput = screen.getByLabelText('Expiration date');
    await fireEvent.changeText(nameInput, '  Bread  ');
    await fireEvent.changeText(dateInput, '  2999-10-15  ');
    await fireEvent(dateInput, 'submitEditing');

    expect(screen.getByText('Bread')).toBeTruthy();
    expect(screen.getByText('Expires: 2999-10-15')).toBeTruthy();
    expect(screen.queryByLabelText('Food name')).toBeNull();
    expect(screen.queryByLabelText('Expiration date')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    expect(screen.getByLabelText('Food name').props.value).toBe('');
    expect(screen.getByLabelText('Expiration date').props.value).toBe('');
  });

  it('keeps multiple entries independently keyed, including duplicate names', async () => {
    const screen = await renderLoadedPantry();

    await addFood(screen, 'Bread', '2999-10-10');
    await addFood(screen, 'Milk', '2999-10-12');
    await addFood(screen, 'Bread', '2999-10-20');

    expect(screen.getAllByText('Bread')).toHaveLength(2);
    expect(screen.getByText('Expires: 2999-10-10')).toBeTruthy();
    expect(screen.getByText('Expires: 2999-10-12')).toBeTruthy();
    expect(screen.getByText('Expires: 2999-10-20')).toBeTruthy();
    expect(screen.queryByText('Your pantry is empty. Add a food to get started.')).toBeNull();
  });

  it('edits the selected item, preserves its ID, and persists the change', async () => {
    const screen = await renderLoadedPantry();
    await addFood(screen, 'Bread', '2999-10-10');
    const before = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items[0];

    await openEdit(screen, 'Bread');
    expect(screen.getByRole('header', { name: 'Edit food' })).toBeTruthy();
    expect(screen.getByLabelText('Food name').props.value).toBe('Bread');
    expect(screen.getByLabelText('Expiration date').props.value).toBe('2999-10-10');
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Whole wheat bread');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-20');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Whole wheat bread')).toBeTruthy();
    expect(screen.queryByText('Bread')).toBeNull();
    expect(screen.getByText('Food updated')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('undo-snackbar').props.style).overflow).toBe('hidden');
    expect(screen.getByTestId('undo-snackbar-timer-track')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('undo-snackbar-timer').props.style).transformOrigin)
      .toBe('left center');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
    await waitFor(async () => {
      const after = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items[0];
      expect(after).toMatchObject({ id: before.id, createdAt: before.createdAt, name: 'Whole wheat bread', expirationDate: '2999-10-20' });
    });
  });

  it('does not offer Undo or write storage for an unchanged edit', async () => {
    const screen = await renderLoadedPantry();
    await addFood(screen, 'Bread', '2999-10-10');
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1));
    await openEdit(screen, 'Bread');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.queryByTestId('undo-snackbar')).toBeNull();
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('allows a name-only edit when an existing package date has expired', async () => {
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify({
      version: 2, items: [{
        id: 'old-bread', name: 'Bread', recipeIngredient: null,
        expirationDate: '2020-01-01', createdAt: '2019-12-01T10:00:00.000Z',
      }],
    }));
    const screen = await renderLoadedPantry();
    await openEdit(screen, 'Bread');
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Old bread');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('button', { name: /Old bread, Expires: 2020-01-01/ })).toBeTruthy();
    expect(screen.queryByText('Choose today or a future date.')).toBeNull();
  });

  it('undoes an edit and persists the restored fields', async () => {
    const screen = await renderLoadedPantry();
    await addFood(screen, 'Bread', '2999-10-10');
    await openEdit(screen, 'Bread');
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Toast');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

    await waitFor(() => expect(screen.getByRole('button', { name: /^Bread, Expires:/ })).toBeTruthy());
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items;
      expect(stored.map((item: { name: string }) => item.name)).toEqual(['Bread']);
    });
  });

  it('undoes an earlier edit without discarding a later edit of the same item', async () => {
    const screen = await renderLoadedPantry();
    await addFood(screen, 'Bread', '2999-10-10');
    await openEdit(screen, 'Bread');
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Toast');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await openEdit(screen, 'Toast');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-20');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Bread, Expires: 2999-10-20/ })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Bread, Expires: 2999-10-10/ })).toBeTruthy());
  });

  it('replaces a failed save confirmation with a warning and keeps Undo available', async () => {
    const screen = await renderLoadedPantry();
    await addFood(screen, 'Bread', '2999-10-10');
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1));
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
    await openEdit(screen, 'Bread');
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Toast');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Could not save this change')).toBeTruthy();
    expect(screen.getByText(
      'Your latest change could not be saved on this device and may be lost when the app closes.',
    )).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Bread, Expires:/ })).toBeTruthy());
  });

  it('queues confirmations and gives each action its own timed Undo window', async () => {
    const screen = await renderLoadedPantry();
    await addFood(screen, 'Bread', '2999-10-10');
    await addFood(screen, 'Milk', '2999-10-11');
    await openEdit(screen, 'Bread');
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Toast');
    jest.useFakeTimers();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await openDetails(screen, 'Milk');
    await fireEvent.press(screen.getByRole('button', { name: 'Mark consumed' }));

    expect(screen.getByText('Food updated')).toBeTruthy();
    expect(screen.getByTestId('undo-snackbar-timer')).toBeTruthy();
    expect(screen.queryByText('Food marked consumed')).toBeNull();
    await act(async () => { jest.advanceTimersByTime(4000); });
    await act(async () => { jest.advanceTimersByTime(200); });
    expect(screen.getByText('Food marked consumed')).toBeTruthy();
    expect(screen.getByTestId('undo-snackbar-timer')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    await act(async () => { jest.advanceTimersByTime(200); });
    jest.useRealTimers();

    expect(screen.getByRole('button', { name: /^Milk, Expires:/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Toast, Expires:/ })).toBeTruthy();
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items;
      expect(stored.map((item: { name: string }) => item.name)).toEqual(['Toast', 'Milk']);
    });
  });

  it('discards edit drafts when canceled', async () => {
    const screen = await renderLoadedPantry();
    await addFood(screen, 'Bread', '2999-10-10');
    await openEdit(screen, 'Bread');
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Changed');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Bread')).toBeTruthy();
    expect(screen.queryByText('Changed')).toBeNull();
  });

  it('uses the Spanish edit label', async () => {
    mockUseLocales.mockReturnValue([{ languageCode: 'es' }]);
    const screen = await renderLoadedPantry('Añadir alimento');
    await fireEvent.press(screen.getByRole('button', { name: 'Añadir alimento' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre del alimento'), 'Pan');
    await fireEvent.changeText(screen.getByLabelText('Fecha de caducidad'), '2999-10-10');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    await openEdit(screen, 'Pan', 'Editar alimento');
    expect(screen.getByRole('header', { name: 'Editar alimento' })).toBeTruthy();
  });

  it('keeps saved items and expiration dates after the app restarts', async () => {
    const firstSession = await renderLoadedPantry();
    await addFood(firstSession, 'Bread', '2999-10-10');
    await addFood(firstSession, 'Milk', '2999-10-12');
    await waitFor(async () => {
      expect(JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items).toHaveLength(2);
    });
    await firstSession.unmount();

    const secondSession = await renderLoadedPantry();

    expect(secondSession.getByText('Bread')).toBeTruthy();
    expect(secondSession.getByText('Expires: 2999-10-10')).toBeTruthy();
    expect(secondSession.getByText('Milk')).toBeTruthy();
    expect(secondSession.getByText('Expires: 2999-10-12')).toBeTruthy();
  });

  it('saves rapid additions in order, even when the first write is delayed', async () => {
    const realSetItem = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
    let finishFirstWrite!: () => void;
    const firstWrite = new Promise<void>((resolve) => { finishFirstWrite = resolve; });
    jest.mocked(AsyncStorage.setItem).mockImplementationOnce(async (key, value) => {
      await firstWrite;
      await realSetItem(key, value);
    });
    const screen = await renderLoadedPantry();

    await addFood(screen, 'Bread', '2999-10-10');
    await addFood(screen, 'Milk', '2999-10-12');
    expect(screen.getByText('Bread')).toBeTruthy();
    expect(screen.getByText('Milk')).toBeTruthy();
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);

    finishFirstWrite();
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2));
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(PANTRY_STORAGE_KEY);
      expect(JSON.parse(raw!).items.map((item: { name: string }) => item.name)).toEqual(['Bread', 'Milk']);
    });
  });

  it('shows an error and retries when the pantry cannot be loaded', async () => {
    await AsyncStorage.setItem(
      PANTRY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        items: [
          {
            id: 'item-1',
            name: 'Rice',
            expirationDate: '2027-01-31',
            createdAt: '2026-09-01T10:00:00.000Z',
          },
        ],
      }),
    );
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk unavailable'));

    const screen = await render(<PantryScreen />);

    expect(await screen.findByText('Your pantry could not be loaded.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add food' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Rice')).toBeTruthy();
    expect(screen.getByText('Expires: 2027-01-31')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add food' })).toBeTruthy();
  });

  it('does not offer adding while the pantry is loading', async () => {
    let finishLoad!: (value: string | null) => void;
    jest.mocked(AsyncStorage.getItem).mockImplementationOnce(
      () => new Promise((resolve) => { finishLoad = resolve; }),
    );

    const screen = await render(<PantryScreen />);

    expect(screen.getByText('Loading your pantry…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add food' })).toBeNull();

    await act(async () => finishLoad(null));
    expect(await screen.findByRole('button', { name: 'Add food' })).toBeTruthy();
  });

  it('keeps damaged storage unchanged and blocks additions during load errors', async () => {
    const damaged = '{bad json';
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, damaged);
    const screen = await render(<PantryScreen />);

    expect(await screen.findByText('Your pantry could not be loaded.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add food' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Your pantry could not be loaded.')).toBeTruthy();
    expect(await AsyncStorage.getItem(PANTRY_STORAGE_KEY)).toBe(damaged);
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('announces when an added item cannot be saved', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
    const screen = await renderLoadedPantry();

    await addFood(screen, 'Bread', '2999-10-15');

    expect(screen.getByText('Bread')).toBeTruthy();
    expect(
      await screen.findByText(
        'Your latest change could not be saved on this device and may be lost when the app closes.',
      ),
    ).toBeTruthy();
  });

  it('clears the save warning after a later successful write', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
    const screen = await renderLoadedPantry();

    await addFood(screen, 'Bread', '2999-10-15');
    expect(await screen.findByText(
      'Your latest change could not be saved on this device and may be lost when the app closes.',
    )).toBeTruthy();
    await addFood(screen, 'Milk', '2999-10-16');

    await waitFor(() => expect(screen.queryByText(
      'Your latest change could not be saved on this device and may be lost when the app closes.',
    )).toBeNull());
    const raw = await AsyncStorage.getItem(PANTRY_STORAGE_KEY);
    expect(JSON.parse(raw!).items).toHaveLength(2);
  });
  it('removes an item and remembers the removal after reopening', async () => {
  const screen = await renderLoadedPantry();

  await addFood(screen, 'Bread', '2026-10-10');

  await openDetails(screen, 'Bread');
  await fireEvent.press(screen.getByRole('button', { name: 'Mark consumed' }));

  expect(screen.queryByText('Bread')).toBeNull();
  expect(screen.getByText('Your pantry is empty. Add a food to get started.')).toBeTruthy();

  await waitFor(async () => {
    const raw = await AsyncStorage.getItem(PANTRY_STORAGE_KEY);
    expect(JSON.parse(raw!).items).toHaveLength(0);
  });

  await screen.unmount();

  const reopenedScreen = await renderLoadedPantry();

  expect(reopenedScreen.getByText('Your pantry is empty. Add a food to get started.')).toBeTruthy();
  expect(reopenedScreen.queryByText('Bread')).toBeNull();
});

  it('undoes consumption and restores the item at its original position', async () => {
    const screen = await renderLoadedPantry();
    await addFood(screen, 'Bread', '2999-10-10');
    await addFood(screen, 'Milk', '2999-10-11');
    await addFood(screen, 'Rice', '2999-10-12');
    await waitFor(async () => {
      expect(JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items).toHaveLength(3);
    });
    const original = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items;
    await openDetails(screen, 'Milk');
    await fireEvent.press(screen.getByRole('button', { name: 'Mark consumed' }));

    expect(screen.getByText('Food marked consumed')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Milk, Expires:/ })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(async () => {
      expect(JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items).toEqual(original);
    });
    expect(screen.getByRole('button', { name: /^Milk, Expires:/ })).toBeTruthy();
  });
});
