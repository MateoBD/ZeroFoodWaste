import AsyncStorage from '@react-native-async-storage/async-storage';

import { asyncStoragePantryRepository, PANTRY_STORAGE_KEY } from './pantryRepository';
import { PANTRY_EVENT_STORAGE_KEY } from './pantryEventRepository';
import {
  encodeStoredPantry,
  parseStoredPantry,
  parseStoredPantryDocument,
} from './pantryStorageCodec';

const bread = {
  id: 'item-1',
  name: 'Bread',
  recipeIngredient: null,
  expirationDate: '2026-10-15',
  createdAt: '2026-09-01T10:00:00.000Z',
  quantity: 1,
};

const legacyBread = {
  id: 'item-1',
  name: 'Bread',
  expirationDate: '2026-10-15',
  createdAt: '2026-09-01T10:00:00.000Z',
};

describe('parseStoredPantry', () => {
  it('returns an empty pantry when nothing is stored', () => {
    expect(parseStoredPantry(null)).toEqual([]);
  });

  it('migrates legacy items without a recipe reference', () => {
    expect(parseStoredPantry(JSON.stringify({ version: 1, items: [legacyBread] }))).toEqual([bread]);
  });

  it('migrates linked items from version 2', () => {
    const linkedBread = {
      ...bread,
      recipeIngredient: { provider: 'themealdb', id: '1', name: 'Bread' },
    };
    expect(parseStoredPantry(JSON.stringify({ version: 2, items: [{ ...linkedBread, quantity: undefined }] }))).toEqual([linkedBread]);
  });

  it('reads an explicit null reference from version 3', () => {
    expect(parseStoredPantry(JSON.stringify({ version: 3, items: [bread] }))).toEqual([bread]);
  });

  it('encodes linked and unlinked items with schema version 3', () => {
    const linkedBread = {
      ...bread,
      recipeIngredient: { provider: 'themealdb' as const, id: '1', name: 'Bread' },
    };

    expect(JSON.parse(encodeStoredPantry([bread, linkedBread]))).toEqual({
      version: 3,
      items: [bread, linkedBread],
    });
  });

  it('rejects unreadable and unknown data', () => {
    expect(() => parseStoredPantry('not json')).toThrow();
    expect(() => parseStoredPantry(JSON.stringify([bread]))).toThrow();
    expect(() => parseStoredPantry(JSON.stringify({ version: 4, items: [bread] }))).toThrow();
  });

  it('rejects an entire pantry with a malformed item or impossible calendar date', () => {
    const raw = JSON.stringify({
      version: 1,
      items: [
        bread,
        { ...bread, id: 'item-2', name: 42 },
        { ...bread, id: 'item-3', expirationDate: undefined },
        { ...bread, id: 'item-4', expirationDate: '2026-02-31' },
        null,
      ],
    });

    expect(() => parseStoredPantry(raw)).toThrow();
    expect(() => parseStoredPantry(JSON.stringify({ version: 1, items: [bread, bread] }))).toThrow();
    expect(parseStoredPantry(JSON.stringify({
      version: 1,
      items: [{ ...bread, expirationDate: '2028-02-29' }],
    }))).toHaveLength(1);
  });

  it('gives items from version 2 a default quantity of 1', () => {
    const stored = { ...bread, quantity: undefined };

    expect(parseStoredPantry(JSON.stringify({ version: 2, items: [stored] }))).toEqual([
      { ...bread, quantity: 1 },
    ]);
  });

  it('keeps the stored quantity in version 3', () => {
    const stored = { ...bread, quantity: 3 };
  
    expect(parseStoredPantry(JSON.stringify({ version: 3, items: [stored] }))).toEqual([stored]);
  });
  
  it.each([0, -1, 1.5, '2', null, undefined, Number.MAX_SAFE_INTEGER + 1])('rejects an invalid quantity (%s) in version 3', (quantity) => {
    expect(() =>
      parseStoredPantry(JSON.stringify({ version: 3, items: [{ ...bread, quantity }] })),
    ).toThrow();
  });

  it.each([
    ['missing reference', undefined],
    ['non-object reference', 'Chicken'],
    ['array reference', []],
    ['wrong provider', { provider: 'other', id: '1', name: 'Chicken' }],
    ['missing provider', { id: '1', name: 'Chicken' }],
    ['missing ID', { provider: 'themealdb', name: 'Chicken' }],
    ['blank ID', { provider: 'themealdb', id: '  ', name: 'Chicken' }],
    ['non-string ID', { provider: 'themealdb', id: 1, name: 'Chicken' }],
    ['missing name', { provider: 'themealdb', id: '1' }],
    ['blank name', { provider: 'themealdb', id: '1', name: '  ' }],
    ['non-string name', { provider: 'themealdb', id: '1', name: 42 }],
  ])('rejects a schema-v2 item with %s', (_label, recipeIngredient) => {
    expect(() => parseStoredPantry(JSON.stringify({
      version: 2,
      items: [{ ...bread, recipeIngredient }],
    }))).toThrow('Pantry storage contains an invalid item');
  });
});

describe('asyncStoragePantryRepository', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('preserves the original value when loading damaged data fails', async () => {
    const damaged = JSON.stringify({ version: 1, items: [{ ...bread, expirationDate: '2026-02-31' }] });
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, damaged);

    await expect(asyncStoragePantryRepository.load()).rejects.toThrow();
    expect(await AsyncStorage.getItem(PANTRY_STORAGE_KEY)).toBe(damaged);
  });

  it('saves pantry and history together in one schema-v4 document', async () => {
    await asyncStoragePantryRepository.save({ items: [bread], events: [] });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      PANTRY_STORAGE_KEY,
      JSON.stringify({ version: 4, items: [bread], events: [] }),
    );
  });

  it('migrates separate legacy documents and infers each event amount', async () => {
    const occurredAt = '2026-10-06T09:00:00.000Z';
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify({ version: 3, items: [bread] }));
    await AsyncStorage.setItem(PANTRY_EVENT_STORAGE_KEY, JSON.stringify({
      version: 3,
      events: [
        {
          id: 'with-snapshot', pantryItemId: 'old-bread', itemName: 'Old bread',
          outcome: 'consumed', occurredAt, itemSnapshot: { ...bread, id: 'old-bread', quantity: 4 },
        },
        {
          id: 'without-snapshot', pantryItemId: 'milk', itemName: 'Milk',
          outcome: 'wasted', occurredAt,
        },
      ],
    }));

    const document = await asyncStoragePantryRepository.load();

    expect(document.items).toEqual([bread]);
    expect(document.events.map((event) => event.amount)).toEqual([4, 1]);
  });

  it('rejects an incomplete combined document instead of discarding history', () => {
    expect(() => parseStoredPantryDocument(
      JSON.stringify({ version: 4, items: [bread] }),
      null,
    )).toThrow();
  });
});
