import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#1A1C1F',
    primaryLight: '#E8F5E9',
    background: '#E4E8DB',
    surface: '#FFFFFF',
    surfaceSubtle: '#F2F5EE',
    border: '#DDE4D8',
    text: '#1A1C1F',
    textSecondary: '#637064',
    textMuted: '#9BA89C',
    backgroundElement: '#EDF1E8',
    backgroundSelected: '#E0E6DA',

    darkCard: '#1A1C1F',
    darkCardText: '#FFFFFF',
    darkCardSub: '#9CA3AF',
    accentLime: '#A8D86A',
    accentLimeLight: '#E8F7D0',
    accentLimeText: '#2E5C12',
    badgeGoodBg: '#E4F5D2',
    badgeGoodText: '#2E5C12',

    hair: '#7C3AED',
    hairLight: '#F3E8FF',
    meds: '#10B981',
    medsLight: '#ECFDF5',
    anxiety: '#F97316',
    anxietyHigh: '#EF4444',
    anxietyLight: '#FFF7ED',
    conflict: '#E11D48',
    conflictLight: '#FFE4E6',
    blood: '#DC2626',
    bloodLight: '#FEF2F2',
    henna: '#D97706',
    hennaLight: '#FEF3C7',
    wash: '#06B6D4',
    washLight: '#ECFEFF',
    sleep: '#6366F1',
    sleepLight: '#EEF2FF',

    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
  dark: {
    primary: '#38BDF8',
    primaryLight: '#082F49',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceSubtle: '#334155',
    border: '#334155',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    backgroundElement: '#1E293B',
    backgroundSelected: '#334155',

    darkCard: '#1E293B',
    darkCardText: '#F8FAFC',
    darkCardSub: '#94A3B8',
    accentLime: '#A8D86A',
    accentLimeLight: '#1A2E0A',
    accentLimeText: '#A8D86A',
    badgeGoodBg: '#1A2E0A',
    badgeGoodText: '#A8D86A',

    hair: '#A78BFA',
    hairLight: '#2E1065',
    meds: '#34D399',
    medsLight: '#064E3B',
    anxiety: '#FB923C',
    anxietyHigh: '#F87171',
    anxietyLight: '#431407',
    conflict: '#FB7185',
    conflictLight: '#4C0519',
    blood: '#EF4444',
    bloodLight: '#450A0A',
    henna: '#FBBF24',
    hennaLight: '#451A03',
    wash: '#22D3EE',
    washLight: '#083344',
    sleep: '#818CF8',
    sleepLight: '#1E1B4B',

    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 30,
  xxl: 36,
  full: 9999,
} as const;

export const CardShadow = {
  shadowColor: '#1A2E14',
  shadowOpacity: 0.05,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 60, android: 75 }) ?? 60;
export const MaxContentWidth = 800;
