import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { UserRound, type LucideIcon } from 'lucide-react-native';
import { Palette, Radius, Elevation, Type, FontFamily, Spacing } from '../constants/theme';

// ─── Typographie ────────────────────────────────────────────────────────────

type TextVariant = keyof typeof Type;

export function AppText({
  variant = 'bodyMd',
  color = Palette.text,
  style,
  children,
  numberOfLines,
}: {
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[Type[variant], { color }, style]}>
      {children}
    </Text>
  );
}

// ─── En-tête d'écran (marque + titre + avatar) ──────────────────────────────

export function ScreenHeader({
  title,
  eyebrow = 'Vitalité Capillaire',
  right,
}: {
  title: string;
  eyebrow?: string;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerLeft}>
        <View style={styles.headerLogo}>
          <Image source={require('../../assets/images/logo.png')} style={{ width: 30, height: 30 }} contentFit="contain" />
        </View>
        <View>
          <AppText variant="labelSm" color={Palette.textMuted} style={styles.eyebrow}>
            {eyebrow}
          </AppText>
          <AppText variant="headlineSm">{title}</AppText>
        </View>
      </View>
      {right ?? (
        <View style={styles.avatar}>
          <UserRound size={17} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

// ─── Cartes ─────────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  dark,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
  onPress?: () => void;
}) {
  const base = [styles.card, dark ? styles.cardDark : null, style];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...base, pressed && { transform: [{ scale: 0.985 }] }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

// ─── Skeleton (chargement) ──────────────────────────────────────────────────

/** Bloc gris pulsant, à la place d'un contenu en cours de chargement. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = Radius.md,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [pulse] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityLabel="Chargement"
      style={[{ width, height, borderRadius: radius, backgroundColor: Palette.containerHighest, opacity: pulse }, style]}
    />
  );
}

/** Carte squelette : un titre et quelques lignes. */
export function SkeletonCard({ lines = 2, height, style }: { lines?: number; height?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Card style={[{ gap: 10 }, height ? { height } : null, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton width={40} height={40} radius={20} />
        <Skeleton width="55%" height={18} />
      </View>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height={12} />
      ))}
    </Card>
  );
}

// ─── Icône dans un cercle ───────────────────────────────────────────────────

export function IconCircle({
  icon: Icon,
  color = Palette.textVariant,
  bg = Palette.container,
  size = 40,
  iconSize,
}: {
  icon: LucideIcon;
  color?: string;
  bg?: string;
  size?: number;
  iconSize?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon size={iconSize ?? Math.round(size * 0.48)} color={color} />
    </View>
  );
}

// ─── Badges / puces de statut ───────────────────────────────────────────────

export type BadgeTone = 'lime' | 'limeSoft' | 'coral' | 'coralSoft' | 'neutral' | 'light' | 'dark' | 'amber';

const BADGE_TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  lime: { bg: Palette.lime, fg: Palette.onLime },
  limeSoft: { bg: Palette.limeSoft, fg: Palette.primary },
  coral: { bg: Palette.coral, fg: '#FFFFFF' },
  coralSoft: { bg: Palette.coralSoft, fg: Palette.onCoral },
  neutral: { bg: Palette.containerLow, fg: Palette.textVariant },
  light: { bg: '#FFFFFF', fg: Palette.obsidian },
  dark: { bg: Palette.obsidian, fg: '#FFFFFF' },
  amber: { bg: Palette.amberSoft, fg: '#8A4B00' },
};

