import { SOON_MAX_DAYS } from '@/features/pantry/expirationUrgency';

/** Oldest expired package eligible for recommendations, inclusive. */
export const EXPIRED_WINDOW_DAYS = 7;
/** Last upcoming day counted as a priority match, inclusive. */
export const PRIORITY_MAX_DAYS = SOON_MAX_DAYS;
