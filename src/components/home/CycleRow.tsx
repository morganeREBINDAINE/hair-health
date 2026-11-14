import { ChevronRight, Droplet } from 'lucide-react-native';
import { View } from 'react-native';
import { Palette } from '../../constants/theme';
import { frDate } from '../../lib/dates';
import { CyclePrediction, CycleStatus } from '../../types';
import { AppText, Badge, Card, IconCircle, type BadgeTone } from '../ui';
import { homeStyles } from './shared';

/** État du cycle menstruel : règles en cours, prochaines règles, fenêtre attendue ou retard. */
export function CycleRow({
  status,
  prediction,
  onPress,
}: {
  status: CycleStatus;
  prediction: CyclePrediction | null;
  onPress: () => void;
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
      tone = 'coralSoft';
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

  return (
    <Card
      onPress={onPress}
      style={homeStyles.itemRow}
      accessibilityLabel={[title, subtitle, badge].filter(Boolean).join('. ')}
      accessibilityHint="Ouvre le journal du jour">
      <IconCircle icon={Droplet} size={48} bg={Palette.raspberrySoft} color={Palette.raspberry} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="labelMd" style={homeStyles.itemTitle} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySm" color={Palette.textMuted} numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {badge ? <Badge label={badge} tone={tone} /> : <ChevronRight size={20} color={Palette.text} />}
    </Card>
  );
}