export function Badge({
  label,
  tone = 'neutral',
  icon: Icon,
  dot,
  style,
}: {
  label: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = BADGE_TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      {dot && <View style={[styles.badgeDot, { backgroundColor: t.fg }]} />}
      {Icon && <Icon size={12} color={t.fg} />}
      <Text style={[Type.labelSm, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

// ─── Boutons pilule ─────────────────────────────────────────────────────────

export function PillButton({
  label,
  onPress,
  icon: Icon,
  variant = 'dark',
  loading,
  disabled,
  style,
  compact,
}: {
  label: string;
  onPress?: () => void;
  icon?: LucideIcon;
  variant?: 'dark' | 'lime' | 'ghost' | 'coral';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const palette = {
    dark: { bg: Palette.obsidian, fg: '#FFFFFF' },
    lime: { bg: Palette.lime, fg: Palette.obsidian },
    ghost: { bg: Palette.containerLow, fg: Palette.text },
    coral: { bg: Palette.coralSoft, fg: Palette.onCoral },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.pillBtn,
        compact && styles.pillBtnCompact,
        { backgroundColor: palette.bg },
        variant === 'dark' && Elevation.dark,
        (disabled || loading) && { opacity: 0.6 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {Icon && <Icon size={compact ? 16 : 19} color={palette.fg} />}
          <Text style={[compact ? Type.labelMd : styles.pillBtnText, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// ─── Puce sélectionnable ────────────────────────────────────────────────────

export function Chip({
  label,
  selected,
  onPress,
  icon: Icon,
  count,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  count?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const fg = selected ? '#FFFFFF' : Palette.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : styles.chipIdle,
        pressed && { transform: [{ scale: 0.96 }] },
        style,
      ]}>
      {Icon && <Icon size={14} color={selected ? Palette.lime : Palette.textMuted} />}
      <Text style={[Type.labelMd, { color: fg }]}>{label}</Text>
      {count !== undefined && (
        <View style={[styles.chipCount, { backgroundColor: selected ? Palette.lime : Palette.container }]}>
          <Text style={[Type.labelSm, { color: selected ? Palette.obsidian : Palette.textVariant }]}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Interrupteur pilule ────────────────────────────────────────────────────

export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={[styles.toggle, { backgroundColor: value ? Palette.lime : Palette.containerHighest }]}>
      <View style={[styles.toggleKnob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </Pressable>
  );
}

/** Ligne « icône + titre + sous-titre + interrupteur ». */
export function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  activeColor = Palette.primary,
  activeBg = Palette.limeSoft,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  activeColor?: string;
  activeBg?: string;
}) {
  return (
    <Pressable onPress={() => onValueChange(!value)} style={styles.toggleRow}>
      <IconCircle
        icon={icon}
        size={38}
        color={value ? activeColor : Palette.textMuted}
        bg={value ? activeBg : Palette.card}
      />
      <View style={{ flex: 1 }}>
        <AppText variant="labelMd">{title}</AppText>
        {subtitle ? (
          <AppText variant="bodySm" color={Palette.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Toggle value={value} onValueChange={onValueChange} />
    </Pressable>
  );
}

// ─── Titre de section ───────────────────────────────────────────────────────

export function SectionHeader({
  icon,
  title,
  subtitle,
  right,
  iconColor,
  iconBg,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        {icon && <IconCircle icon={icon} size={36} color={iconColor} bg={iconBg} />}
        <View style={{ flex: 1 }}>
          <AppText variant="headlineSm">{title}</AppText>
          {subtitle ? (
            <AppText variant="bodySm" color={Palette.textMuted}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      {right}
    </View>
  );
}

/** Contrôle segmenté pilule (ex. Oui / Non, 1 / 2 gél.). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
  size,
}: {
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'lg';
}) {
  const lg = size === 'lg';
  return (
    <View style={[styles.segmented, style]}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={[styles.segment, lg && styles.segmentLg, active && styles.segmentActive]}>
            <Text style={[lg ? Type.labelMd : Type.labelSm, { color: active ? '#FFFFFF' : Palette.textVariant }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Barre d'onglets illustrés : vignette ronde + libellé, onglet actif sur fond noir. Défile si trop large. */
export function ImageTabBar<T extends string>({
  options,
  value,
  onChange,
  style,
  contentContainerStyle,
}: {
  options: { id: T; label: string; image: number }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={[styles.imageTabs, contentContainerStyle]}
      accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.imageTab,
              active && styles.imageTabActive,
              pressed && !active && { opacity: 0.75 },
            ]}>
            <Image source={o.image} style={styles.imageTabThumb} contentFit="cover" transition={150} />
            <Text numberOfLines={1} style={[Type.labelMd, { color: active ? '#FFFFFF' : Palette.textVariant }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const inputStyle: TextStyle = {
  height: 52,
  borderRadius: Radius.full,
  backgroundColor: Palette.containerLow,
  paddingHorizontal: 20,
  fontFamily: FontFamily.body,
  fontSize: 15,
  color: Palette.text,
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.margin,
    paddingBottom: 12,
    backgroundColor: Palette.canvas,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.xl,
    padding: 20,
    ...Elevation.card,
  },
  cardDark: {
    backgroundColor: Palette.obsidian,
    ...Elevation.dark,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  pillBtn: {
    height: 54,
    borderRadius: Radius.full,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pillBtnCompact: { height: 40, paddingHorizontal: 16, gap: 6 },
  pillBtnText: { fontFamily: FontFamily.display, fontSize: 15, letterSpacing: -0.2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
  },
  chipIdle: { backgroundColor: Palette.card, ...Elevation.card, elevation: 1 },
  chipSelected: { backgroundColor: Palette.obsidian },
  chipCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.containerLow,
    borderRadius: Radius.lg,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Palette.container,
    borderRadius: Radius.full,
    padding: 3,
    gap: 2,
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  segmentLg: { paddingHorizontal: 18, paddingVertical: 10 },
  segmentActive: { backgroundColor: Palette.obsidian },
  // Marge verticale : laisse de la place à l'ombre des cartes, sinon rognée par le ScrollView
  imageTabs: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  imageTab: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 18,
    borderRadius: Radius.lg,
    backgroundColor: Palette.card,
    ...Elevation.card,
  },
  imageTabActive: { backgroundColor: Palette.obsidian, ...Elevation.dark },
  imageTabThumb: { width: 64, height: 64, borderRadius: Radius.full },
});
