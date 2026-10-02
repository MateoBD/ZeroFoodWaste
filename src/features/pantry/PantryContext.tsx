import { createContext, type PropsWithChildren, useContext } from 'react';

import { usePantryItems } from './usePantryItems';

/** Shared pantry state exposed to routes in both application tabs. */
export type PantryState = ReturnType<typeof usePantryItems>;

const PantryContext = createContext<PantryState | null>(null);

/**
 * Owns the device-local pantry state for the application route tree.
 *
 * @param props - Route content that needs to read or change the pantry.
 * @returns The pantry context provider.
 */
export function PantryProvider({ children }: PropsWithChildren) {
  const pantry = usePantryItems();
  return <PantryContext.Provider value={pantry}>{children}</PantryContext.Provider>;
}

/**
 * Reads the shared pantry state.
 *
 * @returns The pantry state and actions owned by PantryProvider.
 * @throws When called outside PantryProvider.
 */
export function usePantry(): PantryState {
  const pantry = useContext(PantryContext);
  if (!pantry) throw new Error('usePantry must be used inside PantryProvider');
  return pantry;
}
