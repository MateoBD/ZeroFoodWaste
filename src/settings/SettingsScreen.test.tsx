import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocales } from 'expo-localization';
import { StyleSheet } from 'react-native';

import { APP_SETTINGS_STORAGE_KEY, AppSettingsProvider } from './AppSettingsContext';
import { SettingsScreen } from './SettingsScreen';
import { colors } from '@/theme/tokens';

jest.mock('expo-localization', () => ({ useLocales: jest.fn() }));

const mockUseLocales = useLocales as jest.Mock;

describe('SettingsScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockUseLocales.mockReturnValue([{ languageCode: 'en' }]);
    await AsyncStorage.clear();
  });

  it('changes and persists the selected appearance and language', async () => {
    const screen = await render(
      <AppSettingsProvider><SettingsScreen /></AppSettingsProvider>,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dark' }).props.accessibilityState.disabled).toBe(false));

    await fireEvent.press(screen.getByRole('button', { name: 'Dark' }));
    expect(StyleSheet.flatten(screen.getByTestId('settings-screen').props.style))
      .toMatchObject({ backgroundColor: colors.dark.background });
    await fireEvent.press(screen.getByRole('button', { name: 'Spanish' }));
    expect(screen.getByRole('header', { name: 'Apariencia' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Idioma' })).toBeTruthy();

    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY))!);
      expect(stored).toMatchObject({ themeMode: 'dark', languageMode: 'es' });
    });
  });

  it('restores saved appearance and language when the screen loads', async () => {
    await AsyncStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify({
      version: 1,
      themeMode: 'dark',
      languageMode: 'es',
    }));
    const screen = await render(
      <AppSettingsProvider><SettingsScreen /></AppSettingsProvider>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Oscuro' }).props.accessibilityState.selected).toBe(true));
    expect(screen.getByRole('button', { name: 'Español' }).props.accessibilityState.selected).toBe(true);
    expect(StyleSheet.flatten(screen.getByTestId('settings-screen').props.style))
      .toMatchObject({ backgroundColor: colors.dark.background });
  });
});