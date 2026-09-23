import { fireEvent, render } from '@testing-library/react-native';
import { useLocales } from 'expo-localization';

import { PantrySampleScreen } from './PantrySampleScreen';

jest.mock('expo-localization', () => ({ useLocales: jest.fn() }));
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual('react-native').FlatList,
}));

const mockUseLocales = useLocales as jest.Mock;

describe('PantrySampleScreen', () => {
  beforeEach(() => {
    mockUseLocales.mockReturnValue([{ languageCode: 'en' }]);
  });

  it('shows English examples and toggles them without persistence', async () => {
    const screen = await render(<PantrySampleScreen />);
    expect(screen.getByText('Sample pantry layout')).toBeTruthy();
    expect(screen.getByText('Apples')).toBeTruthy();
    expect(screen.getByText('Milk')).toBeTruthy();
    expect(screen.getByText('Rice')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Hide examples' }));
    expect(screen.queryByText('Apples')).toBeNull();
    expect(screen.getByText('Examples are hidden. Show them to preview the list.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Show examples' }));
    expect(screen.getByText('Apples')).toBeTruthy();
  });

  it('shows Spanish labels from the device language', async () => {
    mockUseLocales.mockReturnValue([{ languageCode: 'es' }]);
    const screen = await render(<PantrySampleScreen />);
    expect(screen.getByText('Ejemplo de despensa')).toBeTruthy();
    expect(screen.getByText('Manzanas')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar ejemplos' }));
    expect(screen.getByText('Los ejemplos están ocultos. Muéstralos para ver la lista.')).toBeTruthy();
  });
});
