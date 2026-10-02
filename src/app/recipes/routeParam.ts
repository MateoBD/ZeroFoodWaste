/**
 * Returns a single route parameter value when Expo Router supplies a string or string array.
 *
 * @param value - The parameter value supplied by Expo Router.
 * @returns One parameter value, or an empty string when the parameter is absent.
 */
export function readRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
