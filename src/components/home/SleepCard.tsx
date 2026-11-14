import { Moon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { FATIGUE_SUMMARY } from '../../constants/fatigue';
import { Palette, Radius, Type } from '../../constants/theme';
import type { SleepWeek } from '../../lib/dashboard';
import { DAY_LONG, weekdayIndex } from '../../lib/dates';
import { AppText, Badge, Card, SectionHeader } from '../ui';

/** Sous ce seuil, la nuit est mise en évidence (corail). */
const SHORT_NIGHT_HOURS = 6;
/** Hauteur de barre maximale atteinte à ce nombre d'heures. */
const MAX_BAR_HOURS = 10;

/** 6.5 → « 6 h 30 », 7 → « 7 h ». */
function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** 6.5 → « 6,5 » : valeur courte affichée dans la barre. */
const shortHours = (hours: number) => String(Math.round(hours * 10) / 10).replace('.', ',');

/** Sommeil des 7 derniers jours : moyenne, état de fatigue habituel et heures par nuit. */
export function SleepCard({ sleep, today }: { sleep: SleepWeek; today: string }) {
  const { nights, avgSleep, usualFatigue } = sleep;
  const avgLabel = avgSleep !== null ? formatHours(avgSleep) : '–';
  const fatigueLabel = usualFatigue ? FATIGUE_SUMMARY[usualFatigue] : 'Non noté';

  return (
    <Card style={{ gap: 16 }}>
      <SectionHeader icon={Moon} title="Mon sommeil" subtitle="Heures de sommeil par nuit" right={<Badge label="7 jours" />} />

      <View style={styles.stats}>
        <View style={[styles.stat, styles.statDark]} accessible accessibilityLabel={`Sommeil moyen : ${avgLabel}`}>
          <AppText variant="labelSm" color={Palette.obsidianMuted}>
            Sommeil moyen
          </AppText>
          <AppText variant="headlineSm" color={Palette.limeFixed}>
            {avgLabel}
          </AppText>
        </View>
        <View style={styles.stat} accessible accessibilityLabel={`État moyen : ${fatigueLabel}`}>
          <AppText variant="labelSm" color={Palette.textMuted}>
            État moyen
          </AppText>
          <AppText variant="headlineSm" numberOfLines={2}>
            {fatigueLabel}
          </AppText>
        </View>
      </View>

      <View style={styles.bars}>
        {nights.map((n) => {
          const isToday = n.date === today;
          const short = n.hours !== null && n.hours < SHORT_NIGHT_HOURS;
          const h = n.hours === null ? 44 : 44 + (Math.min(n.hours, MAX_BAR_HOURS) / MAX_BAR_HOURS) * 68;
          return (
            <View
              key={n.date}
              style={styles.barCol}
              accessible
              accessibilityLabel={`${DAY_LONG[weekdayIndex(n.date)]}${isToday ? ", aujourd'hui" : ''} : ${n.hours !== null ? formatHours(n.hours) : 'non noté'
                }${short ? ', nuit courte' : ''}`}>
              <View
                style={[
                  styles.barTrack,
                  { height: h },
                  short && styles.barShort,
                  isToday && !short && { backgroundColor: Palette.limeSoft },
                ]}>
                {n.hours !== null && (
                  <AppText
                    variant="labelSm"
                    color={short ? Palette.onCoral : Palette.textVariant}
                    style={{ fontFamily: Type.labelMd.fontFamily }}>
                    {shortHours(n.hours)}
                  </AppText>
                )}
                <View
                  style={[
                    styles.barDot,
                    { backgroundColor: short ? Palette.coralDeep : isToday ? Palette.primary : Palette.outlineVariant },
                  ]}
                />
              </View>
              <AppText variant="labelSm" color={short ? Palette.coralDeep : isToday ? Palette.primary : Palette.textVariant}>
                {n.label}
              </AppText>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: Palette.coralContainer }]} />
        <AppText variant="labelSm" color={Palette.textVariant}>
          Nuit de moins de {SHORT_NIGHT_HOURS} h
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 2, backgroundColor: Palette.containerLow, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 12 },
  statDark: { backgroundColor: Palette.obsidian },
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
  barShort: { backgroundColor: Palette.coralContainer },
  barDot: { width: 10, height: 10, borderRadius: 5 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
