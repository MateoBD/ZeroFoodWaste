import { SymbolView } from 'expo-symbols';
import { createElement, type ChangeEvent, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useMessages } from '@/i18n/useMessages';
import { useTheme } from '@/theme/useTheme';

import { isTodayOrFutureCalendarDate, localDateToCalendarDate } from './calendarDate';

type ExpirationDatePickerProps = {
  onChange: (value: string) => void;
  value: string;
};

export function ExpirationDatePicker({ onChange, value }: ExpirationDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useMessages();
  const { colors } = useTheme();
  const minimumDate = localDateToCalendarDate(new Date());

  function handleOpen() {
    const input = inputRef.current;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.click();
    }
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
      {createElement('input', {
        'aria-hidden': true,
        onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value),
        ref: inputRef,
        min: minimumDate,
        style: { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' },
        tabIndex: -1,
        type: 'date',
        value: isTodayOrFutureCalendarDate(value) ? value : minimumDate,
      })}
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
});
