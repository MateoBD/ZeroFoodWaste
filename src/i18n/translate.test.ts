import { createTranslator } from './translate';

describe('translations', () => {
  it('renders English and Spanish messages', () => {
    expect(createTranslator('en')('pantryTitle')).toBe('Your pantry');
    expect(createTranslator('es')('pantryTitle')).toBe('Tu despensa');
    expect(createTranslator('es')('addFood')).toBe('Añadir alimento');
  });

  it('falls back to English for unsupported languages', () => {
    expect(createTranslator('sv')('addFood')).toBe('Add food');
    expect(createTranslator(null)('pantryEmpty')).toBe(
      'Your pantry is empty. Add a food to get started.',
    );
  });
});
