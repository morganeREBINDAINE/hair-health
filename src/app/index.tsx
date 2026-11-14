import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BloodTestSheet } from '../components/analyses/BloodTestSheet';
import { ExamSheet } from '../components/analyses/ExamSheet';
import { PlanningSheet } from '../components/analyses/Planning';
import { CycleRow } from '../components/home/CycleRow';
import { DashboardSkeleton } from '../components/home/DashboardSkeleton';
import { EndPeriodSheet } from '../components/home/EndPeriodSheet';
import { HairLossCard } from '../components/home/HairLossCard';
import { KeyMetrics } from '../components/home/KeyMetrics';
import { MarkersToCheckSection } from '../components/home/MarkersToCheckSection';
import { PlannedSection } from '../components/home/PlannedSection';
import { SleepCard } from '../components/home/SleepCard';
import { TodayStatus } from '../components/home/TodayStatus';
import { ScreenHeader } from '../components/ui';
import { DockClearance, MaxContentWidth, Palette, Spacing } from '../constants/theme';
import { getCycleStatus, getPeriods, predictNextPeriod } from '../lib/cycle';
import { findLastConflict, hairChartPoints, hairLossSummary, isDayLogged, markersToCheck, plannedAgenda, sleepWeek } from '../lib/dashboard';
import { todayIso } from '../lib/dates';
import { actionError } from '../lib/errors';
import { computeRecheckReminders } from '../lib/labStatus';
import { SyncEvent, useInitialSyncing } from '../lib/syncEvent';
import { Toast } from '../lib/toast';
import { StorageService } from '../services/storageService';
import { DailyLog, LabMarkerDefinition, LabTest, PlannedCheckup } from '../types';

export default function DashboardScreen() {
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [labMarkers, setLabMarkers] = useState<LabMarkerDefinition[]>([]);
  const [checkups, setCheckups] = useState<PlannedCheckup[]>([]);
  const initialSyncing = useInitialSyncing();
  // Rendez-vous en cours de saisie (« C'est fait ») ; `session` sert de key au formulaire
  const [completing, setCompleting] = useState<{ item: PlannedCheckup; session: number } | null>(null);
  const [completeSession, setCompleteSession] = useState(0);
  // Fenêtre « Règles arrêtées » ; la valeur sert de key pour repartir des valeurs par défaut
  const [endPeriodSession, setEndPeriodSession] = useState<number | null>(null);
  // Fenêtre « Planifier » d'une molécule à contrôler ; `session` sert de key au formulaire
  const [planning, setPlanning] = useState<{ session: number; codes: string[] } | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Tout est lu avant la mise à jour de l'état : le dashboard s'affiche en une seule fois, déjà rempli
      const [all, tests, markers, planned] = await Promise.all([
        StorageService.getAllDailyLogs(),
        StorageService.getLabTests(),
        StorageService.getLabMarkers(),
        StorageService.getPlannedCheckups(),
      ]);
      setLogs(Object.values(all).sort((a, b) => a.date.localeCompare(b.date)));
      setLabTests(tests);
      setLabMarkers(markers);
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
    return (
      <View style={styles.screen}>
        <DashboardSkeleton contentStyle={styles.content} />
      </View>
    );
  }

  const openCompletion = (item: PlannedCheckup) => {
    setCompleteSession((n) => n + 1);
    setCompleting({ item, session: completeSession + 1 });
  };
  const openEntry = (date?: string) => router.push(date ? { pathname: '/entry', params: { date } } : '/entry');
  const openPlanned = () => router.push({ pathname: '/analyses', params: { tab: 'planned' } });

  const saveEndPeriod = async (date: string, time: string) => {
    try {
      const all = await StorageService.setPeriodEnd(date, time);
      setLogs(Object.values(all).sort((a, b) => a.date.localeCompare(b.date)));
    } catch (e) {
      console.error('[accueil] enregistrement fin des règles', e);
      Toast.error(actionError(e, 'enregistrer la fin des règles'));
      throw e;
    }
  };

  const savePlan = async (item: PlannedCheckup) => {
    try {
      setCheckups(await StorageService.savePlannedCheckup(item));
    } catch (e) {
      console.error('[accueil] enregistrement planification', e);
      Toast.error(actionError(e, 'planifier'));
      throw e;
    }
  };

  const today = todayIso();
  const logsByDate = new Map(logs.map((l) => [l.date, l]));
  const todayLog = logsByDate.get(today);

  const logsRecord = Object.fromEntries(logsByDate);
  const cycleStatus = getCycleStatus(logsRecord, today, { includeDate: true });
  const cyclePrediction = predictNextPeriod(getPeriods(logsRecord));


  return (
    <View style={styles.screen}>
      <ScreenHeader title="Accueil" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.obsidian} />}>
        <TodayStatus today={today} logged={isDayLogged(todayLog)} onOpenEntry={() => openEntry()} />

        <KeyMetrics
          hairLoss={hairLossSummary(logs, today)}
          lastConflict={findLastConflict(logs, today)}
          today={today}
          onOpenConflict={openEntry}
        />

        <CycleRow
          status={cycleStatus}
          prediction={cyclePrediction}
          onPress={() => openEntry()}
          onEndPeriod={() => setEndPeriodSession((n) => (n ?? 0) + 1)}
        />

        <HairLossCard points={hairChartPoints(logs)} />

        <SleepCard sleep={sleepWeek(logs, today)} today={today} />

        <PlannedSection
          agenda={plannedAgenda(checkups, today)}
          markers={labMarkers}
          today={today}
          onSeeAll={openPlanned}
          onDone={openCompletion}
        />

        <MarkersToCheckSection
          items={markersToCheck(computeRecheckReminders(labTests, labMarkers, today), checkups)}
          onSeeAll={() => router.push({ pathname: '/analyses', params: { tab: 'tests' } })}
          onOpenMarker={(id) => router.push({ pathname: '/marker/[id]', params: { id } })}
          onPlan={(marker) => setPlanning((p) => ({ session: (p?.session ?? 0) + 1, codes: [marker.code] }))}
        />
      </ScrollView>

      {endPeriodSession !== null && cycleStatus.kind === 'ongoing' && (
        <EndPeriodSheet
          key={endPeriodSession}
          visible
          onClose={() => setEndPeriodSession(null)}
          period={cycleStatus.period}
          onSave={saveEndPeriod}
        />
      )}
      {planning && (
        <PlanningSheet
          key={planning.session}
          visible
          onClose={() => setPlanning(null)}
          initialKind="blood"
          initialCodes={planning.codes}
          editing={null}
          markers={labMarkers}
          onSave={savePlan}
        />
      )}
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
          onExamsChange={() => { }}
          onCheckupsChange={setCheckups}
        />
      )}
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
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
