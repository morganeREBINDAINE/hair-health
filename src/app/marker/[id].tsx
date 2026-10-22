import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView, useWindowDimensions, ActivityIndicator } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CircleCheck, Droplet, TriangleAlert, ChartLine, BellRing } from 'lucide-react-native';
import { LabMarkerDefinition, LabTest } from '../../types';
import { StorageService } from '../../services/storageService';
import { Palette, Spacing, DockClearance, Radius } from '../../constants/theme';
import { AppText, Badge, Card, IconCircle, ScreenHeader, Segmented } from '../../components/ui';
import { TimeSeriesChart } from '../../components/charts';
import { frDate, todayIso } from '../../lib/dates';
import { Toast } from '../../lib/toast';
import { actionError } from '../../lib/errors';
import { computeRecheckReminders, OUT_OF_RANGE_RECHECK_MONTHS } from '../../lib/labStatus';

type Frequency = 'none' | '6' | '12';

type Period = '6m' | '1y' | '3y' | '5y';

const PERIOD_MONTHS: Record<Period, number> = { '6m': 6, '1y': 12, '3y': 36, '5y': 60 };

function monthsAgoIso(months: number): string {
  const d = new Date(`${todayIso()}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

export default function MarkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<Period>('1y');
  const [marker, setMarker] = useState<LabMarkerDefinition | null>(null);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [savingFrequency, setSavingFrequency] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const markers = await StorageService.getLabMarkers();
          setMarker(markers.find((m) => m.id === id) ?? null);
          setLabTests(await StorageService.getLabTests());
        } catch (e) {
          console.error('Erreur chargement analyse:', e);
          Toast.error("Impossible de charger l'analyse");
        }
      })();
    }, [id])
  );

  // Toutes les mesures de cette analyse, de la plus récente à la plus ancienne
  const history = labTests
    .filter((t) => t.values[id] !== undefined)
    .map((t) => ({ date: t.date, value: t.values[id] }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const fromIso = monthsAgoIso(PERIOD_MONTHS[period]);
  const toIso = todayIso();
  const inPeriod = history.filter((p) => p.date >= fromIso && p.date <= toIso).reverse();
  const chartWidth = Math.min(width, 640) - Spacing.margin * 2 - 40;

  const goBack = () => router.navigate('/analyses');

  const frequency: Frequency = marker?.recheckMonths ? (String(marker.recheckMonths) as Frequency) : 'none';
  const reminder = marker?.recheckMonths ? computeRecheckReminders(labTests, [marker], todayIso())[0] : null;

  const changeFrequency = async (next: Frequency) => {
    if (!marker || savingFrequency || next === frequency) return;
    setSavingFrequency(true);
    try {
      const recheckMonths = next === 'none' ? null : (Number(next) as 6 | 12);
      await StorageService.saveLabMarker({ ...marker, recheckMonths });
      // Contrôle déjà échu : le rendez-vous de prise de sang est créé tout de suite
      try {
        await StorageService.ensureAutoCheckups(todayIso());
      } catch (e) {
        console.error('[marker] rendez-vous automatique', e);
        Toast.error(`Suivi enregistré, mais ${actionError(e, 'créer le rendez-vous automatique').toLowerCase()}`);
      }
      const markers = await StorageService.getLabMarkers();
      setMarker(markers.find((m) => m.id === marker.id) ?? null);
    } catch (e) {
      console.error('[marker] fréquence de suivi', e);
      Toast.error(actionError(e, 'modifier le suivi'));
    } finally {
      setSavingFrequency(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={marker?.name ?? 'Analyse'}
        eyebrow="Évolution"
        right={
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={6} accessibilityLabel="Retour aux analyses">
            <ArrowLeft size={18} color={Palette.text} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!marker ? (
          <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
            <AppText variant="bodyMd" color={Palette.textMuted}>
              Analyse introuvable.
            </AppText>
          </Card>
        ) : (
          <>
            <View style={styles.inlineLg}>
              <IconCircle icon={Droplet} size={44} bg={Palette.limeSoft} color={Palette.primary} />
              <View style={{ flexShrink: 1 }}>
                <AppText variant="headlineLg">{marker.name}</AppText>
                <AppText variant="bodySm" color={Palette.textMuted}>
                  Cible fonctionnelle : {marker.minFunctional} – {marker.maxFunctional} {marker.unit}
                </AppText>
              </View>
            </View>

            <Card style={{ gap: 12 }}>
              <View style={styles.rowBetween}>
                <View style={styles.inline}>
                  <BellRing size={18} color={Palette.primary} />
                  <AppText variant="labelMd">Fréquence de contrôle</AppText>
                </View>
                {savingFrequency && <ActivityIndicator size="small" color={Palette.primary} />}
              </View>
              <Segmented
                options={[
                  { id: 'none', label: 'Aucun suivi' },
                  { id: '6', label: '6 mois' },
                  { id: '12', label: '1 an' },
                ]}
                value={frequency}
                onChange={changeFrequency}
                style={savingFrequency ? { opacity: 0.5 } : undefined}
              />
              <AppText variant="bodySm" color={Palette.textMuted}>
                {frequency === 'none'
                  ? "Pas de rappel sur l'accueil pour cette molécule."
                  : `Dans la norme : contrôle tous les ${frequency === '12' ? 'ans' : '6 mois'}. Hors norme : tous les ${OUT_OF_RANGE_RECHECK_MONTHS} mois.`}
              </AppText>
              {reminder && (
                <AppText variant="labelMd" color={reminder.due ? Palette.coralDeep : Palette.text}>
                  {!reminder.dueDate
                    ? 'Aucune valeur : contrôle à faire'
                    : reminder.due
                    ? `Contrôle à faire depuis le ${frDate(reminder.dueDate)}`
                    : `Prochain contrôle le ${frDate(reminder.dueDate)}`}
                </AppText>
              )}
            </Card>

            <Segmented
              options={[
                { id: '6m', label: '6 mois' },
                { id: '1y', label: '1 an' },
                { id: '3y', label: '3 ans' },
                { id: '5y', label: '5 ans' },
              ]}
              value={period}
              onChange={setPeriod}
              style={{ alignSelf: 'flex-start' }}
            />

            <Card style={{ gap: 12 }}>
              <View style={styles.rowBetween}>
                <AppText variant="labelMd">Évolution ({marker.unit})</AppText>
                <Badge label={`${inPeriod.length} mesure${inPeriod.length > 1 ? 's' : ''}`} tone="limeSoft" dot />
              </View>
              {inPeriod.length === 0 ? (
                <View style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
                  <IconCircle icon={ChartLine} size={48} />
                  <AppText variant="bodyMd" color={Palette.textMuted} style={{ textAlign: 'center' }}>
                    Aucune prise de sang sur cette période.
                  </AppText>
                </View>
              ) : (
                <TimeSeriesChart
                  points={inPeriod}
                  width={chartWidth}
                  min={marker.minFunctional}
                  max={marker.maxFunctional}
                  fromIso={fromIso}
                  toIso={toIso}
                />
              )}
              <View style={styles.inline}>
                <View style={styles.legendBand} />
                <AppText variant="labelSm" color={Palette.textMuted}>
                  Zone optimale : {marker.minFunctional} – {marker.maxFunctional} {marker.unit}
                </AppText>
              </View>
            </Card>

            <AppText variant="headlineSm" style={{ marginTop: 4 }}>
              Prises de sang
            </AppText>

            {history.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
                <AppText variant="bodyMd" color={Palette.textMuted}>
                  Aucune valeur enregistrée pour cette analyse.
                </AppText>
              </Card>
            ) : (
              <Card style={{ gap: 6 }}>
                {history.map((p, i) => {
                  const ok = p.value >= marker.minFunctional && p.value <= marker.maxFunctional;
                  const Icon = ok ? CircleCheck : TriangleAlert;
                  return (
                    <View key={`${p.date}-${i}`} style={styles.resultRow}>
                      <AppText variant="bodyMd" color={Palette.textVariant}>
                        {frDate(p.date)}
                      </AppText>
                      <View style={styles.inline}>
                        <AppText variant="labelMd" style={{ fontSize: 15 }}>
                          {p.value} {marker.unit}
                        </AppText>
                        <Icon size={16} color={ok ? Palette.primary : Palette.coralDeep} />
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}
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
  legendBand: {
    width: 22,
    height: 10,
    borderRadius: 3,
    backgroundColor: Palette.limeSoft,
    borderWidth: 1,
    borderColor: Palette.limeDim,
    borderStyle: 'dashed',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: Palette.containerLow,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
