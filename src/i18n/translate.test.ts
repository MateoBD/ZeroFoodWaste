import { createTranslator } from './translate';

describe('translations', () => {
  it('renders English, Spanish and Italian messages', () => {
    expect(createTranslator('en')('pantryTitle')).toBe('Your pantry');
    expect(createTranslator('es')('pantryTitle')).toBe('Tu despensa');
    expect(createTranslator('it')('pantryTitle')).toBe('La tua dispensa');
    expect(createTranslator('es')('addFood')).toBe('Añadir alimento');
    expect(createTranslator('en')('savingWillRecordConsumed', { count: 2 }))
      .toBe('Saving will record 2 units consumed.');
    expect(createTranslator('es')('consumeOneUnit')).toBe('Consumir una unidad');
    expect(createTranslator('it')('addOneUnit')).toBe('Aggiungi un’unità');
  });

  it('falls back to English for unsupported languages', () => {
    expect(createTranslator('sv')('addFood')).toBe('Add food');
    expect(createTranslator(null)('pantryEmpty')).toBe(
      'Your pantry is empty. Add a food to get started.',
    );
  });
});
