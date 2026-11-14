import { ChartColumn, TriangleAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Palette, Radius, Type } from '../../constants/theme';
import type { WeekSummary } from '../../lib/dashboard';
import { DAY_LONG, dayShort, weekdayIndex } from '../../lib/dates';
import { DailyLog } from '../../types';
import { AppText, Badge, Card, SectionHeader } from '../ui';

const formatScore = (n: number) => n.toFixed(1).replace('.0', '').replace('.', ',');

/** 6.5 → « 6 h 30 », 7 → « 7 h ». */
function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** Les 7 derniers jours : chiffres clés, barres d'anxiété et constat du pic. */
export function WeekCard({ week, today, peakLog }: { week: WeekSummary; today: string; peakLog: DailyLog | undefined }) {
  const { days, peak, avgAnxiety, avgSleep, throatDays, conflictDays } = week;

  const stats = [
    { label: 'Anxiété moy.', value: avgAnxiety !== null ? `${formatScore(avgAnxiety)}/10` : '–' },
    { label: 'Sommeil moy.', value: avgSleep !== null ? formatHours(avgSleep) : '–' },
    { label: 'Boule gorge', value: `${throatDays} j` },
  ];

  const insight = peak
    ? `Pic émotionnel ${dayShort(peak.date).toLowerCase()}. (${peak.score}/10${peakLog?.conflictWithHusband ? ', dispute' : ''}${peakLog?.hairLossAmount != null ? `, chute ~${peakLog.hairLossAmount}` : ''
    })`
    : conflictDays > 0
      ? `${conflictDays} dispute${conflictDays > 1 ? 's' : ''} de couple cette semaine`
      : null;

  return (
    <Card style={{ gap: 16 }}>
      <SectionHeader icon={ChartColumn} title="Ma semaine" subtitle="Anxiété du jour, sur 10" right={<Badge label="7 jours" />} />

      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat} accessible accessibilityLabel={`${s.label} : ${s.value}`}>
            <AppText variant="labelSm" color={Palette.textMuted}>
              {s.label}
            </AppText>
            <AppText variant="headlineSm">{s.value}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.bars}>
        {days.map((d) => {
          const isPeak = peak?.date === d.date;
          const isToday = d.date === today;
          const h = d.score === null ? 44 : 44 + (d.score / 10) * 68;
          return (
            <View
              key={d.date}
              style={styles.barCol}
              accessible
              accessibilityLabel={`${DAY_LONG[weekdayIndex(d.date)]}${isToday ? ", aujourd'hui" : ''} : ${d.score !== null ? `${d.score} sur 10` : 'non noté'
                }${isPeak ? ', pic de la semaine' : ''}`}>
              <View
                style={[
                  styles.barTrack,
                  { height: h },
                  isPeak && styles.barPeak,
                  isToday && !isPeak && { backgroundColor: Palette.limeSoft },
                ]}>
                {d.score !== null && (
                  <AppText
                    variant="labelSm"
                    color={isPeak ? Palette.onCoral : Palette.textVariant}
                    style={{ fontFamily: Type.labelMd.fontFamily }}>
                    {d.score}
                  </AppText>
                )}
                <View
                  style={[
                    styles.barDot,
                    { backgroundColor: isPeak ? Palette.coralDeep : isToday ? Palette.primary : Palette.outlineVariant },
                    isPeak && styles.barDotPeak,
                  ]}
                />
              </View>
              <AppText
                variant="labelSm"
                color={isPeak ? Palette.coralDeep : isToday ? Palette.primary : Palette.textVariant}>
                {d.label}
              </AppText>
            </View>
          );
        })}
      </View>

      {insight && (
        <View style={styles.insightPill}>
          <TriangleAlert size={17} color={Palette.coralDeep} />
          <AppText variant="bodySm" color={Palette.textVariant} style={{ flex: 1 }}>
            {insight}
          </AppText>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 2, backgroundColor: Palette.containerLow, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 12 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingHorizontal: 2,
  },
  barCol: { alignItems: 'center', gap: 8 },
  barTrack: {
    width: 30,
    borderRadius: 15,
    backgroundColor: Palette.container,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  barPeak: {
    width: 34,
    borderRadius: 17,
    backgroundColor: Palette.coralContainer,
    shadowColor: Palette.coralDeep,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  barDot: { width: 10, height: 10, borderRadius: 5 },
  barDotPeak: { width: 14, height: 14, borderRadius: 7 },
  insightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.containerLow,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
