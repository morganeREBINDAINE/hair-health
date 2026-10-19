import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Pill,
  ShowerHead,
  Activity,
  Leaf,
  Scissors,
  Moon,
  Microscope,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  CircleCheck,
  Frown,
  Hash,
  Droplet,
  type LucideIcon,
} from 'lucide-react-native';
import { Palette, Spacing, DockClearance, Radius, CategoryColors, Type, Elevation } from '../constants/theme';
import { StorageService } from '../services/storageService';
import { DailyLog, LabTest } from '../types';
import { AppText, Badge, Card, Chip, IconCircle, PillButton, ScreenHeader } from '../components/ui';
import { todayIso, shiftIso, dayShort, dayNum, monthTitle, longDay, frDate } from '../lib/dates';
import { flowLabel, getPeriods, hasMenstrualData, predictNextPeriod } from '../lib/cycle';
import '../lib/calendarLocale';

type Category = 'all' | 'cycle' | 'meds' | 'care' | 'henna' | 'blood' | 'emotion' | 'sleep';

const COLOR_LEGEND = [
  { label: 'Règles', color: CategoryColors.cycle },
  { label: 'Traitements', color: CategoryColors.meds },
  { label: 'Soins', color: CategoryColors.wash },
  { label: 'Henné', color: CategoryColors.henna },
  { label: 'Émotionnel', color: CategoryColors.stress },
  { label: 'Sommeil', color: CategoryColors.sleep },
  { label: 'Bilan sanguin', color: CategoryColors.blood },
];

const CATEGORIES: { id: Category; label: string; icon?: LucideIcon }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'cycle', label: 'Cycle', icon: Droplet },
  { id: 'meds', label: 'Traitements', icon: Pill },
  { id: 'care', label: 'Soins', icon: Scissors },
  { id: 'henna', label: 'Henné', icon: Leaf },
  { id: 'blood', label: 'Bilan', icon: Microscope },
  { id: 'emotion', label: 'Émotionnel', icon: Activity },
  { id: 'sleep', label: 'Fatigue', icon: Moon },
];

/** Catégories présentes pour une journée — sert aux pastilles et aux cartes. */
function dayCategories(log: DailyLog | undefined, hasBlood: boolean) {
  const cats: { key: Exclude<Category, 'all'>; color: string }[] = [];
  if (hasMenstrualData(log)) cats.push({ key: 'cycle', color: CategoryColors.cycle });
  if (hasBlood) cats.push({ key: 'blood', color: CategoryColors.blood });
  if (log?.medications?.some((m) => m.taken)) cats.push({ key: 'meds', color: CategoryColors.meds });
  if (log && (log.hairWashDone || log.haircutDone || log.hairLossAmount != null))
    cats.push({ key: 'care', color: CategoryColors.wash });
  if (log?.hennaDone) cats.push({ key: 'henna', color: CategoryColors.henna });
  if (log && (log.conflictWithHusband || log.lumpInThroat || (log.anxietyScore ?? 0) >= 5))
    cats.push({ key: 'emotion', color: CategoryColors.stress });
  if (log && (log.fatigueLevel === 'importante' || log.fatigueLevel === 'modérée' || log.sleepHours != null))
    cats.push({ key: 'sleep', color: CategoryColors.sleep });
  return cats;
}

const anxietyLevel = (s: number) => (s >= 9 ? 'Aigu' : s >= 7 ? 'Élevé' : s >= 4 ? 'Modéré' : s >= 1 ? 'Léger' : 'Paisible');

