import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CheckupKind, LabMarkerDefinition, LabTest, MedicalExam, PlannedCheckup } from '../types';
import { StorageService } from '../services/storageService';
import { Toast } from '../lib/toast';
import { actionError } from '../lib/errors';
import { SyncEvent, useInitialSyncing } from '../lib/syncEvent';
import { CalendarClock, Plus } from 'lucide-react-native';
import { Palette, Spacing } from '../constants/theme';
import { AppText, PillButton, ScreenHeader, Segmented, SkeletonCard } from '../components/ui';
import { sharedStyles } from '../components/analyses/shared';
import { MoleculesTab } from '../components/analyses/MoleculesTab';
import { BloodTestsTab } from '../components/analyses/BloodTestsTab';
import { ExamsTab } from '../components/analyses/ExamsTab';
import { BloodTestSheet } from '../components/analyses/BloodTestSheet';
import { ExamSheet } from '../components/analyses/ExamSheet';
import { PlanningSheet, checkupLabel } from '../components/analyses/Planning';

type AnalysesTab = 'molecules' | 'tests' | 'exams';
const TABS: AnalysesTab[] = ['molecules', 'tests', 'exams'];

/** Formulaire ouvert : `session` sert de `key` pour repartir d'un état vierge à chaque ouverture. */
type SheetState<T> = { session: number; editing: T | null; fromPlan: PlannedCheckup | null };

