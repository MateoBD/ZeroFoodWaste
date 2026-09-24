import { fireEvent, render } from '@testing-library/react-native';
import { useLocales } from 'expo-localization';

import { PantryScreen } from './PantryScreen';

jest.mock('expo-localization', () => ({ useLocales: jest.fn() }));
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual('react-native').FlatList,
}));

const mockUseLocales = useLocales as jest.Mock;

describe('PantryScreen', () => {
  beforeEach(() => {
    mockUseLocales.mockReturnValue([{ languageCode: 'en' }]);
  });

  it('shows the English session pantry copy and empty state', async () => {
    const screen = await render(<PantryScreen />);

    expect(screen.getByRole('header', { name: 'Session pantry' })).toBeTruthy();
    expect(
      screen.getByText(
        'Items are kept only for this session and disappear when the app restarts.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Your pantry is empty. Add a food to get started.')).toBeTruthy();
  });

  it('shows the Spanish pantry copy', async () => {
    mockUseLocales.mockReturnValue([{ languageCode: 'es' }]);

    const screen = await render(<PantryScreen />);

    expect(screen.getByRole('header', { name: 'Despensa de la sesión' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Añadir alimento' })).toBeTruthy();
    expect(
      screen.getByText('Tu despensa está vacía. Añade un alimento para empezar.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Añadir alimento' }));
    expect(screen.getByLabelText('Nombre del alimento')).toBeTruthy();
    expect(screen.getByLabelText('Fecha de caducidad')).toBeTruthy();
  });

  it('opens and cancels the form while discarding its draft', async () => {
    const screen = await render(<PantryScreen />);
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

  it('rejects a whitespace-only name with an announced error', async () => {
    const screen = await render(<PantryScreen />);

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
    const screen = await render(<PantryScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Bread');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    const error = screen.getByRole('alert');
    expect(error.props.accessibilityLiveRegion).toBe('assertive');
    expect(screen.getByText('Enter an expiration date.')).toBeTruthy();
  });

  it('rejects an invalid expiration date with an announced error', async () => {
    const screen = await render(<PantryScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Bread');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2026-02-31');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    const error = screen.getByRole('alert');
    expect(error.props.accessibilityLiveRegion).toBe('assertive');
    expect(screen.getByText('Enter a valid date (YYYY-MM-DD).')).toBeTruthy();
  });

  it('trims submitted values, displays expiration date, closes the form, and resets it', async () => {
    const screen = await render(<PantryScreen />);

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
    const screen = await render(<PantryScreen />);

    const entries = [
      { name: 'Bread', date: '2026-10-10' },
      { name: 'Milk', date: '2026-10-12' },
      { name: 'Bread', date: '2026-10-20' },
    ];

    for (const entry of entries) {
      await fireEvent.press(screen.getByRole('button', { name: 'Add food' }));
      await fireEvent.changeText(screen.getByLabelText('Food name'), entry.name);
      await fireEvent.changeText(screen.getByLabelText('Expiration date'), entry.date);
      await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    }

    expect(screen.getAllByText('Bread')).toHaveLength(2);
    expect(screen.getByText('Expires: 2026-10-10')).toBeTruthy();
    expect(screen.getByText('Expires: 2026-10-12')).toBeTruthy();
    expect(screen.getByText('Expires: 2026-10-20')).toBeTruthy();
    expect(screen.queryByText('Your pantry is empty. Add a food to get started.')).toBeNull();
  });
});
