import type { MessageKey } from '@/i18n/messages';

export type SampleFood = Readonly<{ id: string; nameKey: MessageKey }>;

// Display-only examples. These are not pantry records and carry no expiry data.
export const sampleFoods: readonly SampleFood[] = [
  { id: 'sample-apple', nameKey: 'apple' },
  { id: 'sample-milk', nameKey: 'milk' },
  { id: 'sample-rice', nameKey: 'rice' },
];
