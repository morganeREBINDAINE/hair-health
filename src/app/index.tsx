import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
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
  ScanLine,
  CircleCheck,
} from 'lucide-react-native';
import { Palette, Spacing, DockClearance, Type } from '../constants/theme';
import { StorageService } from '../services/storageService';
import { CyclePrediction, CycleStatus, DailyLog, LabMarkerDefinition, LabTest, PlannedCheckup, TreatmentPlan } from '../types';
import { todayIso, shiftIso, dayShort, daysBetween, frDate } from '../lib/dates';
import { getCycleStatus, getPeriods, predictNextPeriod } from '../lib/cycle';
import { AppText, Badge, Card, IconCircle, ScreenHeader, Skeleton, SkeletonCard, type BadgeTone } from '../components/ui';
import { PillBarChart } from '../components/charts';
import { SyncEvent, useInitialSyncing } from '../lib/syncEvent';
import { Toast } from '../lib/toast';
import { computeRecheckReminders, type RecheckReminder } from '../lib/labStatus';
import { checkupLabel } from '../components/analyses/Planning';
import { BloodTestSheet } from '../components/analyses/BloodTestSheet';
import { ExamSheet } from '../components/analyses/ExamSheet';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export default function DashboardScreen() {
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [labMarkers, setLabMarkers] = useState<LabMarkerDefinition[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [checkups, setCheckups] = useState<PlannedCheckup[]>([]);
  const initialSyncing = useInitialSyncing();
  // Rendez-vous en cours de saisie (« C'est fait ») ; `session` sert de key au formulaire
  const [completing, setCompleting] = useState<{ item: PlannedCheckup; session: number } | null>(null);
  const [completeSession, setCompleteSession] = useState(0);

  const loadData = useCallback(async () => {
    try {
      // Tout est lu avant la mise à jour de l'état : le dashboard s'affiche en une seule fois, déjà rempli
      const [all, tests, markers, plans, planned] = await Promise.all([
        StorageService.getAllDailyLogs(),
        StorageService.getLabTests(),
        StorageService.getLabMarkers(),
        StorageService.getTreatmentPlans(),
        StorageService.getPlannedCheckups(),
      ]);
      setLogs(Object.values(all).sort((a, b) => a.date.localeCompare(b.date)));
      setLabTests(tests);
      setLabMarkers(markers);
      setTreatmentPlans(plans);
      setCheckups(planned);
    } catch (e) {
      console.error('Erreur chargement dashboard:', e);
      Toast.error("Impossible de charger l'accueil");
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

  if (initialLoading || initialSyncing) {
    return <DashboardSkeleton />;
  }

  const openCompletion = (item: PlannedCheckup) => {
    setCompleteSession((n) => n + 1);
    setCompleting({ item, session: completeSession + 1 });
  };

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
  const curePlans = activePlans.filter((p) => p.type === 'cure');

  // ── Cycle menstruel ──
  const logsRecord = Object.fromEntries(logs.map((l) => [l.date, l]));
  const cycleStatus = getCycleStatus(logsRecord, todayStr, { includeDate: true });
  const cyclePrediction = predictNextPeriod(getPeriods(logsRecord));

  // ── Contrôles à prévoir et rendez-vous planifiés ──
  const reminders = computeRecheckReminders(labTests, labMarkers, todayStr);
  const upcoming = checkups.filter((c) => !c.done);
  // Les contrôles échus deviennent des rendez-vous : on ne garde ici que ceux qui n'en ont pas encore
  const plannedCodes = new Set(upcoming.filter((c) => c.kind === 'blood').flatMap((c) => c.markerCodes));
  const nextChecks = reminders.filter((r) => !r.due || !plannedCodes.has(r.marker.code));

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

        <CycleRow status={cycleStatus} prediction={cyclePrediction} onPress={() => router.push('/entry')} />

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

        {/* Rendez-vous planifiés */}
        {upcoming.length > 0 && (
          <View style={{ gap: 8 }}>
            <View style={[styles.rowBetween, { paddingHorizontal: 4 }]}>
              <AppText variant="headlineSm">Rendez-vous planifiés</AppText>
              <Badge label={String(upcoming.length)} tone="limeSoft" />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
              style={styles.carouselBleed}>
              {upcoming.map((c) => (
                <PlannedCard
                  key={c.id}
                  item={c}
                  label={checkupLabel(c, labMarkers)}
                  today={todayStr}
                  single={upcoming.length === 1}
                  onOpen={() =>
                    router.push({ pathname: '/analyses', params: { tab: c.kind === 'blood' ? 'tests' : 'exams' } })
                  }
                  onDone={() => openCompletion(c)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Contrôles à prévoir (molécules avec fréquence de suivi) */}
        {nextChecks.length > 0 && (
          <View style={{ gap: 8 }}>
            <View style={[styles.rowBetween, { paddingHorizontal: 4 }]}>
              <AppText variant="headlineSm">Prochaines prises de sang</AppText>
              <Pressable onPress={() => router.push({ pathname: '/analyses', params: { tab: 'tests' } })} hitSlop={8}>
                <AppText variant="labelSm" color={Palette.primary}>
                  Bilans
                </AppText>
              </Pressable>
            </View>
            {nextChecks.map((r) => (
              <BloodCheckRow
                key={r.marker.id}
                check={r}
                onPress={() => router.push({ pathname: '/marker/[id]', params: { id: r.marker.id } })}
              />
            ))}
          </View>
        )}

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

      {completing?.item.kind === 'blood' && (
        <BloodTestSheet
          key={completing.session}
          visible
          onClose={() => setCompleting(null)}
          markers={labMarkers}
          editing={null}
          fromPlan={completing.item}
          onTestsChange={setLabTests}
          onCheckupsChange={setCheckups}
        />
      )}
      {completing?.item.kind === 'exam' && (
        <ExamSheet
          key={completing.session}
          visible
          onClose={() => setCompleting(null)}
          editing={null}
          fromPlan={completing.item}
          // L'accueil n'affiche pas la liste des examens
          onExamsChange={() => {}}
          onCheckupsChange={setCheckups}
        />
      )}
    </View>
  );
}

/** Accueil pendant le chargement : la structure est affichée, les données sont remplacées par des squelettes. */
function DashboardSkeleton() {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Accueil" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={false}>
        <View>
          <AppText variant="labelMd" color={Palette.textVariant}>
            Bonjour 👋
          </AppText>
          <AppText variant="headlineLg" style={{ marginTop: 4 }}>
            Comment te sens-tu aujourd&apos;hui ?
          </AppText>
        </View>
        <View style={styles.bento}>
          <Card style={[styles.bentoCard, { height: 168, gap: 12, justifyContent: 'flex-start' }]}>
            <Skeleton width={36} height={36} radius={18} />
            <Skeleton width="60%" height={34} />
            <Skeleton width="80%" height={12} />
          </Card>
          <Card style={[styles.bentoCard, { height: 168, gap: 12, justifyContent: 'flex-start' }]}>
            <Skeleton width={36} height={36} radius={18} />
            <Skeleton width="60%" height={34} />
            <Skeleton width="80%" height={12} />
          </Card>
        </View>
        <SkeletonCard lines={1} />
        <Card style={{ gap: 16 }}>
          <Skeleton width="50%" height={20} />
          <Skeleton height={120} radius={16} />
        </Card>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Skeleton width={240} height={150} radius={24} />
          <Skeleton width={240} height={150} radius={24} />
        </View>
      </ScrollView>
    </View>
  );
}

/** Carte de rendez-vous : verte pour un examen, rouge pour une prise de sang. */
function PlannedCard({
  item,
  label,
  today,
  single,
  onOpen,
  onDone,
}: {
  item: PlannedCheckup;
  label: string;
  today: string;
  single: boolean;
  onOpen: () => void;
  onDone: () => void;
}) {
  const blood = item.kind === 'blood';
  const fg = blood ? '#FFFFFF' : Palette.obsidian;
  const muted = blood ? 'rgba(255,255,255,0.85)' : 'rgba(18,22,20,0.7)';
  const days = daysBetween(today, item.date);
  const when = days < 0 ? `En retard ${-days} j` : days === 0 ? "Aujourd'hui" : `Dans ${days} j`;

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.plannedCard,
        single && { width: undefined, flex: 1 },
        { backgroundColor: blood ? Palette.coralDeep : Palette.lime },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}>
      <View style={styles.rowBetween}>
        <IconCircle
          icon={blood ? Droplet : ScanLine}
          size={40}
          bg={blood ? 'rgba(255,255,255,0.2)' : 'rgba(18,22,20,0.08)'}
          color={fg}
        />
        <Badge label={when} tone={blood ? 'light' : 'dark'} />
      </View>
      <View style={{ gap: 2, flex: 1 }}>
        <AppText variant="labelSm" color={muted}>
          {blood ? 'Prise de sang' : 'Examen'} · {frDate(item.date)}
        </AppText>
        <AppText variant="labelMd" color={fg} style={{ fontSize: 15 }} numberOfLines={2}>
          {label}
        </AppText>
        {item.note ? (
          <AppText variant="bodySm" color={muted} numberOfLines={1}>
            {item.note}
          </AppText>
        ) : null}
      </View>
      <Pressable
        onPress={onDone}
        accessibilityLabel="C'est fait, saisir le résultat"
        style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.8 }]}>
        <CircleCheck size={16} color={blood ? Palette.coralDeep : Palette.obsidian} />
        <AppText variant="labelMd" color={blood ? Palette.coralDeep : Palette.obsidian}>
          C&apos;est fait
        </AppText>
      </Pressable>
    </Pressable>
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

function BloodCheckRow({ check, onPress }: { check: RecheckReminder; onPress?: () => void }) {
  const { due, last, months, dueDate, daysLeft, marker, status } = check;
  const outOfRange = status === 'low' || status === 'high';
  const fg = due ? '#FFFFFF' : Palette.text;
  const muted = due ? 'rgba(255,255,255,0.85)' : Palette.textMuted;

  const lastLine = last
    ? `Dernière : ${last.value} ${marker.unit} le ${frDate(last.date)}${outOfRange ? ' · hors norme' : ''}`
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
          {marker.name}
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

function CycleRow({
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
    <Card onPress={onPress} style={styles.careRow}>
      <IconCircle icon={Droplet} size={48} bg={Palette.raspberrySoft} color={Palette.raspberry} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="labelMd" style={{ fontSize: 15 }} numberOfLines={1}>
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
  // Le carrousel déborde jusqu'aux bords de l'écran tout en restant aligné sur la marge
  carouselBleed: { marginHorizontal: -Spacing.margin },
  carousel: { paddingHorizontal: Spacing.margin, gap: 12, flexGrow: 1 },
  plannedCard: { width: 250, minHeight: 170, borderRadius: 24, padding: 16, gap: 12 },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
});
