import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocales } from 'expo-localization';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { BarcodeScannerScreen } from './BarcodeScannerScreen';
import { PantryProvider } from './PantryContext';
import { ConnectedPantryScreen } from './PantryScreen';
import { calendarDateToLocalDate, localDateToCalendarDate } from './calendarDate';
import { PANTRY_STORAGE_KEY } from './pantryRepository';

let mockNavigate: (route: 'pantry' | 'scanner') => void = () => undefined;

jest.mock('expo-localization', () => ({ useLocales: jest.fn() }));
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn((path: string | { pathname: string }) => {
      if (path === '/scan-barcode') mockNavigate('scanner');
    }),
    back: jest.fn(() => mockNavigate('pantry')),
  },
}));
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn()],
}));
jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual('react');
  const { ScrollView, TextInput, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockBottomSheet({ children, onChange, ref }: { children: React.ReactNode; onChange?: (index: number) => void; ref?: React.Ref<unknown> }) {
      React.useImperativeHandle(ref, () => ({ snapToIndex: (index: number) => onChange?.(index) }));
      return <View>{children}</View>;
    },
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
    useBottomSheetTimingConfigs: (config: unknown) => config,
  };
});
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual('react-native').FlatList,
}));

const mockUseLocales = useLocales as jest.Mock;

function PantryTestApp() {
  const [route, setRoute] = useState<'pantry' | 'scanner'>('pantry');
  useEffect(() => {
    mockNavigate = setRoute;
    return () => { mockNavigate = () => undefined; };
  }, []);
  return (
    <PantryProvider>
      {route === 'pantry' ? <ConnectedPantryScreen /> : <BarcodeScannerScreen />}
    </PantryProvider>
  );
}

