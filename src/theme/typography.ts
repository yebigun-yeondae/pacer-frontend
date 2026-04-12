import { TextStyle } from 'react-native';

export const Fonts = {
  heading: 'System', // Will use system font; swap with custom if needed
  body: 'System',
  mono: 'System',
};

export const Typography: Record<string, TextStyle> = {
  h1: { fontSize: 36, fontWeight: '500', letterSpacing: -0.9 },
  h2: { fontSize: 30, fontWeight: '500', letterSpacing: -0.75 },
  h3: { fontSize: 24, fontWeight: '500', letterSpacing: -0.6 },
  h4: { fontSize: 18, fontWeight: '500' },
  body: { fontSize: 16, fontWeight: '400' },
  bodySmall: { fontSize: 14, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '500' },
  label: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1.1 },
  brand: { fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  brandSub: { fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
};