export default function CalendarScreen() {
  const router = useRouter();
  const todayStr = todayIso();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showMonth, setShowMonth] = useState(false);
  const [category, setCategory] = useState<Category>('all');
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [labTests, setLabTests] = useState<LabTest[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLogs((await StorageService.getAllDailyLogs()) || {});
      setLabTests((await StorageService.getLabTests()) || []);
    } catch (e) {
      console.error('Erreur chargement calendrier:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const bloodByDate = new Map(labTests.map((t) => [t.date, t]));
  const selectedLog = logs[selectedDate];
  const selectedBlood = bloodByDate.get(selectedDate);
  const selectedCats = dayCategories(selectedLog, !!selectedBlood);
  const visible = (c: Exclude<Category, 'all'>) =>
    (category === 'all' || category === c) && selectedCats.some((x) => x.key === c);

  const stripDays = Array.from({ length: 5 }).map((_, i) => shiftIso(selectedDate, i - 2));

  const goToEntry = () => router.push({ pathname: '/entry', params: { date: selectedDate } });

  const takenMeds = selectedLog?.medications.filter((m) => m.taken) ?? [];

  // Fenêtre des prochaines règles prévues (jours sans saisie de règles uniquement)
  const prediction = predictNextPeriod(getPeriods(logs));
  const isPredicted = (iso: string) =>
    !!prediction && iso >= prediction.windowStart && iso <= prediction.windowEnd && !hasMenstrualData(logs[iso]);
  const showPredicted = (category === 'all' || category === 'cycle') && isPredicted(selectedDate);

  const anyVisible =
    showPredicted || (['cycle', 'meds', 'care', 'henna', 'blood', 'emotion', 'sleep'] as const).some(visible);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Calendrier" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Mois + sélecteur de jour */}
        <View style={{ gap: 14 }}>
          <View style={styles.rowBetween}>
            <View>
              <AppText variant="labelMd" color={Palette.textVariant}>
                Planning & rituels
              </AppText>
              <AppText variant="headlineMd">{monthTitle(selectedDate)}</AppText>
            </View>
            <View style={styles.headerActions}>
              <RoundButton icon={ChevronLeft} onPress={() => setSelectedDate(shiftIso(selectedDate, -7))} />
              <RoundButton icon={ChevronRight} onPress={() => setSelectedDate(shiftIso(selectedDate, 7))} />
              <RoundButton icon={CalendarDays} active={showMonth} onPress={() => setShowMonth((v) => !v)} />
            </View>
          </View>

          {showMonth ? (
            <Card style={{ padding: 10 }}>
              <Calendar
                key={selectedDate.slice(0, 7)}
                current={selectedDate}
                onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
                firstDay={1}
                dayComponent={({ date, state }: any) => {
                  if (!date) return null;
                  const iso: string = date.dateString;
                  const isSelected = iso === selectedDate;
                  const isToday = iso === todayStr;
                  const dots = dayCategories(logs[iso], bloodByDate.has(iso)).filter(
                    (c) => category === 'all' || c.key === category
                  );
                  return (
                    <Pressable
                      onPress={() => {
                        setSelectedDate(iso);
                        setShowMonth(false);
                      }}
                      style={[
                        styles.monthDay,
                        !isSelected && (category === 'all' || category === 'cycle') && isPredicted(iso) && styles.monthDayPredicted,
                        isSelected && styles.monthDaySelected,
                        isToday && !isSelected && styles.monthDayToday,
                      ]}>
                      <AppText
                        variant="labelMd"
                        color={state === 'disabled' ? Palette.outlineVariant : Palette.text}>
                        {date.day}
                      </AppText>
                      <View style={styles.dotsRow}>
                        {dots.slice(0, 4).map((d) => (
                          <View key={d.key} style={[styles.dot, { backgroundColor: isSelected ? Palette.obsidian : d.color }]} />
                        ))}
                      </View>
                    </Pressable>
                  );
                }}
                theme={{
                  calendarBackground: 'transparent',
                  textSectionTitleColor: Palette.textMuted,
                  arrowColor: Palette.obsidian,
                  monthTextColor: Palette.text,
                  textMonthFontFamily: Type.headlineSm.fontFamily,
                  textDayHeaderFontFamily: Type.labelSm.fontFamily,
                  textMonthFontSize: 16,
                }}
              />
            </Card>
          ) : (
            <View style={styles.stripRow}>
              {stripDays.map((item) => {
                const active = item === selectedDate;
                const hasData = !!logs[item] || bloodByDate.has(item);
                return (
                  <Pressable
                    key={item}
                    onPress={() => setSelectedDate(item)}
                    style={[styles.dayPill, active ? styles.dayPillActive : styles.dayPillIdle]}>
                    <AppText variant="labelSm" color={active ? Palette.obsidian : Palette.textMuted}>
                      {dayShort(item)}
                    </AppText>
                    <AppText variant="headlineSm" color={active ? Palette.obsidian : Palette.text}>
                      {dayNum(item)}
                    </AppText>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: hasData ? (active ? Palette.obsidian : Palette.primary) : 'transparent' },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Catégories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              icon={c.icon}
              selected={category === c.id}
              count={c.id === 'all' ? selectedCats.length : undefined}
              onPress={() => setCategory(c.id)}
            />
          ))}
        </ScrollView>

        {/* Légende couleurs */}
        <View style={styles.legendRow}>
          {COLOR_LEGEND.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <AppText variant="bodySm" color={Palette.textMuted}>{item.label}</AppText>
            </View>
          ))}
        </View>

        {/* Chronologie du jour */}
        <View style={{ gap: 12 }}>
          <View style={styles.rowBetween}>
            <View style={styles.inline}>
              <View style={[styles.dot, { width: 8, height: 8, backgroundColor: Palette.lime }]} />
              <AppText variant="labelMd">{longDay(selectedDate)}</AppText>
            </View>
            <AppText variant="bodySm" color={Palette.textMuted}>
              {selectedCats.length} enregistrement{selectedCats.length > 1 ? 's' : ''}
            </AppText>
          </View>

          {!anyVisible && (
            <Card style={styles.emptyCard}>
              <IconCircle icon={CalendarDays} size={48} />
              <AppText variant="bodyMd" color={Palette.textMuted} style={{ textAlign: 'center' }}>
                {selectedCats.length === 0
                  ? 'Aucune donnée enregistrée pour cette date.'
                  : 'Rien dans cette catégorie ce jour-là.'}
              </AppText>
            </Card>
          )}

          {visible('cycle') && selectedLog && (
            <SmallEventCard
              icon={Droplet}
              color={CategoryColors.cycle}
              title={selectedLog.menstrualFlow != null ? 'Règles' : 'Fin des règles'}
              subtitle={[
                selectedLog.menstrualFlow != null &&
                  `Flux ${selectedLog.menstrualFlow}/10 (${flowLabel(selectedLog.menstrualFlow).toLowerCase()})`,
                selectedLog.menstrualFlow != null && `douleur ${selectedLog.menstrualPain ? 'présente' : 'absente'}`,
                selectedLog.menstrualEndedAt && `arrêtées à ${selectedLog.menstrualEndedAt}`,
                selectedLog.menstrualNote,
              ]
                .filter(Boolean)
                .join(' · ')}
              badge={selectedLog.menstrualFlow != null ? `${selectedLog.menstrualFlow}/10` : 'Fin'}
            />
          )}

          {showPredicted && prediction && (
            <SmallEventCard
              icon={Droplet}
              color={CategoryColors.cycle}
              title="Règles prévues"
              subtitle={`Entre le ${frDate(prediction.windowStart)} et le ${frDate(prediction.windowEnd)}${
                prediction.isEstimate ? ' · estimation' : ''
              }`}
              badge="Prévu"
            />
          )}

          {visible('meds') && (
            <Card style={{ gap: 14 }}>
              <View style={styles.rowBetween}>
                <View style={styles.inlineLg}>
                  <IconCircle icon={Pill} size={44} bg={Palette.limeSoft} color={Palette.primary} />
                  <View>
                    <AppText variant="headlineSm" style={{ fontSize: 16 }}>
                      Compléments
                    </AppText>
                    <AppText variant="bodySm" color={Palette.textMuted}>
                      {takenMeds.length} produit{takenMeds.length > 1 ? 's' : ''} pris
                    </AppText>
                  </View>
                </View>
                <Badge label="Pris" tone="lime" dot />
              </View>
              <View style={styles.wrap}>
                {takenMeds.map((m) => (
                  <View key={m.name} style={styles.medTag}>
                    <AppText variant="bodySm" color={Palette.textVariant}>
                      {m.name}
                      {m.dosage ? ` · ${m.dosage}` : ''}
                    </AppText>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {visible('care') && (selectedLog?.hairWashDone || selectedLog?.hairLossAmount != null) && (
            <Card dark style={{ gap: 16 }}>
              <View style={styles.rowBetween}>
                <View style={styles.inlineLg}>
                  <IconCircle icon={ShowerHead} size={44} bg="rgba(255,255,255,0.1)" color={Palette.limeFixed} />
                  <View style={{ flexShrink: 1 }}>
                    <View style={styles.inline}>
                      <AppText variant="headlineSm" color="#FFFFFF" style={{ fontSize: 16 }}>
                        {selectedLog?.hairWashDone ? 'Lavage & soin' : 'Chute de cheveux'}
                      </AppText>
                      {selectedLog?.hairWashDone && <Badge label="Jour J" tone="lime" />}
                    </View>
                    <AppText variant="bodySm" color={Palette.obsidianMuted}>
                      {selectedLog?.hairWashDone
                        ? `Shampoing ${selectedLog.shampooType ? selectedLog.shampooType.replace('_', ' ') : ''}`.trim()
                        : 'Estimation du jour'}
                    </AppText>
                  </View>
                </View>
              </View>
              {selectedLog?.hairLossAmount != null && (
                <View style={styles.darkFooter}>
                  <View style={styles.inline}>
                    <Hash size={15} color={Palette.obsidianMuted} />
                    <AppText variant="bodySm" color={Palette.obsidianText}>
                      Perte estimée : ~{selectedLog.hairLossAmount} cheveux
                    </AppText>
                  </View>
                  <Badge
                    label={selectedLog.hairLossAmount <= 50 ? 'Normal' : selectedLog.hairLossAmount <= 100 ? 'Modéré' : 'Élevé'}
                    tone={selectedLog.hairLossAmount <= 50 ? 'light' : 'coral'}
                    icon={selectedLog.hairLossAmount <= 50 ? CircleCheck : undefined}
                  />
                </View>
              )}
            </Card>
          )}

          {visible('emotion') && selectedLog && (
            <Card style={[styles.coralCard, { gap: 12 }]}>
              <View style={styles.rowBetween}>
                <View style={styles.inlineLg}>
                  <IconCircle icon={Activity} size={44} bg={Palette.coralSoft} color={Palette.coralDeep} />
                  <View>
                    <View style={styles.inline}>
                      <AppText variant="headlineSm" style={{ fontSize: 16 }}>
                        Anxiété
                      </AppText>
                      {selectedLog.anxietyScore != null && (
                        <Badge label={`${selectedLog.anxietyScore} / 10`} tone="coral" />
                      )}
                    </View>
                    <AppText variant="bodySm" color={Palette.textMuted}>
                      Impact cortisol surveillé
                    </AppText>
                  </View>
                </View>
                {selectedLog.anxietyScore != null && (
                  <Badge label={anxietyLevel(selectedLog.anxietyScore)} tone="coralSoft" />
                )}
              </View>
              {(selectedLog.lumpInThroat || selectedLog.conflictWithHusband) && (
                <View style={styles.coralNote}>
                  <Frown size={18} color={Palette.coralDeep} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="labelSm" color={Palette.onCoral}>
                      Sensations & événements
                    </AppText>
                    <AppText variant="bodySm" color={Palette.textVariant}>
                      {[selectedLog.lumpInThroat && 'Boule dans la gorge', selectedLog.conflictWithHusband && 'Dispute de couple']
                        .filter(Boolean)
                        .join(' · ')}
                    </AppText>
                  </View>
                </View>
              )}
            </Card>
          )}

          {visible('henna') && (
            <SmallEventCard icon={Leaf} color={CategoryColors.henna} title="Soin henné" subtitle="Gaine kératine" badge="Fait" />
          )}

          {visible('care') && selectedLog?.haircutDone && (
            <SmallEventCard
              icon={Scissors}
              color={CategoryColors.haircut}
              title="Coupe de cheveux"
              subtitle={selectedLog.haircutNotes || 'Coupe effectuée'}
              badge="Fait"
            />
          )}

          {visible('sleep') && selectedLog && (
            <SmallEventCard
              icon={Moon}
              color={CategoryColors.sleep}
              title="Sommeil & fatigue"
              subtitle={[
                selectedLog.sleepHours != null && `${selectedLog.sleepHours} h de sommeil`,
                selectedLog.fatigueLevel && `Fatigue ${selectedLog.fatigueLevel}`,
              ]
                .filter(Boolean)
                .join(' · ')}
              badge={selectedLog.sleepHours != null ? `${selectedLog.sleepHours} h` : undefined}
            />
          )}

          {visible('blood') && selectedBlood && (
            <SmallEventCard
              icon={Microscope}
              color={CategoryColors.blood}
              title="Prise de sang"
              subtitle={selectedBlood.notes || `${Object.keys(selectedBlood.values).length} valeurs enregistrées`}
              badge="Bilan"
              onPress={() => router.push('/norms')}
            />
          )}
        </View>

        <PillButton label="Ajouter une entrée pour ce jour" icon={CirclePlus} onPress={goToEntry} />
      </ScrollView>
    </View>
  );
}

function RoundButton({ icon: Icon, onPress, active }: { icon: LucideIcon; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.roundBtn,
        active && { backgroundColor: Palette.obsidian },
        pressed && { transform: [{ scale: 0.94 }] },
      ]}>
      <Icon size={19} color={active ? '#FFFFFF' : Palette.text} />
    </Pressable>
  );
}

function SmallEventCard({
  icon,
  color,
  title,
  subtitle,
  badge,
  onPress,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
  subtitle: string;
  badge?: string;
  onPress?: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.smallCard}>
      <IconCircle icon={icon} size={44} color={color} bg={Palette.containerLow} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="labelMd" style={{ fontSize: 15 }}>
          {title}
        </AppText>
        <AppText variant="bodySm" color={Palette.textMuted} numberOfLines={2}>
          {subtitle}
        </AppText>
      </View>
      {badge && <Badge label={badge} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  content: {
    paddingHorizontal: Spacing.margin,
    paddingTop: 8,
    paddingBottom: DockClearance,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineLg: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  headerActions: { flexDirection: 'row', gap: 6 },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...Elevation.card,
  },
  stripRow: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  dayPill: {
    flex: 1,
    height: 84,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayPillIdle: { backgroundColor: Palette.card, ...Elevation.card, elevation: 1 },
  dayPillActive: {
    backgroundColor: Palette.lime,
    shadowColor: Palette.lime,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotsRow: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  monthDay: {
    width: 40,
    height: 46,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDaySelected: { backgroundColor: Palette.lime },
  monthDayPredicted: { backgroundColor: Palette.raspberrySoft },
  monthDayToday: { borderWidth: 1.5, borderColor: Palette.obsidian },
  chipsScroll: { marginHorizontal: -Spacing.margin },
  chips: { gap: 8, paddingHorizontal: Spacing.margin, paddingVertical: 6 },
  emptyCard: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  medTag: {
    backgroundColor: Palette.containerLow,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  darkFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.full,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
  },
  coralCard: { borderWidth: 1, borderColor: Palette.coralSoft },
  coralNote: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFF4F2',
    borderRadius: Radius.lg,
    padding: 12,
  },
  smallCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.lg },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
