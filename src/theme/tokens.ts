/**
 * Defines the shared spacing scale in points.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/**
 * Defines semantic colors for light and dark appearance.
 */
export const colors = {
  light: {
    background: '#F7F8F2',
    surface: '#FFFFFF',
    text: '#173026',
    mutedText: '#496156',
    border: '#C9D9CE',
    accent: '#176B42',
    accentText: '#FFFFFF',
    errorText: '#B42318',
    urgentBackground: '#FDE2E0',
    urgentText: '#8F1D14',
    soonBackground: '#FEF0C7',
    soonText: '#6B4300',
    freshBackground: '#DCF2E3',
    freshText: '#145A36',
  },
  dark: {
    background: '#101D17',
    surface: '#1D3025',
    text: '#F0F6EF',
    mutedText: '#BED3C2',
    border: '#476352',
    accent: '#A2E3B0',
    accentText: '#102618',
    errorText: '#FFB4AB',
    urgentBackground: '#5C1A16',
    urgentText: '#FFD7D2',
    soonBackground: '#4D3A0A',
    soonText: '#FFE8A3',
    freshBackground: '#1F4D33',
    freshText: '#C4F0D0',
  },
} as const;
