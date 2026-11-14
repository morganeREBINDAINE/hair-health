import { HeartCrack, Minus, Scissors, TrendingDown, TrendingUp } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Palette, Spacing } from '../../constants/theme';
import type { HairLossSummary } from '../../lib/dashboard';
import { daysBetween, frDate, relativeDays } from '../../lib/dates';
import { DailyLog } from '../../types';
import { AppText, Card, IconCircle } from '../ui';

/** Duo de cartes chiffrées : chute moyenne (carte principale) et dernière grosse dispute. */
export function KeyMetrics({
  hairLoss,
  lastConflict,
  today,
  onOpenConflict,
}: {
  hairLoss: HairLossSummary;
  lastConflict: DailyLog | undefined;
  today: string;
  onOpenConflict: (date: string) => void;
}) {
  return (
    <View style={styles.bento}>
      <HairLossMetric summary={hairLoss} />
      <ConflictMetric log={lastConflict} today={today} onOpen={onOpenConflict} />
    </View>
  );
}

function HairLossMetric({ summary }: { summary: HairLossSummary }) {
  const { avg, days, delta } = summary;
  const value = avg !== null ? `~${Math.round(avg)}` : '–';
  const daysLine = days > 0 ? `Sur ${days} jour${days > 1 ? 's' : ''} notés` : 'Aucune saisie sur 7 j';

  // Baisse = bonne nouvelle (vert), hausse = alerte (corail) ; le texte porte aussi le sens
  const trend =
    delta === null
      ? null
      : delta === 0
        ? { Icon: Minus, color: Palette.obsidianMuted, text: 'Stable vs sem. préc.' }
        : delta < 0
          ? { Icon: TrendingDown, color: Palette.limeDim, text: `−${-delta} vs sem. préc.` }
          : { Icon: TrendingUp, color: Palette.coralContainer, text: `+${delta} vs sem. préc.` };

  return (
    <Card
      dark
      style={styles.card}
      accessibilityLabel={`Chute estimée par jour sur 7 jours : ${avg !== null ? `environ ${Math.round(avg)} cheveux` : 'aucune donnée'}. ${daysLine}. ${trend?.text ?? ''}`}>
      <IconCircle icon={Scissors} bg="rgba(224,227,223,0.14)" color={Palette.limeFixed} size={36} />
      <View style={styles.body}>
        <AppText variant="labelSm" color={Palette.obsidianMuted}>
          Chute estimée / jour
        </AppText>
        <AppText variant="displayLg" color="#FFFFFF" style={styles.value}>
          {value}
        </AppText>
        <AppText variant="bodySm" color={Palette.obsidianMuted}>
          {daysLine}
        </AppText>
        {trend && (
          <View style={styles.trend}>
            <trend.Icon size={14} color={trend.color} />
            <AppText variant="bodySm" color={trend.color}>
              {trend.text}
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
}

function ConflictMetric({ log, today, onOpen }: { log: DailyLog | undefined; today: string; onOpen: (date: string) => void }) {
  const sameYear = log?.date.slice(0, 4) === today.slice(0, 4);
  // L'année n'est affichée que si la dispute date d'une autre année
  const dayMonth = log ? `${log.date.slice(8)}/${log.date.slice(5, 7)}` : '';
  const value = log ? (sameYear ? dayMonth : `${dayMonth}/${log.date.slice(2, 4)}`) : '–';
  const ago = log ? relativeDays(daysBetween(log.date, today)) : 'Aucune dispute notée';
  const note = log?.conflictNote?.trim();

  return (
    <Card
      style={styles.card}
      onPress={log ? () => onOpen(log.date) : undefined}
      accessibilityLabel={log ? `Dernière grosse dispute le ${frDate(log.date)}, ${ago.toLowerCase()}` : undefined}
      accessibilityHint={log ? 'Ouvre le journal de ce jour' : undefined}>
      <IconCircle icon={HeartCrack} bg={Palette.coralSoft} color={Palette.coralDeep} size={36} />
      <View style={styles.body}>
        <AppText variant="labelSm" color={Palette.textVariant}>
          Dernière grosse dispute
        </AppText>
        <AppText variant={sameYear || !log ? 'displayLg' : 'headlineLg'} style={styles.value} numberOfLines={1}>
          {value}
        </AppText>
        <AppText variant="bodySm" color={Palette.textMuted}>
          {ago}
        </AppText>
        {note ? (
          <AppText variant="bodySm" color={Palette.textVariant} numberOfLines={1} style={{ marginTop: 4, fontStyle: 'italic' }}>
            « {note} »
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  bento: { flexDirection: 'row', gap: Spacing.gutter },
  card: { flex: 1, padding: 16 },
  body: { marginTop: 20 },
  value: { marginTop: 2, marginBottom: 4 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
});
