/**
 * Defines the source English message catalogue and key set.
 */
export const en = {
  appTitle: 'ZeroFoodWaste',
  pantryTitle: 'Your pantry',
  storageNotice: 'Items are saved on this device.',
  pantryEmpty: 'Your pantry is empty. Add a food to get started.',
  pantryLoading: 'Loading your pantry…',
  pantryLoadError: 'Your pantry could not be loaded.',
  pantrySaveError: 'Your latest change could not be saved on this device and may be lost when the app closes.',
  retry: 'Try again',
  foodNameLabel: 'Food name',
  foodNamePlaceholder: 'Enter a food name',
  expirationDateLabel: 'Expiration date',
  expirationDatePlaceholder: 'YYYY-MM-DD',
  chooseExpirationDate: 'Choose expiration date',
  addFood: 'Add food',
  editFood: 'Edit food',
  editItem: 'Edit food',
  cancel: 'Cancel',
  done: 'Done',
  save: 'Save',
  foodNameRequired: 'Enter a food name.',
  ingredientSuggestionsLabel: 'Ingredient suggestions',
  ingredientSuggestionsTitle: 'Suggestions',
  ingredientSuggestionsLoading: 'Loading ingredient suggestions…',
  ingredientSuggestionsUnavailable: 'Ingredient suggestions are unavailable. You can still save this food.',
  ingredientSuggestionsEmpty: 'No ingredient match found. You can still save this food.',
  ingredientLinkedLabel: 'Recipe ingredient',
  expirationDateRequired: 'Enter an expiration date.',
  expirationDateInvalid: 'Enter a valid date (YYYY-MM-DD).',
  expirationDatePast: 'Choose today or a future date.',
  expiresLabel: 'Expires',
} as const;

/**
 * Represents the keys accepted by the typed translator.
 */
export type MessageKey = keyof typeof en;

/**
 * Represents a localized catalogue containing every English source key.
 */
export type Messages = Record<MessageKey, string>;

/**
 * Defines Spanish translations checked against every English message key.
 */
export const es: Messages = {
  appTitle: 'ZeroFoodWaste',
  pantryTitle: 'Tu despensa',
  storageNotice: 'Los alimentos se guardan en este dispositivo.',
  pantryEmpty: 'Tu despensa está vacía. Añade un alimento para empezar.',
  pantryLoading: 'Cargando tu despensa…',
  pantryLoadError: 'No se pudo cargar tu despensa.',
  pantrySaveError: 'Tu último cambio no se pudo guardar en este dispositivo y podría perderse al cerrar la aplicación.',
  retry: 'Reintentar',
  foodNameLabel: 'Nombre del alimento',
  foodNamePlaceholder: 'Introduce el nombre de un alimento',
  expirationDateLabel: 'Fecha de caducidad',
  expirationDatePlaceholder: 'AAAA-MM-DD',
  chooseExpirationDate: 'Elegir fecha de caducidad',
  addFood: 'Añadir alimento',
  editFood: 'Editar alimento',
  editItem: 'Editar alimento',
  cancel: 'Cancelar',
  done: 'Listo',
  save: 'Guardar',
  foodNameRequired: 'Introduce el nombre de un alimento.',
  ingredientSuggestionsLabel: 'Sugerencias de ingredientes',
  ingredientSuggestionsTitle: 'Sugerencias',
  ingredientSuggestionsLoading: 'Cargando sugerencias de ingredientes…',
  ingredientSuggestionsUnavailable: 'Las sugerencias no están disponibles. Puedes guardar este alimento igualmente.',
  ingredientSuggestionsEmpty: 'No se encontró ningún ingrediente. Puedes guardar este alimento igualmente.',
  ingredientLinkedLabel: 'Ingrediente para recetas',
  expirationDateRequired: 'Introduce una fecha de caducidad.',
  expirationDateInvalid: 'Introduce una fecha válida (AAAA-MM-DD).',
  expirationDatePast: 'Elige la fecha de hoy o una fecha futura.',
  expiresLabel: 'Caduca',
};
