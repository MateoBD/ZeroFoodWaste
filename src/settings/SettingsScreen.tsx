import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { useAppSettings, type LanguageMode, type ThemeMode } from './AppSettingsContext';
import {
  MAX_EXPIRATION_ALERT_DAYS,
  MIN_EXPIRATION_ALERT_DAYS,
  requestExpirationNotificationPermission,
  supportsExpirationNotifications,
} from '@/features/notifications/expirationNotifications';
/**
 * Defines one selectable value and its localized label.
 *
 * @typeParam Value - The preference value accepted by its setting.
 */
type PreferenceOption<Value extends string> = {
  label: string;
  value: Value;
};

/**
 * Describes a labeled group of mutually exclusive preference choices.
 *
 * @typeParam Value - The preference value accepted by the selection callback.
 */
type PreferenceGroupProps<Value extends string> = {
  label: string;
  onSelect: (value: Value) => void;
  options: PreferenceOption<Value>[];
  selected: Value;
  ready: boolean;
};

/**
 * Renders accessible choices and marks the current value as selected.
 *
 * Choices remain disabled until saved preferences have loaded.
 * @typeParam Value - The preference value represented by each option.
 * @param props - The label, choices, selected value, readiness, and update action.
 * @returns A labeled group of accessible preference buttons.
 */
function PreferenceGroup<Value extends string>({
  label, onSelect, options, selected, ready,
}: PreferenceGroupProps<Value>) {
  const { colors } = useTheme();

  return (
    <View style={styles.group}>
      <AppText accessibilityRole="header" style={styles.groupLabel}>{label}</AppText>
      <View style={styles.options}>
        {options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: !ready }}
              disabled={!ready}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? colors.accent : colors.surface,
                  borderColor: isSelected ? colors.accent : colors.border,
                },
              ]}
            >
              <AppText style={{ color: isSelected ? colors.accentText : colors.text }}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Displays persistent language and appearance controls in their own tab.
 *
 * @returns The accessible app settings screen.
 */
export function SettingsScreen() {
  const t = useMessages();
  const { colors } = useTheme();
  const {
    expirationAlertDays,
    expirationAlertsEnabled,
    languageMode,
    ready,
    setExpirationAlertDays,
    setExpirationAlertsEnabled,
    setLanguageMode,
    setThemeMode,
    themeMode,
  } = useAppSettings();

  const themeOptions: PreferenceOption<ThemeMode>[] = [
    { label: t('systemAppearance'), value: 'system' },
    { label: t('lightAppearance'), value: 'light' },
    { label: t('darkAppearance'), value: 'dark' },
  ];
  const languageOptions: PreferenceOption<LanguageMode>[] = [
    { label: t('automaticLanguage'), value: 'system' },
    { label: t('englishLanguage'), value: 'en' },
    { label: t('spanishLanguage'), value: 'es' },
  ];

  /**
   * Requests native permission before enabling expiration alerts.
   *
   * @returns A promise that resolves after the preference has been updated.
   */
  async function handleExpirationAlertsToggle() {
    if (expirationAlertsEnabled) {
      setExpirationAlertsEnabled(false);
      return;
    }
    if (!supportsExpirationNotifications()) return;
    const granted = await requestExpirationNotificationPermission();
    if (granted) setExpirationAlertsEnabled(true);
  }

  return (
    <View testID="settings-screen" style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText accessibilityRole="header" variant="title">{t('settingsTitle')}</AppText>
        <PreferenceGroup
          label={t('appearanceLabel')}
          onSelect={setThemeMode}
          options={themeOptions}
          ready={ready}
          selected={themeMode}
        />
        <PreferenceGroup
          label={t('languageLabel')}
          onSelect={setLanguageMode}
          options={languageOptions}
          ready={ready}
          selected={languageMode}
        />
        {supportsExpirationNotifications() ? (
          <View style={styles.group}>
            <AppText accessibilityRole="header" style={styles.groupLabel}>{t('expirationAlertsLabel')}</AppText>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: expirationAlertsEnabled, disabled: !ready }}
              disabled={!ready}
              onPress={() => { void handleExpirationAlertsToggle(); }}
              style={[styles.toggle, {
                backgroundColor: expirationAlertsEnabled ? colors.accent : colors.surface,
                borderColor: expirationAlertsEnabled ? colors.accent : colors.border,
              }]}
            >
              <AppText style={{ color: expirationAlertsEnabled ? colors.accentText : colors.text }}>
                {expirationAlertsEnabled ? t('expirationAlertsOn') : t('expirationAlertsOff')}
              </AppText>
            </Pressable>
            <AppText variant="muted">{t('expirationAlertsDescription')}</AppText>
            <View style={styles.options}>
              {Array.from({ length: MAX_EXPIRATION_ALERT_DAYS - MIN_EXPIRATION_ALERT_DAYS + 1 }, (_, index) => {
                const days = index + MIN_EXPIRATION_ALERT_DAYS;
                const selected = days === expirationAlertDays;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: !ready }}
                    disabled={!ready}
                    key={days}
                    onPress={() => setExpirationAlertDays(days)}
                    style={[styles.dayOption, {
                      backgroundColor: selected ? colors.accent : colors.surface,
                      borderColor: selected ? colors.accent : colors.border,
                    }]}
                  >
                    <AppText style={{ color: selected ? colors.accentText : colors.text }}>{days}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl },
  group: { gap: spacing.sm },
  groupLabel: { fontWeight: '700' },
  options: { flexDirection: 'row', gap: spacing.xs },
  option: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOption: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
