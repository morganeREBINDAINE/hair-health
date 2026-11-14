import { ChevronRight, CircleStop, Droplet } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Palette } from '../../constants/theme';
import { frDate } from '../../lib/dates';
import { CyclePrediction, CycleStatus } from '../../types';
import { AppText, Badge, Card, IconCircle, type BadgeTone } from '../ui';
import { homeStyles } from './shared';

/**
 * État du cycle menstruel : règles en cours, prochaines règles, fenêtre attendue ou retard.
 * Règles en cours : fond rouge clair et bouton « Règles arrêtées ».
 */
export function CycleRow({
  status,
  prediction,
  onPress,
  onEndPeriod,
}: {
  status: CycleStatus;
  prediction: CyclePrediction | null;
  onPress: () => void;
  onEndPeriod: () => void;
}) {
  const range = (p: CyclePrediction) => `Entre le ${frDate(p.windowStart)} et le ${frDate(p.windowEnd)}`;
  const estimate = prediction?.isEstimate ? ' · estimation' : '';

  let title = 'Cycle menstruel';
  let subtitle = 'Déclare tes règles depuis le journal pour obtenir une prédiction';
  let badge: string | undefined;
  let tone: BadgeTone = 'neutral';
  switch (status.kind) {
    case 'ongoing':
      title = 'Règles en cours';
      subtitle = prediction ? `Prochaines vers le ${frDate(prediction.nextStart)}${estimate}` : '';
      badge = `Jour ${status.day}`;
      tone = 'light';
      break;
    case 'upcoming':
      title = `Prochaines règles vers le ${frDate(status.prediction.nextStart)}`;
      subtitle = `${range(status.prediction)}${estimate}`;
      badge = `Dans ${status.daysUntil} j`;
      tone = status.daysUntil <= 5 ? 'amber' : 'neutral';
      break;
    case 'window':
      title = 'Règles attendues';
      subtitle = `${range(status.prediction)}${estimate}`;
      badge = 'Fenêtre';
      tone = 'amber';
      break;
    case 'late':
      title = 'Règles en retard';
      subtitle = `Prévues le ${frDate(status.prediction.nextStart)}${estimate}`;
      badge = `Retard ${status.daysLate} j`;
      tone = 'coral';
      break;
  }

  const ongoing = status.kind === 'ongoing';

  return (
    // La carte n'est pas cliquable en bloc : le bouton « Règles arrêtées » reste atteignable au lecteur d'écran
    <Card style={[styles.card, ongoing && styles.ongoing]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={[title, subtitle, badge].filter(Boolean).join('. ')}
        accessibilityHint="Ouvre le journal du jour"
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
        <IconCircle
          icon={Droplet}
          size={48}
          bg={ongoing ? Palette.card : Palette.raspberrySoft}
          color={ongoing ? Palette.menstrual : Palette.raspberry}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="labelMd" style={homeStyles.itemTitle} numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="bodySm" color={ongoing ? Palette.textVariant : Palette.textMuted} numberOfLines={2}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {badge ? <Badge label={badge} tone={tone} /> : <ChevronRight size={20} color={Palette.text} />}
      </Pressable>

      {ongoing && (
        <Pressable
          onPress={onEndPeriod}
          accessibilityRole="button"
          accessibilityLabel="Règles arrêtées, saisir la date et l'heure de fin"
          style={({ pressed }) => [styles.endBtn, pressed && { opacity: 0.8 }]}>
          <CircleStop size={16} color={Palette.menstrualDeep} />
          <AppText variant="labelMd" color={Palette.menstrualDeep}>
            Règles arrêtées
          </AppText>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 24, gap: 12 },
  ongoing: { backgroundColor: Palette.menstrualSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: Palette.card,
  },
});
