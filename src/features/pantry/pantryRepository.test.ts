import { parseStoredPantry } from './pantryRepository';

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

  it('treats unreadable or unknown data as an empty pantry', () => {
    expect(parseStoredPantry('not json')).toEqual([]);
    expect(parseStoredPantry(JSON.stringify([bread]))).toEqual([]);
    expect(parseStoredPantry(JSON.stringify({ version: 2, items: [bread] }))).toEqual([]);
  });

  it('skips malformed items and keeps valid ones', () => {
    const raw = JSON.stringify({
      version: 1,
      items: [
        bread,
        { ...bread, id: 'item-2', name: 42 },
        { ...bread, id: 'item-3', expirationDate: undefined },
        { ...bread, id: 'item-4', expirationDate: '15/10/2026' },
        null,
      ],
    });

    expect(parseStoredPantry(raw)).toEqual([bread]);
  });
});
