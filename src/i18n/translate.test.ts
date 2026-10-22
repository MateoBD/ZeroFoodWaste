import { createTranslator } from './translate';

describe('translations', () => {
  it('renders English, Spanish and Italian messages', () => {
    expect(createTranslator('en')('pantryTitle')).toBe('Your pantry');
    expect(createTranslator('es')('pantryTitle')).toBe('Tu despensa');
    expect(createTranslator('it')('pantryTitle')).toBe('La tua dispensa');
    expect(createTranslator('es')('addFood')).toBe('Añadir alimento');
    expect(createTranslator('en')('recipeIngredientHelpLabel')).toBe('About recipe ingredients');
    expect(createTranslator('es')('recipeIngredientHelpLabel')).toBe('Acerca de los ingredientes para recetas');
    expect(createTranslator('it')('recipeIngredientHelpLabel')).toBe('Informazioni sugli ingredienti per le ricette');
  });

  it('falls back to English for unsupported languages', () => {
    expect(createTranslator('sv')('addFood')).toBe('Add food');
    expect(createTranslator(null)('pantryEmpty')).toBe(
      'Your pantry is empty. Add a food to get started.',
    );
  });
});
