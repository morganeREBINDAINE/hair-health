import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { shampooLabel } from '../constants/hairCare';
import { StorageService } from '../services/storageService';
import { DailyLog, LabTest, MedicationDefinition } from '../types';
import { AppText, Badge, Card, Chip, IconCircle, PillButton, ScreenHeader, SkeletonCard } from '../components/ui';
import { SyncEvent, useInitialSyncing } from '../lib/syncEvent';
import { Toast } from '../lib/toast';
import { todayIso, shiftIso, dayShort, dayNum, monthTitle, longDay, frDate, daysBetween } from '../lib/dates';
import { flowLabel, getPeriods, hasMenstrualData, predictNextPeriod } from '../lib/cycle';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PREDICTED_KEY,
  UNWASHED_KEY,
  WASH_KEY,
  buildCalendarFilters,
  categoriesOf,
  dayDots,
  dayItems,
  isItemShown,
  isShown,
  lastWashBefore,
  medItemKey,
  type CalendarCategory,
  type CategoryFilter,
  type FilterSelection,
  type SubFilter,
} from '../lib/calendarFilters';
import '../lib/calendarLocale';

const CATEGORY_ICONS: Record<CalendarCategory, LucideIcon> = {
  cycle: Droplet,
  meds: Pill,
  hair: Scissors,
  emotion: Activity,
  sleep: Moon,
  blood: Microscope,
};

/** Légende de la vue « Tout » : une couleur par catégorie, plus le fond des règles prévues. */
const CATEGORY_LEGEND: SubFilter[] = [
  ...CATEGORY_ORDER.map((c) => ({ key: c, label: CATEGORY_LABELS[c].legend, color: CategoryColors[c] })),
  { key: PREDICTED_KEY, label: 'Règles prévues', color: CategoryColors.cycle, swatch: 'band' },
];

/** Délai max entre deux touchers sur le même jour pour un double toucher (ms). */
const DOUBLE_TAP_DELAY = 300;

const anxietyLevel = (s: number) => (s >= 9 ? 'Aigu' : s >= 7 ? 'Élevé' : s >= 4 ? 'Modéré' : s >= 1 ? 'Léger' : 'Paisible');

