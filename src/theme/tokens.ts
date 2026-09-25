export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

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
  },
} as const;
