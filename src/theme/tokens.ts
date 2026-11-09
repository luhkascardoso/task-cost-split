/**
 * Design tokens extraídos do Figma "Divisão de despesas" (variáveis do arquivo).
 * Fonte da verdade visual do app — não use valores hex/px soltos nas telas.
 * Ver docs/02-design-system.md.
 */

export const palette = {
  gray100: '#fafafa',
  gray200: '#e1e1e6',
  gray300: '#92929a',
  // Fora do Figma: tom de texto apagado com contraste WCAG ≥ 4.5:1 sobre gray800 (4,88:1)
  // e gray700 (4,64:1). O gray400 do Figma dava 2,79:1 e 2,65:1 (LUH-5).
  gray350: '#7e7e86',
  gray400: '#585860',
  gray500: '#2a2a2d',
  gray600: '#1c1c22',
  gray700: '#121216',
  gray800: '#0b0b0e',
  sectionSecondary: '#35353b',

  greenBase: '#30a65d',
  greenLight: '#71d697',

  successLight: '#41d0d8',
  successLow: '#0a2324',
  dangerLight: '#e77482',
  dangerLow: '#360f14',
  alertLight: '#deb55e',
  alertLow: '#281f0b',
} as const;

/** Cores semânticas — use estas nos componentes. */
export const colors = {
  background: palette.gray800, // fundo das telas
  surface: palette.gray700, // bottom nav, sheets
  card: palette.gray800,
  cardBorder: palette.gray600,
  input: palette.gray800,
  inputBorder: palette.gray600,
  avatar: palette.gray600,

  textPrimary: palette.gray100,
  textSecondary: palette.gray300,
  textMuted: palette.gray350,
  textOnBrand: palette.gray800,

  brand: palette.greenBase,
  brandLight: palette.greenLight,

  success: palette.successLight, // "Pago"
  successBg: palette.successLow,
  danger: palette.dangerLight, // "Pendente", excluir
  dangerBg: palette.dangerLow,
  alert: palette.alertLight, // "Parcial"
  alertBg: palette.alertLow,

  buttonSecondary: palette.gray600,
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  heading: 'Sora_700Bold',
  headingRegular: 'Sora_400Regular',
} as const;

/** Estilos de texto do Figma (lineHeight 1.5 → px absolutos, exigido pelo RN). */
export const typography = {
  headingLg: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26 },
  labelLg: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 30 },
  labelMd: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 },
  labelSm: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
  textMd: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  textSm: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  textXs: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Escala de espaçamento (múltiplos de 4, como no Figma). */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  sheet: 20, // doc-border-sm
  pill: 999,
} as const;

export const sizes = {
  screenGutter: 24,
  controlHeight: 48, // inputs e botões
  iconSm: 16,
  iconMd: 24,
  avatarSm: 28,
  avatarMd: 32,
  avatarLg: 42,
  tabBarHeight: 97,
} as const;
