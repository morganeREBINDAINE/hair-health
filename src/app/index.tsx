import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Animated, Easing } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Activity,
  Scissors,
  ChartColumn,
  TriangleAlert,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Pill,
  Droplet,
  Check,
  Smile,
  Frown,
  NotebookPen,
  Sparkles,
  Clock,
  Repeat,
} from 'lucide-react-native';
import { Palette, Spacing, DockClearance, Type } from '../constants/theme';
import { StorageService } from '../services/storageService';
import { DailyLog, LabMarkerDefinition, LabTest, TreatmentPlan } from '../types';
import { todayIso, shiftIso, shiftMonthsIso, dayShort, daysBetween, frDate } from '../lib/dates';
import { AppText, Badge, Card, IconCircle, ScreenHeader } from '../components/ui';
import { PillBarChart } from '../components/charts';
import { SyncEvent } from '../lib/syncEvent';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function InfinityLoader({ size = 64, color = Palette.primary }: { size?: number; color?: string }) {
  const phase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  const w = size;
  const h = size * 0.5;
  const halfW = w / 2;
  const r = h / 2 - 2;

  const rotate = phase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '360deg'],
  });

  const scaleX = phase.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.85, 1, 0.85, 1],
  });

  return (
    <Animated.View
      style={{
        width: w,
        height: h,
        transform: [{ rotate }, { scaleX }],
      }}>
      <View
        style={{
          position: 'absolute',
          left: halfW - r * 2 - 1,
          top: h / 2 - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          borderWidth: 3,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: halfW + 1,
          top: h / 2 - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          borderWidth: 3,
          borderColor: color,
        }}
      />
    </Animated.View>
  );
}

/**
 * Fréquence de contrôle de chaque marqueur selon la dernière valeur mesurée :
 * `needsCloseWatch(value)` vrai → intervalle court, sinon intervalle long (en mois).
 */
const BLOOD_CHECKS = [
  { code: 'tsh', name: 'TSH', unit: 'mUI/L', needsCloseWatch: (v: number) => v > 2.5, shortMonths: 2, longMonths: 6 },
  { code: 'vit_d', name: 'Vitamine D', unit: 'ng/mL', needsCloseWatch: (v: number) => v < 50, shortMonths: 3, longMonths: 12 },
  { code: 'ferritine', name: 'Ferritine', unit: 'µg/L', needsCloseWatch: (v: number) => v < 70, shortMonths: 3, longMonths: 6 },
];

type BloodCheck = {
  code: string;
  name: string;
  last: { date: string; value: number; unit: string } | null;
  months: number | null;
  dueDate: string | null;
  daysLeft: number | null;
  due: boolean;
};

function computeBloodChecks(tests: LabTest[], markers: LabMarkerDefinition[], today: string): BloodCheck[] {
  const sorted = [...tests].sort((a, b) => b.date.localeCompare(a.date));
  return BLOOD_CHECKS.map((cfg) => {
    // Un résultat est rattaché au marqueur par son id (« marker-tsh ») ou par son code
    const marker = markers.find((m) => m.code.toLowerCase() === cfg.code);
    const keys = new Set([cfg.code, `marker-${cfg.code}`, ...(marker ? [marker.id.toLowerCase()] : [])]);
    if (cfg.code === 'vit_d') keys.add('marker-vitd');
    const unit = marker?.unit ?? cfg.unit;

    let last: BloodCheck['last'] = null;
    for (const t of sorted) {
      const entry = Object.entries(t.values).find(([k, v]) => keys.has(k.toLowerCase()) && typeof v === 'number');
      if (entry) {
        last = { date: t.date, value: entry[1], unit };
        break;
      }
    }

    if (!last) {
      return { code: cfg.code, name: cfg.name, last, months: null, dueDate: null, daysLeft: null, due: true };
    }
    const months = cfg.needsCloseWatch(last.value) ? cfg.shortMonths : cfg.longMonths;
    const dueDate = shiftMonthsIso(last.date, months);
    const daysLeft = daysBetween(today, dueDate);
    return { code: cfg.code, name: cfg.name, last, months, dueDate, daysLeft, due: daysLeft <= 0 };
  }).sort((a, b) => (a.daysLeft ?? -Infinity) - (b.daysLeft ?? -Infinity));
}

