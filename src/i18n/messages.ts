export const en = {
  appTitle: 'ZeroFoodWaste',
  screenTitle: 'Sample pantry layout',
  sampleNotice: 'These are examples only. Nothing here is saved to your pantry.',
  sampleHeading: 'Example foods',
  exampleTag: 'Example',
  showExamples: 'Show examples',
  hideExamples: 'Hide examples',
  emptyExamples: 'Examples are hidden. Show them to preview the list.',
  apple: 'Apples',
  milk: 'Milk',
  rice: 'Rice',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

export const es: Messages = {
  appTitle: 'ZeroFoodWaste',
  screenTitle: 'Ejemplo de despensa',
  sampleNotice: 'Estos son solo ejemplos. No se guarda nada en tu despensa.',
  sampleHeading: 'Alimentos de ejemplo',
  exampleTag: 'Ejemplo',
  showExamples: 'Mostrar ejemplos',
  hideExamples: 'Ocultar ejemplos',
  emptyExamples: 'Los ejemplos están ocultos. Muéstralos para ver la lista.',
  apple: 'Manzanas',
  milk: 'Leche',
  rice: 'Arroz',
};
