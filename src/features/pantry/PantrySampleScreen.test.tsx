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

  it('shows an empty state when there are no groceries', async () => {
    const screen = await render(<PantrySampleScreen />);
    expect(screen.getByText('Your pantry is empty')).toBeTruthy();
  });

  it('lets the user add a grocery item by name', async () => {
    const screen = await render(<PantrySampleScreen />);

    await fireEvent.press(screen.getByRole('button', { name: '+ Add food' }));
    await fireEvent.changeText(screen.getByPlaceholderText('Food name'), 'Bread');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Bread')).toBeTruthy();
    expect(screen.queryByText('Your pantry is empty')).toBeNull();
  });
});