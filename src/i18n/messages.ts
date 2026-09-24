export const en = {
  appTitle: 'ZeroFoodWaste',
  pantryTitle: 'Session pantry',
  sessionNotice: 'Items are kept only for this session and disappear when the app restarts.',
  pantryEmpty: 'Your pantry is empty. Add a food to get started.',
  foodNameLabel: 'Food name',
  foodNamePlaceholder: 'Enter a food name',
  addFood: 'Add food',
  cancel: 'Cancel',
  save: 'Save',
  foodNameRequired: 'Enter a food name.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

export const es: Messages = {
  appTitle: 'ZeroFoodWaste',
  pantryTitle: 'Despensa de la sesión',
  sessionNotice: 'Los alimentos se guardan solo durante esta sesión y desaparecen al reiniciar la aplicación.',
  pantryEmpty: 'Tu despensa está vacía. Añade un alimento para empezar.',
  foodNameLabel: 'Nombre del alimento',
  foodNamePlaceholder: 'Introduce el nombre de un alimento',
  addFood: 'Añadir alimento',
  cancel: 'Cancelar',
  save: 'Guardar',
  foodNameRequired: 'Introduce el nombre de un alimento.',
};
