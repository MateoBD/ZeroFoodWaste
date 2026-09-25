import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render } from '@testing-library/react-native';
import { useLocales } from 'expo-localization';
import { TextInput } from 'react-native';

import { PantryScreen } from './PantryScreen';
import { PANTRY_STORAGE_KEY } from './pantryRepository';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-localization', () => ({ useLocales: jest.fn() }));
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

describe('PantryScreen', () => {
  beforeEach(async () => {
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
  });

  it('opens and cancels the form while discarding its draft', async () => {
    const screen = await renderLoadedPantry();
    const addButton = screen.getByRole('button', { name: 'Add food' });

    expect(addButton.props.accessibilityState).toEqual({ expanded: false });
    await fireEvent.press(addButton);
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Bread');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2026-10-15');

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton.props.accessibilityState).toEqual({ expanded: true });
    await fireEvent.press(cancelButton);
    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));

    expect(screen.getByLabelText('Food name').props.value).toBe('');
    expect(screen.getByLabelText('Expiration date').props.value).toBe('');
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
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2026-10-15');
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

  it('trims submitted values, displays expiration date, closes the form, and resets it', async () => {
    const screen = await renderLoadedPantry();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    const nameInput = screen.getByLabelText('Food name');
    const dateInput = screen.getByLabelText('Expiration date');
    await fireEvent.changeText(nameInput, '  Bread  ');
    await fireEvent.changeText(dateInput, '  2026-10-15  ');
    await fireEvent(dateInput, 'submitEditing');

    expect(screen.getByText('Bread')).toBeTruthy();
    expect(screen.getByText('Expires: 2026-10-15')).toBeTruthy();
    expect(screen.queryByLabelText('Food name')).toBeNull();
    expect(screen.queryByLabelText('Expiration date')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    expect(screen.getByLabelText('Food name').props.value).toBe('');
    expect(screen.getByLabelText('Expiration date').props.value).toBe('');
  });

  it('keeps multiple entries independently keyed, including duplicate names', async () => {
    const screen = await renderLoadedPantry();

    await addFood(screen, 'Bread', '2026-10-10');
    await addFood(screen, 'Milk', '2026-10-12');
    await addFood(screen, 'Bread', '2026-10-20');

    expect(screen.getAllByText('Bread')).toHaveLength(2);
    expect(screen.getByText('Expires: 2026-10-10')).toBeTruthy();
    expect(screen.getByText('Expires: 2026-10-12')).toBeTruthy();
    expect(screen.getByText('Expires: 2026-10-20')).toBeTruthy();
    expect(screen.queryByText('Your pantry is empty. Add a food to get started.')).toBeNull();
  });

  it('keeps saved items and expiration dates after the app restarts', async () => {
    const firstSession = await renderLoadedPantry();
    await addFood(firstSession, 'Bread', '2026-10-10');
    await addFood(firstSession, 'Milk', '2026-10-12');
    await firstSession.unmount();

    const secondSession = await renderLoadedPantry();

    expect(secondSession.getByText('Bread')).toBeTruthy();
    expect(secondSession.getByText('Expires: 2026-10-10')).toBeTruthy();
    expect(secondSession.getByText('Milk')).toBeTruthy();
    expect(secondSession.getByText('Expires: 2026-10-12')).toBeTruthy();
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

  it('announces when an added item cannot be saved', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
    const screen = await renderLoadedPantry();

    await addFood(screen, 'Bread', '2026-10-15');

    expect(screen.getByText('Bread')).toBeTruthy();
    expect(
      await screen.findByText(
        'Your latest change could not be saved on this device and may be lost when the app closes.',
      ),
    ).toBeTruthy();
  });
});
