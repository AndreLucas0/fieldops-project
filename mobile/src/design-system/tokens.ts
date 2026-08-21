/**
 * Tokens visuais do FieldOps.
 *
 * A paleta "industrial steel + safety amber" veio do protótipo: fundo escuro
 * de baixo brilho (uso em campo, sob sol ou em galpão) e âmbar de segurança
 * reservado à ação principal.
 */

export const colors = {
  background: '#101419',
  foreground: '#eff2f5',

  surface: '#191f25',
  surface2: '#232a31',

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
  warning: '#eab532',

  border: '#2f363d',
  input: '#2f363d',
  ring: '#f3a51b',
} as const;

/** Superfícies com leve degradê, usadas com expo-linear-gradient. */
export const gradients = {
  steel: ['#1d252d', '#12171b'] as const,
  amber: ['#f7b828', '#ea8a18'] as const,
};

/** Fundos translúcidos derivados das cores base (não há `bg-primary/15` aqui). */
export const alpha = {
  primary15: 'rgba(243, 165, 27, 0.15)',
  primary25: 'rgba(243, 165, 27, 0.25)',
  destructive15: 'rgba(234, 59, 72, 0.15)',
  success15: 'rgba(59, 185, 116, 0.15)',
  warning15: 'rgba(234, 181, 50, 0.15)',
} as const;

/** Escala de espaçamento em passos de 4px. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 999,
} as const;

export const fonts = {
  /** Barlow — texto corrido. */
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  /** Archivo — títulos. */
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
  '3xl': 28,
  '4xl': 34,
} as const;

export const shadows = {
  panel: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

/**
 * Alvo mínimo de toque — docs/aplicativo-mobile.md §13.9 exige botões
 * confortáveis para uso com luva.
 */
export const touchTarget = 48;
