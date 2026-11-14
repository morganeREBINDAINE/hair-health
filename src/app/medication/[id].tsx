import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CalendarDays, Pill } from 'lucide-react-native';
import { DailyLog, MedicationDefinition } from '../../types';
import { StorageService } from '../../services/storageService';
import { Palette, Spacing, DockClearance } from '../../constants/theme';
import { AppText, Card, IconCircle, ScreenHeader, SkeletonCard, Toggle } from '../../components/ui';
import { frDate, shiftIso, todayIso } from '../../lib/dates';
import { SyncEvent } from '../../lib/syncEvent';
import { Toast } from '../../lib/toast';
import { actionError } from '../../lib/errors';
import { medKey } from '../../lib/calendarFilters';

/** Fenêtre de calcul de la régularité de prise (jours). */
const ADHERENCE_DAYS = 30;

export default function MedicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [med, setMed] = useState<MedicationDefinition | null>(null);
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const meds = await StorageService.getMedications();
      setMed(meds.find((m) => m.id === id) ?? null);
      setLogs((await StorageService.getAllDailyLogs()) || {});
    } catch (e) {
      console.error('[medication] chargement', e);
      Toast.error('Impossible de charger le traitement');
    } finally {
      setLoaded(true);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Rafraîchi à la fin de chaque synchro cloud
  useEffect(() => SyncEvent.subscribe(() => load()), [load]);

  const showInCalendar = med?.showInCalendar !== false;

  const toggleCalendar = async (next: boolean) => {
    if (!med || saving) return;
    setSaving(true);
    try {
      const meds = await StorageService.setMedicationShowInCalendar(med.id, next);
      setMed(meds.find((m) => m.id === med.id) ?? null);
    } catch (e) {
      console.error('[medication] affichage calendrier', e);
      Toast.error(actionError(e, 'modifier le calendrier'));
    } finally {
      setSaving(false);
    }
  };

  // Jours où ce traitement a été coché comme pris
  const key = med ? medKey(med.name) : '';
  const takenDates = med
    ? Object.values(logs)
        .filter((l) => l.medications?.some((m) => m.taken && medKey(m.name) === key))
        .map((l) => l.date)
        .sort()
    : [];
  const since = shiftIso(todayIso(), -(ADHERENCE_DAYS - 1));
  const takenRecently = takenDates.filter((d) => d >= since).length;
  const lastTaken = takenDates[takenDates.length - 1];

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={med?.name ?? 'Traitement'}
        eyebrow="Traitement"
        right={
          <Pressable
            onPress={() => router.navigate('/settings')}
            style={styles.backBtn}
            hitSlop={6}
            accessibilityLabel="Retour aux paramètres">
            <ArrowLeft size={18} color={Palette.text} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!loaded ? (
          <>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={3} />
          </>
        ) : !med ? (
          <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
            <AppText variant="bodyMd" color={Palette.textMuted}>
              Traitement introuvable.
            </AppText>
          </Card>
        ) : (
          <>
            <View style={styles.inlineLg}>
              <IconCircle icon={Pill} size={44} bg={Palette.limeSoft} color={Palette.primary} />
              <View style={{ flexShrink: 1 }}>
                <AppText variant="headlineLg">{med.name}</AppText>
                <AppText variant="bodySm" color={Palette.textMuted}>
                  {med.defaultDosage ? `Dosage habituel : ${med.defaultDosage}` : 'Aucun dosage par défaut'}
                </AppText>
              </View>
            </View>

            <Card style={{ gap: 12 }}>
              <View style={styles.rowBetween}>
                <View style={[styles.inline, { flexShrink: 1 }]}>
                  <CalendarDays size={18} color={Palette.primary} />
                  <AppText variant="labelMd">Afficher dans le calendrier</AppText>
                </View>
                <View style={styles.inline}>
                  {saving && <ActivityIndicator size="small" color={Palette.primary} />}
                  <View style={saving ? { opacity: 0.5 } : undefined} pointerEvents={saving ? 'none' : 'auto'}>
                    <Toggle value={showInCalendar} onValueChange={toggleCalendar} />
                  </View>
                </View>
              </View>
              <AppText variant="bodySm" color={Palette.textMuted}>
                {showInCalendar
                  ? 'Proposé comme sous-filtre « Traitements » et affiché dans la légende et le détail du jour.'
                  : 'Masqué du calendrier : ni pastille, ni sous-filtre, ni carte du jour.'}
              </AppText>
            </Card>

            <Card style={{ gap: 12 }}>
              <AppText variant="labelMd">Suivi</AppText>
              <View style={styles.rowBetween}>
                <AppText variant="bodyMd" color={Palette.textVariant}>
                  Pré-coché chaque jour
                </AppText>
                <AppText variant="labelMd">{med.isPrechecked ? 'Oui' : 'Non'}</AppText>
              </View>
              <View style={styles.rowBetween}>
                <AppText variant="bodyMd" color={Palette.textVariant}>
                  Pris sur les {ADHERENCE_DAYS} derniers jours
                </AppText>
                <AppText variant="labelMd">
                  {takenRecently} jour{takenRecently > 1 ? 's' : ''}
                </AppText>
              </View>
              <View style={styles.rowBetween}>
                <AppText variant="bodyMd" color={Palette.textVariant}>
                  Dernière prise
                </AppText>
                <AppText variant="labelMd">{lastTaken ? frDate(lastTaken) : '–'}</AppText>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  content: {
    paddingHorizontal: Spacing.margin,
    paddingTop: 8,
    paddingBottom: DockClearance,
    gap: Spacing.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inlineLg: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
