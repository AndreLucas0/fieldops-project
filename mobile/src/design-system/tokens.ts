/**
 * Tokens do design system do FieldOps.
 *
 * A paleta "industrial steel + safety amber" foi transposta do protótipo
 * (task-inspector-hub/src/styles.css), convertendo cada valor OKLCH para o
 * hex sRGB equivalente — o React Native não interpreta oklch().
 */

export const colors = {
  background: '#101419',
  foreground: '#eff2f5',

  surface: '#191f25',
  surface2: '#232a31',

  card: '#191f25',
  cardForeground: '#eff2f5',

  primary: '#f3a51b',
  primaryForeground: '#22150a',

  secondary: '#272f37',
  secondaryForeground: '#eceff2',

  muted: '#242a30',
  mutedForeground: '#989fa7',

  accent: '#00a5c3',
  accentForeground: '#050c13',

  destructive: '#ea3b48',
  destructiveForeground: '#f6f9fc',

  success: '#3bb974',
  successForeground: '#06150c',

  warning: '#eab532',
  warningForeground: '#1c1505',

  border: '#2f363d',
  input: '#2f363d',
  ring: '#f3a51b',
} as const;

/**
 * Superfícies com leve degradê, equivalentes à `--gradient-steel` e
 * `--gradient-amber` do protótipo. Usados com expo-linear-gradient.
 */
export const gradients = {
  steel: ['#1d252d', '#12171b'] as const,
  amber: ['#f7b828', '#ea8a18'] as const,
};

/**
 * Cor de fundo translúcida derivada da primária — substitui utilitários
 * como `bg-primary/15` do Tailwind, que não existem aqui.
 */
export const alpha = {
  primary15: 'rgba(243, 165, 27, 0.15)',
  primary25: 'rgba(243, 165, 27, 0.25)',
  destructive15: 'rgba(234, 59, 72, 0.15)',
  successs15: 'rgba(59, 185, 116, 0.15)',
  overlay: 'rgba(16, 20, 25, 0.85)',
} as const;

/** Escala de espaçamento em passos de 4px, como no Tailwind. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

/** `--radius: 0.75rem` = 12px, com as variações derivadas do protótipo. */
export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 999,
} as const;

export const fonts = {
  /** Barlow — texto corrido (`--font-sans`). */
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  /** Archivo — títulos (`--font-display`, aplicado a h1/h2/h3). */
  display: 'Archivo_700Bold',
  displayExtra: 'Archivo_800ExtraBold',
} as const;

export const fontSizes = {
  xxs: 11,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '4xl': 34,
} as const;

/** `--shadow-panel: 0 18px 40px -24px` — aproximado para as duas plataformas. */
export const shadows = {
  panel: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

/** Altura mínima de alvo de toque (docs/aplicativo-mobile.md §13.9). */
export const touchTarget = 44;
