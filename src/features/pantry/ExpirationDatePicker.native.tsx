import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { calendarDateToLocalDate, localDateToCalendarDate } from './calendarDate';

type ExpirationDatePickerProps = {
  onChange: (value: string) => void;
  value: string;
};

export function ExpirationDatePicker({ onChange, value }: ExpirationDatePickerProps) {
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const t = useMessages();
  const scheme = useColorScheme();
  const { colors } = useTheme();
  const minimumDate = calendarDateToLocalDate(localDateToCalendarDate(new Date()))!;
  const parsedDate = calendarDateToLocalDate(value);
  const selectedDate = parsedDate && parsedDate >= minimumDate ? parsedDate : minimumDate;

  function handleOpen() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        display: 'default',
        minimumDate,
        mode: 'date',
        onValueChange: (_event, date) => onChange(localDateToCalendarDate(date)),
        value: selectedDate,
      });
      return;
    }

    setPendingDate(selectedDate);
  }

  function handleConfirm() {
    if (pendingDate) {
      onChange(localDateToCalendarDate(pendingDate));
    }
    setPendingDate(null);
  }

  return (
    <>
      <Pressable
        accessibilityLabel={t('chooseExpirationDate')}
        accessibilityRole="button"
        onPress={handleOpen}
        style={[
          styles.pickerButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <SymbolView
          name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
          size={24}
          tintColor={colors.accent}
        />
      </Pressable>
      <Modal
        animationType="slide"
        onRequestClose={() => setPendingDate(null)}
        presentationStyle="formSheet"
        visible={pendingDate !== null}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <AppText accessibilityRole="header" variant="title">
            {t('chooseExpirationDate')}
          </AppText>
          <DateTimePicker
            accentColor={colors.accent}
            display="inline"
            minimumDate={minimumDate}
            mode="date"
            onValueChange={(_event, date) => setPendingDate(date)}
            testID="expiration-date-picker"
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            value={pendingDate ?? selectedDate}
          />
          <View style={styles.actions}>
            <Button onPress={() => setPendingDate(null)} style={styles.action}>
              <ButtonText>{t('cancel')}</ButtonText>
            </Button>
            <Button onPress={handleConfirm} style={styles.action}>
              <ButtonText>{t('done')}</ButtonText>
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
