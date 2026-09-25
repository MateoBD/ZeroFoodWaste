import AsyncStorage from '@react-native-async-storage/async-storage';

import { asyncStoragePantryRepository, PANTRY_STORAGE_KEY } from './pantryRepository';
import { parseStoredPantry } from './pantryStorageCodec';

const bread = {
  id: 'item-1',
  name: 'Bread',
  expirationDate: '2026-10-15',
  createdAt: '2026-09-01T10:00:00.000Z',
};

describe('parseStoredPantry', () => {
  it('returns an empty pantry when nothing is stored', () => {
    expect(parseStoredPantry(null)).toEqual([]);
  });

  it('reads items from the current storage format', () => {
    expect(parseStoredPantry(JSON.stringify({ version: 1, items: [bread] }))).toEqual([bread]);
  });

  it('rejects unreadable and unknown data', () => {
    expect(() => parseStoredPantry('not json')).toThrow();
    expect(() => parseStoredPantry(JSON.stringify([bread]))).toThrow();
    expect(() => parseStoredPantry(JSON.stringify({ version: 2, items: [bread] }))).toThrow();
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
});

describe('asyncStoragePantryRepository', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('preserves the original value when loading damaged data fails', async () => {
    const damaged = JSON.stringify({ version: 1, items: [{ ...bread, expirationDate: '2026-02-31' }] });
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, damaged);

    await expect(asyncStoragePantryRepository.loadItems()).rejects.toThrow();
    expect(await AsyncStorage.getItem(PANTRY_STORAGE_KEY)).toBe(damaged);
  });
});