// Renders the screen and waits until stored items have loaded and adding is
// available.
async function renderLoadedPantry(addLabel = 'Add food') {
  const screen = await render(<PantryTestApp />);
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
    expect(screen.getByText('Scan a barcode or slide up to enter food manually.')).toBeTruthy();
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
    expect(screen.queryByLabelText('Food name')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));

    expect(screen.getByLabelText('Food name').props.value).toBe('');
    expect(screen.getByLabelText('Expiration date').props.value).toBe('');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('dismisses the modal and discards its draft', async () => {
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Bread');
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

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
    expect(screen.getByLabelText('Rice, Expires: 2999-10-15, Fresh, Quantity (units): 1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rice, Expires: 2999-10-15, Fresh, Quantity (units): 1' })).toBeTruthy();
  });

  it('lists food with the closest expiration date first, including newly added food', async () => {
    const screen = await renderLoadedPantry();

    await addFood(screen, 'Rice', '2999-10-20');
    await addFood(screen, 'Milk', '2999-10-10');
    await addFood(screen, 'Bread', '2999-10-15');

    const names = screen.getAllByText(/^(Rice|Milk|Bread)$/).map((node) => node.props.children);
    expect(names).toEqual(['Milk', 'Bread', 'Rice']);
  });

  it('opens all item actions from one row and closes the details modal', async () => {
    const screen = await renderLoadedPantry();
    await addFood(screen, 'Banana', '2999-10-15');

    expect(screen.queryByRole('button', { name: 'Mark consumed' })).toBeNull();
    await openDetails(screen, 'Banana');

    expect(screen.getByTestId('pantry-item-details-modal')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Banana' })).toBeTruthy();
    expect(screen.getByText('No recipe ingredient linked. Edit this food to choose one.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit food' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark consumed' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('pantry-item-details-modal')).toBeNull();
  });

  it('explains the optional recipe ingredient link on demand', async () => {
    const screen = await renderLoadedPantry();
    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));

    const helpButton = screen.getByRole('button', { name: 'About recipe ingredients' });
    expect(helpButton.props.accessibilityState).toEqual({ expanded: false });
    expect(screen.queryByText(/This optional link helps match your food to recipes/)).toBeNull();

    await fireEvent.press(helpButton);

    expect(screen.getByText(
      'This optional link helps match your food to recipes. Choose the closest ingredient in English; it does not change the food name. You can save without one.',
    )).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About recipe ingredients' }).props.accessibilityState)
      .toEqual({ expanded: true });

    await fireEvent.press(screen.getByRole('button', { name: 'About recipe ingredients' }));

    expect(screen.queryByText(/This optional link helps match your food to recipes/)).toBeNull();
    expect(screen.getByRole('button', { name: 'About recipe ingredients' }).props.accessibilityState)
      .toEqual({ expanded: false });
  });

  it('keeps the food name plain while linking a separately searched ingredient', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(ingredientCatalogueResponse([
      { id: '1', name: 'Chicken' },
      { id: '2', name: 'Chicken Stock' },
    ]));

    const screen = await renderLoadedPantry();
    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'chick');
    expect(screen.queryByLabelText('Ingredient suggestions')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Chicken' })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Choose a recipe ingredient'), 'chick');
    await fireEvent.press(await screen.findByRole('button', { name: 'Recipe ingredient: Chicken' }));
    expect(screen.getByLabelText('Food name').props.value).toBe('chick');
    expect(screen.getByText('Recipe ingredient: Chicken')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items[0];
      expect(stored.name).toBe('chick');
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
    await fireEvent.changeText(screen.getByLabelText('Choose a recipe ingredient'), 'ch');

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
    expect(screen.queryByLabelText('Ingredient suggestions')).toBeNull();
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

  it('preserves the independent recipe ingredient when an edited name changes', async () => {
    await storeLinkedChicken();

    const screen = await renderLoadedPantry();
    await openEdit(screen, 'Chicken');
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Chicken Soup');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items[0];
      expect(stored.recipeIngredient).toEqual({ provider: 'themealdb', id: '1', name: 'Chicken' });
    });
  });

  it('replaces a linked ingredient through the recipe field without changing the edited name', async () => {
    await storeLinkedChicken();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(ingredientCatalogueResponse([
      { id: '1', name: 'Chicken' },
      { id: '2', name: 'Milk' },
    ]));
    const screen = await renderLoadedPantry();

    await openEdit(screen, 'Chicken');
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Chicken soup');
    expect(screen.queryByRole('button', { name: 'Milk' })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Choose a recipe ingredient'), 'mi');
    await fireEvent.press(await screen.findByRole('button', { name: 'Recipe ingredient: Milk' }));
    expect(screen.getByText('Recipe ingredient: Milk')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items[0];
      expect(stored).toMatchObject({
        name: 'Chicken soup',
        recipeIngredient: { provider: 'themealdb', id: '2', name: 'Milk' },
      });
    });
  });

  it('shows matches when the recipe ingredient field is active', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(ingredientCatalogueResponse([
      { id: '1', name: 'Banana' },
    ]));
    const screen = await renderLoadedPantry();
    await addFood(screen, 'Banana', '2999-10-15');
    await openEdit(screen, 'Banana');

    expect(screen.getByText('No recipe ingredient linked. Search above to choose one.')).toBeTruthy();
    expect(screen.queryByLabelText('Ingredient suggestions')).toBeNull();
    await fireEvent(screen.getByLabelText('Food name'), 'focus');
    expect(screen.queryByRole('button', { name: 'Banana' })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Choose a recipe ingredient'), 'ban');
    await fireEvent.press(await screen.findByRole('button', { name: 'Recipe ingredient: Banana' }));
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

  it('does not reuse an outcome ID after the app restarts', async () => {
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify({
      version: 4,
      items: [{
        id: 'bread',
        name: 'Bread',
        recipeIngredient: null,
        expirationDate: '2999-10-10',
        createdAt: '2026-09-01T10:00:00.000Z',
        quantity: 1,
      }],
      events: [{
        id: 'pantry-action-1',
        pantryItemId: 'milk',
        itemName: 'Milk',
        outcome: 'consumed',
        amount: 1,
        occurredAt: '2026-09-02T10:00:00.000Z',
      }],
    }));
    const screen = await renderLoadedPantry();

    await openDetails(screen, 'Bread');
    await fireEvent.press(screen.getByRole('button', { name: 'Mark consumed' }));

    await waitFor(async () => {
      const document = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!);
      expect(document.events.map((event: { id: string }) => event.id)).toEqual([
        'pantry-action-1',
        'pantry-action-2',
      ]);
    });
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

    const screen = await render(<PantryTestApp />);

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

    const screen = await render(<PantryTestApp />);

    expect(screen.getByText('Loading your pantry…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add food' })).toBeNull();

    await act(async () => finishLoad(null));
    expect(await screen.findByRole('button', { name: 'Add food' })).toBeTruthy();
  });

  it('keeps damaged storage unchanged and blocks additions during load errors', async () => {
    const damaged = '{bad json';
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, damaged);
    const screen = await render(<PantryTestApp />);

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

  await addFood(screen, 'Bread', localDateToCalendarDate(new Date()));

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
    await addFood(screen, 'Bread', '2026-12-12');
    await addFood(screen, 'Milk', '2026-12-13');
    await addFood(screen, 'Rice', '2026-12-14');
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

  it('records thrown-away food and removes the event when undone', async () => {
    const screen = await renderLoadedPantry();
    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Yogurt');
    await fireEvent.changeText(screen.getByLabelText('Quantity (units)'), '3');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2026-12-12');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await openDetails(screen, 'Yogurt');
    await fireEvent.press(screen.getByRole('button', { name: 'Mark thrown away' }));
    expect(screen.getByRole('header', { name: 'Record all remaining units as wasted?' })).toBeTruthy();
    expect(screen.getByText('All 3 remaining units will be recorded as wasted.')).toBeTruthy();
    expect(screen.queryByText('Remove without history')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Waste 3 units' }));

    expect(screen.getByText('Food marked thrown away')).toBeTruthy();
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(PANTRY_STORAGE_KEY);
      expect(JSON.parse(raw!).events).toEqual([
        expect.objectContaining({ itemName: 'Yogurt', outcome: 'wasted', amount: 3 }),
      ]);
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(PANTRY_STORAGE_KEY);
      expect(JSON.parse(raw!).events).toEqual([]);
    });
    expect(screen.getByRole('button', { name: /Yogurt, Expires:.*Quantity \(units\): 3/ })).toBeTruthy();
  });

  it('keeps quantity controls in Edit and treats typing as an unreported correction', async () => {
    const screen = await renderLoadedPantry();
    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    expect(screen.queryByRole('button', { name: 'Consume one unit' })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Rice');
    await fireEvent.changeText(screen.getByLabelText('Quantity (units)'), '0');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert', { name: 'Enter a whole number of at least 1.' })).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Quantity (units)'), '3');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('button', { name: /Rice, Expires:.*Quantity \(units\): 3/ })).toBeTruthy();
    await openEdit(screen, 'Rice');
    expect(screen.getByText('Typing a number corrects the count without changing reports.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Consume one unit' }));
    expect(screen.getByText('Saving will record 1 unit consumed.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Quantity (units)'), '5');
    expect(screen.queryByText(/Saving will record/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(PANTRY_STORAGE_KEY);
      expect(JSON.parse(raw!).items[0].quantity).toBe(5);
      expect(JSON.parse(raw!).events).toEqual([]);
    });
  });

  it('records net Edit stepper decreases after additions offset earlier decreases', async () => {
    const screen = await renderLoadedPantry();
    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Rice');
    await fireEvent.changeText(screen.getByLabelText('Quantity (units)'), '5');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await openEdit(screen, 'Rice');
    await fireEvent.press(screen.getByRole('button', { name: 'Consume one unit' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Consume one unit' }));
    expect(screen.getByText('Saving will record 2 units consumed.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add one unit' }));
    expect(screen.getByText('Saving will record 1 unit consumed.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('button', { name: /Rice, Expires:.*Quantity \(units\): 4/ })).toBeTruthy();
    await waitFor(async () => {
      const document = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!);
      expect(document.events).toEqual([expect.objectContaining({ outcome: 'consumed', amount: 1 })]);
    });
  });

  it('chooses a partial consumed amount and Undo returns only that event amount', async () => {
    const screen = await renderLoadedPantry();
    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Rice');
    await fireEvent.changeText(screen.getByLabelText('Quantity (units)'), '5');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await openDetails(screen, 'Rice');
    await fireEvent.press(screen.getByRole('button', { name: 'Mark consumed' }));
    expect(screen.getByText('1 consumed · 4 remaining')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Consume one more unit' }));
    expect(screen.getByText('2 consumed · 3 remaining')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Consume 2 units' }));
    expect(screen.getByRole('button', { name: /Rice, Expires:.*Quantity \(units\): 3/ })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Rice, Expires:.*Quantity \(units\): 5/ })).toBeTruthy());
  });

  it('asks before an Edit saves zero and Cancel records nothing', async () => {
    const screen = await renderLoadedPantry();
    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Rice');
    await fireEvent.changeText(screen.getByLabelText('Quantity (units)'), '2');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await openEdit(screen, 'Rice');
    await fireEvent.changeText(screen.getByLabelText('Quantity (units)'), '0');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('header', { name: 'Record all saved units as consumed?' })).toBeTruthy();
    expect(screen.getByText('Saving will record all 2 units as consumed.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(async () => {
      const document = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!);
      expect(document.items[0].quantity).toBe(2);
      expect(document.events).toEqual([]);
    });

    await openEdit(screen, 'Rice');
    await fireEvent.changeText(screen.getByLabelText('Quantity (units)'), '-1');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert', { name: 'Enter a whole number of 0 or more.' })).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Quantity (units)'), '0');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Consume all 2 units' }));
    await waitFor(async () => {
      const document = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!);
      expect(document.items).toEqual([]);
      expect(document.events).toEqual([
        expect.objectContaining({ outcome: 'consumed', amount: 2 }),
      ]);
    });
  });

  describe('expired food review', () => {
    function relativeCalendarDate(dayOffset: number) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      return localDateToCalendarDate(date);
    }

    async function storeItems(items: { id: string; name: string; expirationDate: string }[]) {
      await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify({
        version: 2,
        items: items.map((item) => ({
          ...item, recipeIngredient: null, createdAt: '2019-12-01T10:00:00.000Z',
        })),
      }));
    }

    it('does not show the banner for food expiring today', async () => {
      await storeItems([{ id: 'milk', name: 'Milk', expirationDate: relativeCalendarDate(0) }]);
      const screen = await renderLoadedPantry();

      expect(screen.getByRole('button', { name: /^Milk, Expires:/ })).toBeTruthy();
      expect(screen.queryByTestId('expired-items-banner')).toBeNull();
    });

    it('counts expired items in the banner', async () => {
      await storeItems([
        { id: 'bread', name: 'Bread', expirationDate: relativeCalendarDate(-1) },
        { id: 'eggs', name: 'Eggs', expirationDate: relativeCalendarDate(-5) },
        { id: 'milk', name: 'Milk', expirationDate: relativeCalendarDate(0) },
        { id: 'rice', name: 'Rice', expirationDate: '2999-10-15' },
      ]);
      const screen = await renderLoadedPantry();

      expect(screen.getByRole('button', { name: '2 items have expired' })).toBeTruthy();
    });

    it('uses the singular and Spanish banner copy', async () => {
      mockUseLocales.mockReturnValue([{ languageCode: 'es' }]);
      await storeItems([{ id: 'bread', name: 'Pan', expirationDate: relativeCalendarDate(-1) }]);
      const screen = await renderLoadedPantry('Añadir alimento');

      expect(screen.getByRole('button', { name: '1 alimento ha caducado' })).toBeTruthy();
    });

    it('records each answer as consumed or wasted and removes the item from the pantry', async () => {
      await storeItems([
        { id: 'bread', name: 'Bread', expirationDate: relativeCalendarDate(-1) },
        { id: 'eggs', name: 'Eggs', expirationDate: relativeCalendarDate(-5) },
        { id: 'rice', name: 'Rice', expirationDate: '2999-10-15' },
      ]);
      const screen = await renderLoadedPantry();
      await fireEvent.press(screen.getByRole('button', { name: '2 items have expired' }));

      expect(screen.getByRole('header', { name: 'Expired food' })).toBeTruthy();
      expect(screen.getByTestId('expired-item-bread')).toBeTruthy();
      expect(screen.getByTestId('expired-item-eggs')).toBeTruthy();
      expect(screen.queryByTestId('expired-item-rice')).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: 'I ate it: Bread' }));
      expect(screen.queryByTestId('expired-item-bread')).toBeNull();
      expect(screen.queryByRole('button', { name: /^Bread, Expires:/ })).toBeNull();
      expect(screen.getByRole('button', { name: '1 item has expired' })).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: 'I threw it away: Eggs' }));
      expect(screen.queryByTestId('expired-items-modal')).toBeNull();
      expect(screen.queryByTestId('expired-items-banner')).toBeNull();
      expect(screen.queryByRole('button', { name: /^Eggs, Expires:/ })).toBeNull();
      expect(screen.getByRole('button', { name: /^Rice, Expires:/ })).toBeTruthy();

      await waitFor(async () => {
        const events = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).events;
        expect(events).toEqual([
          expect.objectContaining({ pantryItemId: 'bread', itemName: 'Bread', outcome: 'consumed' }),
          expect.objectContaining({ pantryItemId: 'eggs', itemName: 'Eggs', outcome: 'wasted' }),
        ]);
        const items = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!).items;
        expect(items.map((item: { id: string }) => item.id)).toEqual(['rice']);
      });
    });

    it('keeps expired items in the pantry when the review is closed without an answer', async () => {
      await storeItems([{ id: 'bread', name: 'Bread', expirationDate: relativeCalendarDate(-1) }]);
      const screen = await renderLoadedPantry();
      await fireEvent.press(screen.getByRole('button', { name: '1 item has expired' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

      expect(screen.queryByTestId('expired-items-modal')).toBeNull();
      expect(screen.getByRole('button', { name: /^Bread, Expires:/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: '1 item has expired' })).toBeTruthy();
    });
  });
});
