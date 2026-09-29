type ExpirationDatePickerProps = {
  onChange: (value: string) => void;
  value: string;
};

/**
 * Renders the platform date picker and reports a local date-only value.
 *
 * @param props - The current value and callback that receives a YYYY-MM-DD date.
 * @returns The platform-specific date picker element.
 */
export function ExpirationDatePicker(props: ExpirationDatePickerProps): React.JSX.Element;