export default function DashboardScreen() {
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [labMarkers, setLabMarkers] = useState<LabMarkerDefinition[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);

  const loadData = useCallback(async () => {
    try {
      const all = await StorageService.getAllDailyLogs();
      setLogs(Object.values(all).sort((a, b) => a.date.localeCompare(b.date)));
      setLabTests(await StorageService.getLabTests());
      setLabMarkers(await StorageService.getLabMarkers());
      setTreatmentPlans(await StorageService.getTreatmentPlans());
    } catch (e) {
      console.error('Erreur chargement dashboard:', e);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    return SyncEvent.subscribe(() => {
      loadData();
    });
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (initialLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Accueil" />
        <View style={styles.loaderContainer}>
          <InfinityLoader size={64} color={Palette.primary} />
          <AppText variant="labelMd" color={Palette.textMuted} style={{ marginTop: 16 }}>
            Chargement de vos données…
          </AppText>
        </View>
      </View>
    );
  }

  // ── Fenêtres de 7 jours ──
  const todayStr = todayIso();
  const d7Str = shiftIso(todayStr, -6);
  const logsByDate = new Map(logs.map((l) => [l.date, l]));

  const last7 = logs.filter((l) => l.date >= d7Str && l.date <= todayStr);

  const avgAnxiety = avg(last7.filter((l) => l.anxietyScore != null).map((l) => l.anxietyScore as number));
  const avgLoss = avg(last7.filter((l) => l.hairLossAmount != null).map((l) => l.hairLossAmount as number));
  const lossDays = last7.filter((l) => l.hairLossAmount != null).length;

  const anxietyLabel =
    avgAnxiety === null ? '–' : avgAnxiety <= 3 ? 'Calme' : avgAnxiety <= 6 ? 'Modéré' : 'Élevé';
  const lossLabel = avgLoss === null ? '–' : avgLoss <= 50 ? 'Normal' : avgLoss <= 100 ? 'À surveiller' : 'Forte';

  const throatDays = last7.filter((l) => l.lumpInThroat).length;
  const conflictDays = last7.filter((l) => l.conflictWithHusband).length;

  // ── Barres hebdomadaires d'anxiété ──
  const week = Array.from({ length: 7 }).map((_, i) => {
    const date = shiftIso(todayStr, i - 6);
    return { date, label: dayShort(date), score: logsByDate.get(date)?.anxietyScore ?? null };
  });
  const peak = week.reduce<(typeof week)[number] | null>(
    (best, d) => (d.score !== null && d.score >= 5 && (!best || d.score > (best.score ?? 0)) ? d : best),
    null
  );
  const peakLog = peak ? logsByDate.get(peak.date) : undefined;

  // ── Traitements actifs ──
  const todayLog = logsByDate.get(todayStr);
  const takenMeds = todayLog?.medications.filter((m) => m.taken) ?? [];
  const activePlans = StorageService.getActivePlansForDate(treatmentPlans, todayStr);
  const fondPlans = activePlans.filter((p) => p.type === 'fond');
  const curePlans = activePlans.filter((p) => p.type === 'cure');

  // ── Prochaines prises de sang ──
  const bloodChecks = computeBloodChecks(labTests, labMarkers, todayStr);

  // ── Graphique chute ──
  const hairChartData = logs
    .filter((l) => l.hairLossAmount != null)
    .slice(-8)
    .map((l) => ({
      value: l.hairLossAmount as number,
      label: l.date.slice(8) + '/' + l.date.slice(5, 7),
    }));

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Accueil" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.obsidian} />}>
        {/* Salutation */}
        <View>
          <AppText variant="labelMd" color={Palette.textVariant}>
            Bonjour 👋
          </AppText>
          <AppText variant="headlineLg" style={{ marginTop: 4 }}>
            Comment te sens-tu aujourd&apos;hui ?
          </AppText>
        </View>

        {!todayLog && (
          <Card onPress={() => router.push('/entry')} style={styles.ctaCard}>
            <IconCircle icon={NotebookPen} bg={Palette.lime} color={Palette.obsidian} size={44} />
            <View style={{ flex: 1 }}>
              <AppText variant="labelMd">Journée pas encore notée</AppText>
              <AppText variant="bodySm" color={Palette.textMuted}>
                Chute, anxiété, compléments… 1 minute suffit.
              </AppText>
            </View>
            <ChevronRight size={20} color={Palette.text} />
          </Card>
        )}

        {/* Bento duo */}
        <View style={styles.bento}>
          <Card dark style={styles.bentoCard}>
            <View style={styles.rowBetween}>
              <IconCircle icon={Activity} bg="rgba(224,227,223,0.14)" color={Palette.limeFixed} size={36} />
              <Badge label={anxietyLabel} tone={avgAnxiety !== null && avgAnxiety > 6 ? 'coral' : 'lime'} />
            </View>
            <View style={{ marginTop: 24 }}>
              <AppText variant="labelSm" color={Palette.obsidianMuted}>
                Anxiété moy. · 7 j
              </AppText>
              <View style={styles.metricRow}>
                <AppText variant="displayLg" color="#FFFFFF">
                  {avgAnxiety !== null ? avgAnxiety.toFixed(1).replace('.0', '') : '–'}
                </AppText>
                <AppText variant="labelMd" color={Palette.obsidianMuted}>
                  /10
                </AppText>
              </View>
              <View style={styles.inlineIcon}>
                {throatDays > 0 ? (
                  <Frown size={14} color={Palette.coralContainer} />
                ) : (
                  <Smile size={14} color={Palette.limeDim} />
                )}
                <AppText variant="bodySm" color={throatDays > 0 ? Palette.coralContainer : Palette.limeDim}>
                  {throatDays > 0 ? `Boule gorge ${throatDays} j` : 'Pas de boule gorge'}
                </AppText>
              </View>
            </View>
          </Card>

          <Card style={styles.bentoCard}>
            <View style={styles.rowBetween}>
              <IconCircle icon={Scissors} color={Palette.primary} size={36} />
              <Badge
                label={lossLabel}
                tone={avgLoss !== null && avgLoss > 100 ? 'coralSoft' : avgLoss !== null && avgLoss > 50 ? 'amber' : 'limeSoft'}
              />
            </View>
            <View style={{ marginTop: 24 }}>
              <AppText variant="labelSm" color={Palette.textVariant}>
                Chute estimée / jour
              </AppText>
              <View style={styles.metricRow}>
                <AppText variant="displayLg">{avgLoss !== null ? `~${Math.round(avgLoss)}` : '–'}</AppText>
              </View>
              <View style={styles.inlineIcon}>
                {avgLoss !== null && avgLoss <= 50 ? (
                  <TrendingDown size={14} color={Palette.primary} />
                ) : (
                  <TrendingUp size={14} color={avgLoss !== null ? Palette.coralDeep : Palette.textMuted} />
                )}
                <AppText variant="bodySm" color={avgLoss !== null && avgLoss <= 50 ? Palette.primary : Palette.textMuted}>
                  {lossDays > 0 ? `Sur ${lossDays} jour${lossDays > 1 ? 's' : ''} notés` : 'Aucune saisie'}
                </AppText>
              </View>
            </View>
          </Card>
        </View>

        {/* Évolution hebdomadaire */}
        <Card style={{ gap: 16 }}>
          <View style={styles.rowBetween}>
            <View style={styles.inlineIconLg}>
              <IconCircle icon={ChartColumn} size={32} />
              <AppText variant="headlineSm">Anxiété de la semaine</AppText>
            </View>
            <Badge label="7 jours" />
          </View>

          <View style={styles.bars}>
            {week.map((d) => {
              const isPeak = peak?.date === d.date;
              const isToday = d.date === todayStr;
              const h = d.score === null ? 44 : 44 + (d.score / 10) * 68;
              return (
                <View key={d.date} style={styles.barCol}>
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
                        color={isPeak ? Palette.onCoral : Palette.textMuted}
                        style={{ fontFamily: Type.labelMd.fontFamily }}>
                        {d.score}
                      </AppText>
                    )}
                    <View
                      style={[
                        styles.barDot,
                        { backgroundColor: isPeak ? Palette.coralDeep : isToday ? Palette.primary : '#C4C7C2' },
                        isPeak && { width: 14, height: 14, borderRadius: 7 },
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

          {(peak || conflictDays > 0) && (
            <View style={styles.insightPill}>
              <TriangleAlert size={17} color={Palette.coralDeep} />
              <AppText variant="bodySm" color={Palette.textVariant} style={{ flex: 1 }}>
                {peak
                  ? `Pic émotionnel ${dayShort(peak.date).toLowerCase()}. (${peak.score}/10${
                      peakLog?.conflictWithHusband ? ', dispute' : ''
                    }${peakLog?.hairLossAmount != null ? `, chute ~${peakLog.hairLossAmount}` : ''})`
                  : `${conflictDays} dispute${conflictDays > 1 ? 's' : ''} de couple cette semaine`}
              </AppText>
            </View>
          )}
        </Card>

        {/* Traitement de fond */}
        <View style={{ gap: 8 }}>
          <View style={[styles.rowBetween, { paddingHorizontal: 4 }]}>
            <AppText variant="headlineSm">Traitement de fond</AppText>
            <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
              <AppText variant="labelSm" color={Palette.primary}>
                Configurer
              </AppText>
            </Pressable>
          </View>
          {fondPlans.length > 0 ? (
            fondPlans.map((p) => (
              <CareRow
                key={p.id}
                icon={Repeat}
                iconBg={Palette.limeSoft}
                iconColor={Palette.primary}
                title={p.name}
                subtitle={p.dosage}
                done={takenMeds.some((m) => m.name.toLowerCase() === p.name.toLowerCase())}
                onPress={() => router.push('/entry')}
              />
            ))
          ) : (
            <CareRow
              icon={Pill}
              iconBg={Palette.limeSoft}
              iconColor={Palette.primary}
              title="Compléments quotidiens"
              subtitle={
                takenMeds.length > 0
                  ? takenMeds.map((m) => m.name).join(', ')
                  : todayLog
                  ? 'Aucun complément coché'
                  : 'Pas encore renseigné'
              }
              done={takenMeds.length > 0}
              onPress={() => router.push('/entry')}
            />
          )}
        </View>

        {/* Cure en cours */}
        {curePlans.length > 0 && (
          <View style={{ gap: 8 }}>
            <View style={[styles.rowBetween, { paddingHorizontal: 4 }]}>
              <AppText variant="headlineSm">Cure en cours</AppText>
              <Badge label={`${curePlans.length} active${curePlans.length > 1 ? 's' : ''}`} tone="limeSoft" />
            </View>
            {curePlans.map((p) => (
              <CareRow
                key={p.id}
                icon={Clock}
                iconBg={Palette.containerLow}
                iconColor={Palette.primary}
                title={p.name}
                subtitle={`${p.dosage} · jusqu'au ${frDate(p.endDate ?? '')}`}
                done={takenMeds.some((m) => m.name.toLowerCase() === p.name.toLowerCase())}
                onPress={() => router.push('/entry')}
              />
            ))}
          </View>
        )}

        {/* Prochaines prises de sang */}
        <View style={{ gap: 8 }}>
          <View style={[styles.rowBetween, { paddingHorizontal: 4 }]}>
            <AppText variant="headlineSm">Prochaines prises de sang</AppText>
            <Pressable onPress={() => router.push('/norms')} hitSlop={8}>
              <AppText variant="labelSm" color={Palette.primary}>
                Bilans
              </AppText>
            </Pressable>
          </View>
          {bloodChecks.map((c) => (
            <BloodCheckRow key={c.code} check={c} onPress={() => router.push('/norms')} />
          ))}
        </View>

        {/* Graphique chute */}
        <Card style={{ gap: 12 }}>
          <View style={styles.rowBetween}>
            <View style={styles.inlineIconLg}>
              <IconCircle icon={Sparkles} size={32} color={Palette.primary} bg={Palette.limeSoft} />
              <AppText variant="headlineSm">Perte de cheveux</AppText>
            </View>
            <Badge label="Dernières saisies" />
          </View>
          {hairChartData.length > 1 ? (
            <PillBarChart data={hairChartData} alertAbove={80} />
          ) : (
            <EmptyHint text="Renseigne au moins 2 estimations de chute dans le journal pour afficher l'évolution." />
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

function CareRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  done,
  badge,
  onPress,
}: {
  icon: typeof Pill;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle: string;
  done?: boolean;
  badge?: string;
  onPress?: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.careRow}>
      <IconCircle icon={icon} size={48} bg={iconBg} color={iconColor} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="labelMd" style={{ fontSize: 15 }} numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="bodySm" color={Palette.textMuted} numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      {badge ? (
        <Badge label={badge} />
      ) : (
        <View style={[styles.checkCircle, done ? { backgroundColor: Palette.lime } : null]}>
          {done && <Check size={17} color={Palette.onLime} strokeWidth={3} />}
        </View>
      )}
    </Card>
  );
}

function BloodCheckRow({ check, onPress }: { check: BloodCheck; onPress?: () => void }) {
  const { due, last, months, dueDate, daysLeft } = check;
  const fg = due ? '#FFFFFF' : Palette.text;
  const muted = due ? 'rgba(255,255,255,0.85)' : Palette.textMuted;

  const lastLine = last
    ? `Dernière : ${last.value} ${last.unit} le ${frDate(last.date)}`
    : 'Aucun résultat enregistré';
  const nextLine =
    dueDate && months !== null
      ? `${due ? 'Prévue le' : 'Prochaine le'} ${frDate(dueDate)} · tous les ${months} mois`
      : 'À faire dès que possible';
  const badge =
    daysLeft === null
      ? 'À faire'
      : daysLeft === 0
      ? "Aujourd'hui"
      : daysLeft < 0
      ? `En retard ${-daysLeft} j`
      : daysLeft <= 60
      ? `Dans ${daysLeft} j`
      : `Dans ${Math.round(daysLeft / 30)} mois`;

  return (
    <Card onPress={onPress} style={[styles.careRow, due && styles.bloodDue]}>
      <IconCircle
        icon={due ? TriangleAlert : Droplet}
        size={48}
        bg={due ? 'rgba(255,255,255,0.2)' : Palette.coralSoft}
        color={due ? '#FFFFFF' : Palette.coralDeep}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="labelMd" style={{ fontSize: 15 }} color={fg} numberOfLines={1}>
          {check.name}
        </AppText>
        <AppText variant="bodySm" color={muted} numberOfLines={1}>
          {lastLine}
        </AppText>
        <AppText variant="bodySm" color={muted} numberOfLines={1}>
          {nextLine}
        </AppText>
      </View>
      <Badge label={badge} tone={due ? 'light' : daysLeft !== null && daysLeft <= 14 ? 'amber' : 'neutral'} />
    </Card>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <AppText variant="bodySm" color={Palette.textMuted} style={{ textAlign: 'center' }}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: Spacing.margin,
    paddingTop: 8,
    paddingBottom: DockClearance,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  ctaCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  bento: { flexDirection: 'row', gap: Spacing.gutter },
  bentoCard: { flex: 1, padding: 16, justifyContent: 'space-between' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  metricRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 2 },
  inlineIcon: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  inlineIconLg: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
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
  insightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.containerLow,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  careRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 24 },
  bloodDue: {
    backgroundColor: Palette.coralDeep,
    shadowColor: Palette.coralDeep,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { paddingVertical: 20, paddingHorizontal: 12 },
});
