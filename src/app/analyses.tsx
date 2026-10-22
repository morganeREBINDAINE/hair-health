import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CheckupKind, LabMarkerDefinition, LabTest, MedicalExam, PlannedCheckup } from '../types';
import { StorageService } from '../services/storageService';
import { Toast } from '../lib/toast';
import { SyncEvent } from '../lib/syncEvent';
import { DataLoading } from '../components/DataLoader';
import { Palette } from '../constants/theme';
import { AppText, ScreenHeader, Segmented } from '../components/ui';
import { sharedStyles } from '../components/analyses/shared';
import { MoleculesTab } from '../components/analyses/MoleculesTab';
import { BloodTestsTab } from '../components/analyses/BloodTestsTab';
import { ExamsTab } from '../components/analyses/ExamsTab';
import { PlanningSheet, checkupLabel } from '../components/analyses/Planning';

type AnalysesTab = 'molecules' | 'tests' | 'exams';
const TABS: AnalysesTab[] = ['molecules', 'tests', 'exams'];

export default function AnalysesScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<AnalysesTab>('molecules');
  const [markers, setMarkers] = useState<LabMarkerDefinition[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [exams, setExams] = useState<MedicalExam[]>([]);
  const [checkups, setCheckups] = useState<PlannedCheckup[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Planification
  const [planVisible, setPlanVisible] = useState(false);
  const [planKind, setPlanKind] = useState<CheckupKind>('blood');
  const [editingPlan, setEditingPlan] = useState<PlannedCheckup | null>(null);
  const [planSession, setPlanSession] = useState(0);

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
      setInitialLoading(false);
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

  const openPlan = (kind: CheckupKind) => {
    setEditingPlan(null);
    setPlanKind(kind);
    setPlanSession((n) => n + 1);
    setPlanVisible(true);
  };

  const editPlan = (item: PlannedCheckup) => {
    setEditingPlan(item);
    setPlanKind(item.kind);
    setPlanSession((n) => n + 1);
    setPlanVisible(true);
  };

  const savePlan = async (item: PlannedCheckup) => {
    try {
      setCheckups(await StorageService.savePlannedCheckup(item));
    } catch (e) {
      console.error('[analyses] enregistrement planification', e);
      Toast.error('Connexion requise pour planifier');
      throw e;
    }
  };

  const markDone = async (item: PlannedCheckup) => {
    try {
      setCheckups(await StorageService.savePlannedCheckup({ ...item, done: true }));
    } catch (e) {
      console.error('[analyses] clôture planification', e);
      Toast.error('Résultat enregistré, mais la planification reste ouverte');
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
            Toast.error('Connexion requise pour supprimer');
          }
        },
      },
    ]);
  };

  const pending = (kind: CheckupKind) => checkups.filter((c) => c.kind === kind && !c.done);

  if (initialLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Analyses" />
        <DataLoading />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Analyses" />
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={{ gap: 14 }}>
          {activeTab === 'molecules' && (
            <AppText variant="bodyMd" color={Palette.textMuted}>
              Valeurs cibles optimales pour stimuler le follicule et soutenir la repousse — souvent plus exigeantes que
              les normes de laboratoire.
            </AppText>
          )}
          <Segmented
            options={[
              { id: 'molecules', label: 'Molécules' },
              { id: 'tests', label: `Prises de sang (${labTests.length})` },
              { id: 'exams', label: `Examens (${exams.length})` },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </View>

        {activeTab === 'molecules' && (
          <MoleculesTab markers={markers} labTests={labTests} onMarkersChange={setMarkers} />
        )}
        {activeTab === 'tests' && (
          <BloodTestsTab
            markers={markers}
            labTests={labTests}
            onLabTestsChange={setLabTests}
            planned={pending('blood')}
            onPlan={() => openPlan('blood')}
            onEditPlan={editPlan}
            onDeletePlan={deletePlan}
            onCheckupDone={markDone}
          />
        )}
        {activeTab === 'exams' && (
          <ExamsTab
            exams={exams}
            onExamsChange={setExams}
            markers={markers}
            planned={pending('exam')}
            onPlan={() => openPlan('exam')}
            onEditPlan={editPlan}
            onDeletePlan={deletePlan}
            onCheckupDone={markDone}
          />
        )}
      </ScrollView>

      <PlanningSheet
        key={planSession}
        visible={planVisible}
        onClose={() => setPlanVisible(false)}
        initialKind={planKind}
        editing={editingPlan}
        markers={markers}
        onSave={savePlan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
});
