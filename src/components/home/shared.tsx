import { Pressable, StyleSheet, View } from 'react-native';
import { Palette } from '../../constants/theme';
import { AppText } from '../ui';

/** Section de l'accueil : titre, action ou badge à droite, puis contenu. */
export function HomeSection({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={[homeStyles.rowBetween, { paddingHorizontal: 4 }]}>
        <AppText variant="headlineSm" accessibilityRole="header" style={{ flexShrink: 1 }}>
          {title}
        </AppText>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Lien texte en haut à droite d'une section (« Tout voir »). */
export function SectionLink({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => pressed && { opacity: 0.6 }}>
      <AppText variant="labelMd" color={Palette.primary}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Phrase d'aide affichée quand un bloc n'a pas encore de données. */
export function EmptyHint({ text }: { text: string }) {
  return (
    <View style={homeStyles.empty}>
      <AppText variant="bodySm" color={Palette.textMuted} style={{ textAlign: 'center' }}>
        {text}
      </AppText>
    </View>
  );
}

export const homeStyles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inlineIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  /** Ligne d'élément : icône + titre + sous-titre + badge ou chevron. */
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 24 },
  itemTitle: { fontSize: 15 },
  empty: { paddingVertical: 20, paddingHorizontal: 12 },
});
