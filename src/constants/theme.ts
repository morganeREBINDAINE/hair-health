import { Platform } from 'react-native';

/**
 * Design system « Organic Vitality » — importé du projet Google Stitch
 * « Suivi Santé & Cheveux ». Toutes les couleurs, rayons, ombres et styles
 * typographiques des écrans en découlent.
 */
export const Palette = {
  // Canvas & surfaces
  canvas: '#F3F6F2',
  surface: '#F7FAF6',
  card: '#FFFFFF',
  cardCream: '#FAFBF9',
  containerLow: '#F1F4F0',
  container: '#ECEFEB',
  containerHigh: '#E6E9E5',
  containerHighest: '#E0E3DF',

  // Texte
  text: '#121614',
  textVariant: '#414A37',
  textMuted: '#7E8680',
  outline: '#717A65',
  outlineVariant: '#C0CAB2',

  // Obsidienne (cartes sombres, boutons principaux)
  obsidian: '#191D1A',
  obsidianText: '#EEF2EE',
  obsidianMuted: 'rgba(238,242,238,0.65)',

  // Primaire — vert vitalité
  lime: '#8EE341',
  limeSoft: 'rgba(142,227,65,0.22)',
  limeFixed: '#A2F955',
  limeDim: '#88DC3A',
  primary: '#386B00',
  onLime: '#1D3A00',

  // Tertiaire — corail
  coral: '#FA6855',
  coralDeep: '#AD3124',
  coralSoft: '#FFDAD5',
  coralContainer: '#FFBDB3',
  onCoral: '#8C180F',

  // Accent chaud (jauge)
  amber: '#F39A38',
  amberSoft: '#FFF1DC',

  // Cycle menstruel
  raspberry: '#B83568',
  raspberrySoft: '#FBE3EC',
  menstrual: '#D32F2F',
  menstrualDeep: '#9A1B1B',

  error: '#BA1A1A',
} as const;

/** Couleurs des catégories d'événements (calendrier, pastilles). */
export const CategoryColors = {
  blood: Palette.coralDeep,
  henna: '#C98A1A',
  wash: '#3E8E7E',
  stress: Palette.coral,
  meds: Palette.primary,
  haircut: '#5B5F5B',
  sleep: '#5C6BC0',
  cycle: Palette.raspberry,
} as const;

// Compatibilité avec use-theme.ts
export const Colors = {
  light: Palette,
  dark: Palette,
} as const;

export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 28,
  xxl: 32,
  full: 9999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  gutter: 12,
  margin: 20,
} as const;

/** Niveaux d'élévation du design system. */
export const Elevation = {
  card: {
    shadowColor: Palette.obsidian,
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  dark: {
    shadowColor: Palette.obsidian,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  floating: {
    shadowColor: '#121614',
    shadowOpacity: 0.16,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
} as const;

export const FontFamily = {
  display: 'PlusJakartaSans_700Bold',
  displayExtra: 'PlusJakartaSans_800ExtraBold',
  headline: 'PlusJakartaSans_600SemiBold',
  label: 'PlusJakartaSans_600SemiBold',
  labelMedium: 'PlusJakartaSans_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

/** Échelle typographique (tokens Stitch). */
export const Type = {
  displayLg: { fontFamily: FontFamily.display, fontSize: 36, lineHeight: 42, letterSpacing: -0.8 },
  headlineLg: { fontFamily: FontFamily.headline, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  headlineMd: { fontFamily: FontFamily.headline, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  headlineSm: { fontFamily: FontFamily.headline, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  metric: { fontFamily: FontFamily.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  bodyLg: { fontFamily: FontFamily.body, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: FontFamily.body, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 16 },
  labelMd: { fontFamily: FontFamily.label, fontSize: 13, lineHeight: 18 },
  labelSm: { fontFamily: FontFamily.label, fontSize: 11, lineHeight: 14 },
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Espace à réserver en bas des écrans pour le dock de navigation flottant. */
export const DockClearance = 112;
export const MaxContentWidth = 640;