export default function AnalysesScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialSyncing = useInitialSyncing();
  const [activeTab, setActiveTab] = useState<AnalysesTab>('molecules');
  const [markers, setMarkers] = useState<LabMarkerDefinition[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [exams, setExams] = useState<MedicalExam[]>([]);
  const [checkups, setCheckups] = useState<PlannedCheckup[]>([]);
  const [cacheLoading, setCacheLoading] = useState(true);
  const loading = cacheLoading || initialSyncing;

  const [session, setSession] = useState(0);
  const [bloodSheet, setBloodSheet] = useState<SheetState<LabTest> | null>(null);
  const [examSheet, setExamSheet] = useState<SheetState<MedicalExam> | null>(null);
  const [planSheet, setPlanSheet] = useState<{ session: number; kind: CheckupKind; editing: PlannedCheckup | null } | null>(
    null,
  );

  const loadAll = useCallback(async () => {
    try {
      const [m, t, e, c] = await Promise.all([
        StorageService.getLabMarkers(),
        StorageService.getLabTests(),
        StorageService.getMedicalExams(),
        StorageService.getPlannedCheckups(),
      ]);
      setMarkers(m);
      setLabTests(t);
      setExams(e);
      setCheckups(c);
    } catch (e) {
      console.error('[analyses] chargement', e);
      Toast.error('Impossible de charger les analyses');
    } finally {
      setCacheLoading(false);
    }
  }, []);

  // Écran monté dès la connexion (lazy: false) : on se rafraîchit à chaque synchro cloud
  useEffect(() => SyncEvent.subscribe(() => loadAll()), [loadAll]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      // Ouverture directe d'un onglet depuis l'accueil (/analyses?tab=exams), puis on consomme le paramètre
      if (params.tab && (TABS as string[]).includes(params.tab)) {
        setActiveTab(params.tab as AnalysesTab);
        router.setParams({ tab: undefined });
      }
    }, [loadAll, params.tab]),
  );

  const nextSession = () => {
    const n = session + 1;
    setSession(n);
    return n;
  };

  const openBlood = (editing: LabTest | null, fromPlan: PlannedCheckup | null = null) =>
    setBloodSheet({ session: nextSession(), editing, fromPlan });
  const openExam = (editing: MedicalExam | null, fromPlan: PlannedCheckup | null = null) =>
    setExamSheet({ session: nextSession(), editing, fromPlan });
  const openPlan = (kind: CheckupKind, editing: PlannedCheckup | null = null) =>
    setPlanSheet({ session: nextSession(), kind, editing });

  const completePlan = (item: PlannedCheckup) => (item.kind === 'blood' ? openBlood(null, item) : openExam(null, item));

  const savePlan = async (item: PlannedCheckup) => {
    try {
      setCheckups(await StorageService.savePlannedCheckup(item));
    } catch (e) {
      console.error('[analyses] enregistrement planification', e);
      Toast.error(actionError(e, 'planifier'));
      throw e;
    }
  };

  const deletePlan = (item: PlannedCheckup) => {
    Alert.alert('Supprimer la planification ?', checkupLabel(item, markers), [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            setCheckups(await StorageService.deletePlannedCheckup(item.id));
          } catch (e) {
            console.error('[analyses] suppression planification', e);
            Toast.error(actionError(e, 'supprimer'));
          }
        },
      },
    ]);
  };

  const pending = (kind: CheckupKind) => checkups.filter((c) => c.kind === kind && !c.done);
  const hasActions = activeTab !== 'molecules';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Analyses" />
      {/* Onglets et actions fixes : seule la liste défile */}
      <View style={styles.fixedBar}>
        <Segmented
          options={[
            { id: 'molecules', label: 'Molécules' },
            { id: 'tests', label: loading ? 'Prises de sang' : `Prises de sang (${labTests.length})` },
            { id: 'exams', label: loading ? 'Examens' : `Examens (${exams.length})` },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
        {hasActions && (
          // Sur les écrans étroits, « Planifier » passe sous le bouton d'ajout plutôt que de tronquer le texte
          <View style={styles.actions}>
            <PillButton
              label={activeTab === 'tests' ? 'Ajouter une prise de sang' : 'Ajouter un examen'}
              icon={Plus}
              variant="lime"
              compact
              disabled={loading}
              onPress={() => (activeTab === 'tests' ? openBlood(null) : openExam(null))}
              style={{ flexGrow: 1 }}
            />
            <PillButton
              label="Planifier"
              icon={CalendarClock}
              variant="ghost"
              compact
              disabled={loading}
              onPress={() => openPlan(activeTab === 'tests' ? 'blood' : 'exam')}
              style={{ flexGrow: 1 }}
            />
          </View>
        )}
      </View>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {activeTab === 'molecules' && (
          <AppText variant="bodyMd" color={Palette.textMuted}>
            Valeurs cibles optimales pour stimuler le follicule et soutenir la repousse — souvent plus exigeantes que
            les normes de laboratoire.
          </AppText>
        )}

        {activeTab === 'molecules' &&
          (loading ? (
            <>
              <SkeletonCard lines={3} height={190} />
              <SkeletonCard lines={3} height={190} />
            </>
          ) : (
            <MoleculesTab markers={markers} labTests={labTests} onMarkersChange={setMarkers} />
          ))}
        {activeTab === 'tests' && (
          <BloodTestsTab
            loading={loading}
            markers={markers}
            labTests={labTests}
            onLabTestsChange={setLabTests}
            planned={pending('blood')}
            onEditTest={(t) => openBlood(t)}
            onCompletePlan={completePlan}
            onEditPlan={(item) => openPlan(item.kind, item)}
            onDeletePlan={deletePlan}
          />
        )}
        {activeTab === 'exams' && (
          <ExamsTab
            loading={loading}
            exams={exams}
            onExamsChange={setExams}
            markers={markers}
            planned={pending('exam')}
            onEditExam={(e) => openExam(e)}
            onCompletePlan={completePlan}
            onEditPlan={(item) => openPlan(item.kind, item)}
            onDeletePlan={deletePlan}
          />
        )}
      </ScrollView>

      {bloodSheet && (
        <BloodTestSheet
          key={bloodSheet.session}
          visible
          onClose={() => setBloodSheet(null)}
          markers={markers}
          editing={bloodSheet.editing}
          fromPlan={bloodSheet.fromPlan}
          onTestsChange={setLabTests}
          onCheckupsChange={setCheckups}
        />
      )}
      {examSheet && (
        <ExamSheet
          key={examSheet.session}
          visible
          onClose={() => setExamSheet(null)}
          editing={examSheet.editing}
          fromPlan={examSheet.fromPlan}
          onExamsChange={setExams}
          onCheckupsChange={setCheckups}
        />
      )}
      {planSheet && (
        <PlanningSheet
          key={planSheet.session}
          visible
          onClose={() => setPlanSheet(null)}
          initialKind={planSheet.kind}
          editing={planSheet.editing}
          markers={markers}
          onSave={savePlan}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  fixedBar: {
    paddingHorizontal: Spacing.margin,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