export default function CalendarScreen() {
  const router = useRouter();
  const todayStr = todayIso();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showMonth, setShowMonth] = useState(false);
  const [selection, setSelection] = useState<FilterSelection>({ category: 'all', subKeys: [] });
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [medications, setMedications] = useState<MedicationDefinition[]>([]);
  const initialSyncing = useInitialSyncing();
  const lastMonthTap = useRef<{ iso: string; at: number } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLogs((await StorageService.getAllDailyLogs()) || {});
      setLabTests((await StorageService.getLabTests()) || []);
      setMedications((await StorageService.getMedications()) || []);
    } catch (e) {
      console.error('Erreur chargement calendrier:', e);
      Toast.error('Impossible de charger le calendrier');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Rafraîchi à la fin de chaque synchro cloud
  useEffect(() => SyncEvent.subscribe(() => loadData()), [loadData]);

  const filters = useMemo(() => buildCalendarFilters(medications), [medications]);
  const subFilters = selection.category === 'all' ? [] : filters.subFilters[selection.category];
  // Ignore les sous-filtres disparus (ex. traitement masqué depuis sa page détail)
  const sel: FilterSelection = {
    category: selection.category,
    subKeys: selection.subKeys.filter((k) => subFilters.some((f) => f.key === k)),
  };

  const bloodByDate = new Map(labTests.map((t) => [t.date, t]));
  const selectedLog = logs[selectedDate];
  const selectedBlood = bloodByDate.get(selectedDate);
  const selectedItems = dayItems(selectedLog, !!selectedBlood, filters);
  const selectedCatCount = categoriesOf(selectedItems).length;
  const shownItems = selectedItems.filter((i) => isItemShown(sel, i));
  const shown = (category: CalendarCategory, key?: string) =>
    shownItems.some((i) => i.category === category && (key === undefined || i.key === key));
  const itemColor = (category: CalendarCategory, key: string) =>
    selectedItems.find((i) => i.category === category && i.key === key)?.color ?? CategoryColors[category];

  const selectCategory = (category: CategoryFilter) => setSelection({ category, subKeys: [] });
  const toggleSubFilter = (key: string) =>
    setSelection((s) => ({
      ...s,
      subKeys: s.subKeys.includes(key) ? s.subKeys.filter((k) => k !== key) : [...s.subKeys, key],
    }));

  const stripDays = Array.from({ length: 5 }).map((_, i) => shiftIso(selectedDate, i - 2));

  // Vue mois : un toucher affiche le résumé du jour, un double toucher ouvre la vue jour
  const handleMonthDayPress = (iso: string, now: number) => {
    const last = lastMonthTap.current;
    setSelectedDate(iso);
    if (last && last.iso === iso && now - last.at < DOUBLE_TAP_DELAY) {
      lastMonthTap.current = null;
      setShowMonth(false);
    } else {
      lastMonthTap.current = { iso, at: now };
    }
  };

  const categoryChips = (
    <View style={{ gap: 2 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
        <Chip label="Tout" selected={sel.category === 'all'} count={selectedCatCount} onPress={() => selectCategory('all')} />
        {CATEGORY_ORDER.map((c) => (
          <Chip
            key={c}
            label={CATEGORY_LABELS[c].chip}
            icon={CATEGORY_ICONS[c]}
            selected={sel.category === c}
            onPress={() => selectCategory(c)}
          />
        ))}
      </ScrollView>
      {sel.category !== 'all' && subFilters.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
          <Chip
            label="Tous"
            selected={sel.subKeys.length === 0}
            onPress={() => setSelection({ category: sel.category, subKeys: [] })}
            style={styles.subChip}
          />
          {subFilters.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              dotColor={f.color}
              selected={sel.subKeys.includes(f.key)}
              onPress={() => toggleSubFilter(f.key)}
              style={styles.subChip}
            />
          ))}
        </ScrollView>
      )}
      {sel.category === 'meds' && subFilters.length === 0 && (
        <AppText variant="bodySm" color={Palette.textMuted} style={{ paddingHorizontal: 4, paddingTop: 4 }}>
          Aucun traitement affiché. Active-les depuis leur page détail dans Paramètres.
        </AppText>
      )}
    </View>
  );

  const legendItems = sel.category === 'all' ? CATEGORY_LEGEND : filters.legend[sel.category];
  const colorLegend = legendItems.length > 0 && (
    <View style={styles.legendRow}>
      {legendItems.map((item) => {
        const dimmed = sel.subKeys.length > 0 && !sel.subKeys.includes(item.key);
        return (
          <View key={item.key} style={[styles.legendItem, dimmed && { opacity: 0.35 }]}>
            <View style={item.swatch === 'band' ? styles.legendBand : [styles.legendDot, { backgroundColor: item.color }]} />
            <AppText variant="bodySm" color={Palette.textVariant}>
              {item.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );

  const goToEntry = () => router.push({ pathname: '/entry', params: { date: selectedDate } });

  // Traitements pris et affichés, sans doublon de nom
  const takenMeds = (selectedLog?.medications ?? []).filter(
    (m, i, all) =>
      m.taken &&
      shown('meds', medItemKey(m.name)) &&
      all.findIndex((x) => medItemKey(x.name) === medItemKey(m.name)) === i
  );

  const showPeriod = shown('cycle');
  const showWash =
    !!selectedLog?.hairWashDone && shownItems.some((i) => i.key === WASH_KEY || i.key.startsWith('shampoo:'));
  // La chute n'a ni pastille ni sous-filtre : visible en vue « Tout » et sous « Cheveux › Tous »
  const showLoss =
    selectedLog?.hairLossAmount != null &&
    (sel.category === 'all' || (sel.category === 'hair' && sel.subKeys.length === 0));
  const showUnwashed = shown('hair', UNWASHED_KEY);
  const lastWash = showUnwashed ? lastWashBefore(logs, selectedDate) : null;

  // Fenêtre des prochaines règles prévues (jours sans saisie de règles uniquement)
  const prediction = predictNextPeriod(getPeriods(logs));
  const isPredicted = (iso: string) =>
    !!prediction && iso >= prediction.windowStart && iso <= prediction.windowEnd && !hasMenstrualData(logs[iso]);
  const predictedShown = isShown(sel, 'cycle', PREDICTED_KEY);
  const showPredicted = predictedShown && isPredicted(selectedDate);

  // La fatigue n'a ni pastille ni sous-filtre : visible en vue « Tout » et sous « Sommeil › Tous »
  const showFatigue =
    !!selectedLog?.fatigueLevel && (sel.category === 'all' || (sel.category === 'sleep' && sel.subKeys.length === 0));
  const showSleep = shown('sleep') || showFatigue;

  const anyVisible = showPredicted || showLoss || showFatigue || shownItems.length > 0;

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
            <>
              {categoryChips}
              <Card style={{ padding: 10 }}>
                <Calendar
                  key={selectedDate.slice(0, 7)}
                  current={selectedDate}
                  firstDay={1}
                  dayComponent={({ date, state }: any) => {
                    if (!date) return null;
                    const iso: string = date.dateString;
                    const isSelected = iso === selectedDate;
                    const isToday = iso === todayStr;
                    const dots = dayDots(dayItems(logs[iso], bloodByDate.has(iso), filters), sel);
                    return (
                      <Pressable
                        onPress={(e) => handleMonthDayPress(iso, e.timeStamp)}
                        style={[
                          styles.monthDay,
                          !isSelected && predictedShown && isPredicted(iso) && styles.monthDayPredicted,
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
              {colorLegend}
            </>
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

        {/* Vue semaine : catégories puis légende sous le sélecteur de jour */}
        {!showMonth && categoryChips}
        {!showMonth && colorLegend}

        {/* Chronologie du jour */}
        <View style={{ gap: 12 }}>
          <View style={styles.rowBetween}>
            <View style={styles.inline}>
              <View style={[styles.dot, { width: 8, height: 8, backgroundColor: Palette.lime }]} />
              <AppText variant="labelMd">{longDay(selectedDate)}</AppText>
            </View>
            <AppText variant="bodySm" color={Palette.textMuted}>
              {selectedCatCount} enregistrement{selectedCatCount > 1 ? 's' : ''}
            </AppText>
          </View>

          {initialSyncing && (
            <>
              <SkeletonCard lines={2} />
              <SkeletonCard lines={2} />
            </>
          )}

          {!initialSyncing && !anyVisible && (
            <Card style={styles.emptyCard}>
              <IconCircle icon={CalendarDays} size={48} />
              <AppText variant="bodyMd" color={Palette.textMuted} style={{ textAlign: 'center' }}>
                {selectedItems.length === 0
                  ? 'Aucune donnée enregistrée pour cette date.'
                  : 'Rien dans cette sélection ce jour-là.'}
              </AppText>
            </Card>
          )}

          {/* Règles : toujours en tête du détail du jour */}
          {!initialSyncing && showPeriod && selectedLog && (
            <PeriodBanner
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

          {!initialSyncing && showPredicted && prediction && (
            <PeriodBanner
              predicted
              title="Règles prévues"
              subtitle={`Entre le ${frDate(prediction.windowStart)} et le ${frDate(prediction.windowEnd)}${
                prediction.isEstimate ? ' · estimation' : ''
              }`}
              badge="Prévu"
            />
          )}

          {!initialSyncing && takenMeds.length > 0 && (
            <Card style={{ gap: 14 }}>
              <View style={styles.rowBetween}>
                <View style={styles.inlineLg}>
                  <IconCircle icon={Pill} size={44} bg={Palette.limeSoft} color={Palette.primary} />
                  <View>
                    <AppText variant="headlineSm" style={{ fontSize: 16 }}>
                      Traitements
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
                    <View style={[styles.legendDot, { backgroundColor: itemColor('meds', medItemKey(m.name)) }]} />
                    <AppText variant="bodySm" color={Palette.textVariant}>
                      {m.name}
                      {m.dosage ? ` · ${m.dosage}` : ''}
                    </AppText>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {!initialSyncing && (showWash || showLoss) && selectedLog && (
            <Card dark style={{ gap: 16 }}>
              <View style={styles.rowBetween}>
                <View style={styles.inlineLg}>
                  <IconCircle icon={ShowerHead} size={44} bg="rgba(255,255,255,0.1)" color={Palette.limeFixed} />
                  <View style={{ flexShrink: 1 }}>
                    <View style={styles.inline}>
                      <AppText variant="headlineSm" color="#FFFFFF" style={{ fontSize: 16 }}>
                        {showWash ? 'Lavage & soin' : 'Chute de cheveux'}
                      </AppText>
                      {showWash && <Badge label="Jour J" tone="lime" />}
                    </View>
                    <AppText variant="bodySm" color={Palette.obsidianMuted}>
                      {showWash ? shampooLabel(selectedLog.shampooType) ?? 'Shampoing' : 'Estimation du jour'}
                    </AppText>
                  </View>
                </View>
              </View>
              {showLoss && selectedLog.hairLossAmount != null && (
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

          {!initialSyncing && showUnwashed && (
            <SmallEventCard
              icon={ShowerHead}
              color={itemColor('hair', UNWASHED_KEY)}
              title="Cheveux non lavés"
              subtitle={
                lastWash
                  ? `${daysBetween(lastWash, selectedDate)} jour${daysBetween(lastWash, selectedDate) > 1 ? 's' : ''} depuis le dernier lavage (${frDate(lastWash)})`
                  : 'Aucun lavage enregistré avant ce jour'
              }
              badge={lastWash ? `J+${daysBetween(lastWash, selectedDate)}` : undefined}
            />
          )}

          {!initialSyncing && shown('emotion') && selectedLog && (
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
                    {selectedLog.conflictWithHusband && !!selectedLog.conflictNote && (
                      <AppText variant="bodySm" color={Palette.textVariant} style={{ marginTop: 4 }}>
                        « {selectedLog.conflictNote} »
                      </AppText>
                    )}
                  </View>
                </View>
              )}
            </Card>
          )}

          {!initialSyncing && shown('hair', 'henna') && (
            <SmallEventCard
              icon={Leaf}
              color={itemColor('hair', 'henna')}
              title="Soin henné"
              subtitle="Gaine kératine"
              badge="Fait"
            />
          )}

          {!initialSyncing && shown('hair', 'haircut') && selectedLog && (
            <SmallEventCard
              icon={Scissors}
              color={itemColor('hair', 'haircut')}
              title="Coupe de cheveux"
              subtitle={selectedLog.haircutNotes || 'Coupe effectuée'}
              badge="Fait"
            />
          )}

          {!initialSyncing && showSleep && selectedLog && (
            <SmallEventCard
              icon={Moon}
              color={CategoryColors.sleep}
              title="Sommeil"
              subtitle={[
                selectedLog.sleepHours != null && `${selectedLog.sleepHours} h de sommeil`,
                selectedLog.fatigueLevel && `Fatigue ${selectedLog.fatigueLevel}`,
              ]
                .filter(Boolean)
                .join(' · ')}
              badge={selectedLog.sleepHours != null ? `${selectedLog.sleepHours} h` : undefined}
            />
          )}

          {!initialSyncing && shown('blood') && selectedBlood && (
            <SmallEventCard
              icon={Microscope}
              color={CategoryColors.blood}
              title="Prise de sang"
              subtitle={selectedBlood.notes || `${Object.keys(selectedBlood.values).length} valeurs enregistrées`}
              badge="Bilan"
              onPress={() => router.push('/analyses')}
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

/** Encart des règles (réelles ou prévues), sur fond rouge clair, en tête du détail du jour. */
function PeriodBanner({
  title,
  subtitle,
  badge,
  predicted,
}: {
  title: string;
  subtitle: string;
  badge: string;
  predicted?: boolean;
}) {
  return (
    <View style={[styles.periodBanner, predicted && styles.periodBannerPredicted]}>
      <IconCircle icon={Droplet} size={44} color={Palette.menstrual} bg={Palette.card} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="labelMd" color={Palette.menstrualDeep} style={{ fontSize: 15 }}>
          {title}
        </AppText>
        {!!subtitle && (
          <AppText variant="bodySm" color={Palette.menstrualDeep}>
            {subtitle}
          </AppText>
        )}
      </View>
      <View style={styles.periodBadge}>
        <AppText variant="labelSm" color={Palette.menstrualDeep}>
          {badge}
        </AppText>
      </View>
    </View>
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
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotsRow: { flexDirection: 'row', gap: 2, height: 8, marginTop: 2 },
  monthDay: {
    width: 40,
    height: 46,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDaySelected: { backgroundColor: Palette.lime },
  monthDayPredicted: { backgroundColor: Palette.menstrualSoft },
  monthDayToday: { borderWidth: 1.5, borderColor: Palette.obsidian },
  chipsScroll: { marginHorizontal: -Spacing.margin },
  chips: { gap: 8, paddingHorizontal: Spacing.margin, paddingVertical: 6 },
  subChip: { height: 34, paddingHorizontal: 12 },
  emptyCard: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  medTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendBand: {
    width: 18,
    height: 10,
    borderRadius: 3,
    backgroundColor: Palette.menstrualSoft,
    borderWidth: 1,
    borderColor: Palette.menstrual,
    borderStyle: 'dashed',
  },
  periodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Palette.menstrualSoft,
  },
  periodBannerPredicted: { borderWidth: 1, borderColor: Palette.menstrual, borderStyle: 'dashed' },
  periodBadge: {
    backgroundColor: Palette.card,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
