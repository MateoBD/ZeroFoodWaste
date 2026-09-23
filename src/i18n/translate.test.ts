import { createTranslator } from './translate';

describe('sample translations', () => {
  it('renders English and Spanish messages', () => {
    expect(createTranslator('en')('screenTitle')).toBe('Sample pantry layout');
    expect(createTranslator('es')('screenTitle')).toBe('Ejemplo de despensa');
    expect(createTranslator('es')('apple')).toBe('Manzanas');
  });

  it('falls back to English for unsupported languages', () => {
    expect(createTranslator('sv')('showExamples')).toBe('Show examples');
    expect(createTranslator(null)('emptyExamples')).toBe(
      'Examples are hidden. Show them to preview the list.',
    );
  });
});
