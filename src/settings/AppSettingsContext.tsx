import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';

/** Represents a requested app appearance. */
export type ThemeMode = 'system' | 'light' | 'dark';

/** Represents a requested app language. */
export type LanguageMode = 'system' | 'en' | 'es' | 'it';

type AppSettings = {
  expirationAlertDays: number;
  expirationAlertsEnabled: boolean;
  themeMode: ThemeMode;
  languageMode: LanguageMode;
};

type StoredAppSettings = AppSettings & {
  version: 1 | 2;
};

type SettingsState = AppSettings & {
  ready: boolean;
  canPersist: boolean;
};

type AppSettingsValue = SettingsState & {
  setExpirationAlertDays: (days: number) => void;
  setExpirationAlertsEnabled: (enabled: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguageMode: (mode: LanguageMode) => void;
};

/** Identifies the device-local app preference record. */
export const APP_SETTINGS_STORAGE_KEY = '@zerofoodwaste/app-settings';

const DEFAULT_SETTINGS: AppSettings = {
  expirationAlertDays: 3,
  expirationAlertsEnabled: false,
  themeMode: 'system',
  languageMode: 'system',
};

const DEFAULT_CONTEXT: AppSettingsValue = {
  ...DEFAULT_SETTINGS,
  ready: true,
  canPersist: false,
  setThemeMode: () => undefined,
  setLanguageMode: () => undefined,
  setExpirationAlertDays: () => undefined,
  setExpirationAlertsEnabled: () => undefined,
};

const AppSettingsContext = createContext<AppSettingsValue>(DEFAULT_CONTEXT);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

function isLanguageMode(value: unknown): value is LanguageMode {
  return value === 'system' || value === 'en' || value === 'es' || value === 'it';
}

function isExpirationAlertDays(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7;
}

/**
 * Decodes saved preferences, returning null for malformed or unsupported data.
 *
 * @param raw - The stored JSON value, or null when no preference exists.
 * @returns Valid app preferences, defaults for a missing value, or null when invalid.
 */
export function decodeAppSettings(raw: string | null): AppSettings | null {
  if (raw === null) return DEFAULT_SETTINGS;
  try {
    const stored: unknown = JSON.parse(raw);
    if (typeof stored !== 'object' || stored === null) return null;
    const value = stored as Partial<StoredAppSettings>;
    if (value.version === 1 && isThemeMode(value.themeMode) && isLanguageMode(value.languageMode)) {
      return { ...DEFAULT_SETTINGS, themeMode: value.themeMode, languageMode: value.languageMode };
    }
    if (
      value.version !== 2
      || !isThemeMode(value.themeMode)
      || !isLanguageMode(value.languageMode)
      || typeof value.expirationAlertsEnabled !== 'boolean'
      || !isExpirationAlertDays(value.expirationAlertDays)
    ) return null;
    return {
      expirationAlertDays: value.expirationAlertDays,
      expirationAlertsEnabled: value.expirationAlertsEnabled,
      themeMode: value.themeMode,
      languageMode: value.languageMode,
    };
  } catch {
    return null;
  }
}

/**
 * Loads, shares, and persists user-selected appearance and language settings.
 *
 * @param props - Application routes that consume these preferences.
 * @returns The settings context provider.
 */
export function AppSettingsProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SettingsState>({ ...DEFAULT_SETTINGS, ready: false, canPersist: false });

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      try {
        const raw = await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY);
        const saved = decodeAppSettings(raw);
        if (active) {
          setState({
            ...(saved ?? DEFAULT_SETTINGS),
            ready: true,
            canPersist: raw === null || saved !== null,
          });
        }
      } catch {
        if (active) setState({ ...DEFAULT_SETTINGS, ready: true, canPersist: false });
      }
    }
    void loadSettings();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!state.ready || !state.canPersist) return;
    const saved: StoredAppSettings = {
      version: 2,
      expirationAlertDays: state.expirationAlertDays,
      expirationAlertsEnabled: state.expirationAlertsEnabled,
      themeMode: state.themeMode,
      languageMode: state.languageMode,
    };
    void AsyncStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(saved)).catch(() => undefined);
  }, [state]);

  function setThemeMode(themeMode: ThemeMode) {
    setState((current) => ({ ...current, themeMode, canPersist: true }));
  }

  function setLanguageMode(languageMode: LanguageMode) {
    setState((current) => ({ ...current, languageMode, canPersist: true }));
  }

  /**
   * Sets the number of days before expiration at which an alert is scheduled.
   *
   * @param expirationAlertDays - A threshold from one through seven days.
   * @returns Nothing; the updated preference is persisted by the provider.
   */
  function setExpirationAlertDays(expirationAlertDays: number) {
    if (!isExpirationAlertDays(expirationAlertDays)) return;
    setState((current) => ({ ...current, expirationAlertDays, canPersist: true }));
  }

  /**
   * Enables or disables scheduled expiration alerts.
   *
   * @param expirationAlertsEnabled - Whether native alerts should be active.
   * @returns Nothing; the updated preference is persisted by the provider.
   */
  function setExpirationAlertsEnabled(expirationAlertsEnabled: boolean) {
    setState((current) => ({ ...current, expirationAlertsEnabled, canPersist: true }));
  }

  return (
    <AppSettingsContext.Provider value={{
      ...state,
      setExpirationAlertDays,
      setExpirationAlertsEnabled,
      setThemeMode,
      setLanguageMode,
    }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

/**
 * Reads the selected app preferences.
 *
 * @returns The current appearance and language settings with update actions.
 */
export function useAppSettings(): AppSettingsValue {
  return useContext(AppSettingsContext);
}
