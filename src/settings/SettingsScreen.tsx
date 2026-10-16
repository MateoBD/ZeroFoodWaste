import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';

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
  testID: string;
};

/**
 * Renders accessible choices and marks the current value as selected.
 *
 * Choices remain disabled until saved preferences have loaded.
 * @typeParam Value - The preference value represented by each option.
 * @param props - The label, choices, selected value, readiness, and update action.
 * @returns A labeled group of accessible preference buttons.
 */
function PreferenceSelect<Value extends string>({
  label, onSelect, options, selected, ready, testID,
}: PreferenceGroupProps<Value>) {
  const { colors } = useTheme();
  const t = useMessages();
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === selected)!;

  return (
    <>
      <View style={styles.group}>
        <AppText accessibilityRole="header" style={styles.groupLabel}>{label}</AppText>
        <Pressable
          accessibilityLabel={`${label}: ${selectedOption.label}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={() => setIsOpen(true)}
          style={[styles.select, { backgroundColor: colors.surface, borderColor: colors.border }]}
          testID={testID}
        >
          <AppText numberOfLines={1} style={styles.selectedValue}>{selectedOption.label}</AppText>
          <View style={[styles.chevron, { borderColor: colors.mutedText }]} />
        </Pressable>
      </View>
      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel={t('close')}
            accessibilityRole="button"
            onPress={() => setIsOpen(false)}
            style={styles.backdrop}
          />
          <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText accessibilityRole="header" style={styles.groupLabel}>{label}</AppText>
            {options.map((option) => {
              const isSelected = selected === option.value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: !ready }}
                  disabled={!ready}
                  key={option.value}
                  onPress={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                  style={[
                    styles.menuOption,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.surface,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <AppText numberOfLines={1} style={{ color: isSelected ? colors.accentText : colors.text }}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
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
    { label: t('italianLanguage'), value: 'it' },
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
        <PreferenceSelect
          label={t('appearanceLabel')}
          onSelect={setThemeMode}
          options={themeOptions}
          ready={ready}
          selected={themeMode}
          testID="appearance-preference-button"
        />
        <PreferenceSelect
          label={t('languageLabel')}
          onSelect={setLanguageMode}
          options={languageOptions}
          ready={ready}
          selected={languageMode}
          testID="language-preference-button"
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
  select: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedValue: { flex: 1 },
  chevron: {
    width: 9,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginTop: -4,
    marginLeft: spacing.md,
  },
  modalRoot: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  menu: { gap: spacing.sm, borderWidth: 1, borderRadius: 8, padding: spacing.md },
  menuOption: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
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
  options: { flexDirection: 'row', gap: spacing.xs },
  dayOption: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
