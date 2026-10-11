import React, { useState, useCallback, useEffect } from 'react';
import { Toast } from '../lib/toast';
import { SyncEvent } from '../lib/syncEvent';
import { DataLoading } from '../components/DataLoader';
import { View, StyleSheet, Pressable, ScrollView, TextInput, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  Syringe,
  Plus,
  Pencil,
  Trash2,
  CircleCheck,
  TriangleAlert,
  Check,
  X,
  SlidersHorizontal,
  Droplet,
  FlaskConical,
  CalendarDays,
  ArrowRight,
  Eye,
  EyeOff,
  ChevronLeft,
} from 'lucide-react-native';
import { LabMarkerDefinition, LabTest } from '../types';
import { StorageService } from '../services/storageService';
import { Calendar } from 'react-native-calendars';
import { Palette, Spacing, DockClearance, Radius, Type } from '../constants/theme';
import {
  AppText,
  Badge,
  Card,
  IconCircle,
  PillButton,
  ScreenHeader,
  Segmented,
  inputStyle,
  type BadgeTone,
} from '../components/ui';
import { frDate, todayIso } from '../lib/dates';
import '../lib/calendarLocale';

type Status = 'low' | 'high' | 'ok' | 'none';
type PickerStep = 'year' | 'month' | 'day';

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function statusOf(value: number | undefined, m: LabMarkerDefinition): Status {
  if (value === undefined) return 'none';
  if (value < m.minFunctional) return 'low';
  if (value > m.maxFunctional) return 'high';
  return 'ok';
}

const STATUS_BADGE: Record<Status, { label: string; tone: BadgeTone }> = {
  ok: { label: 'Optimal', tone: 'limeSoft' },
  low: { label: 'Trop bas', tone: 'coralSoft' },
  high: { label: 'Trop haut', tone: 'amber' },
  none: { label: 'Sans valeur', tone: 'neutral' },
};

/** Jauge horizontale : zone basse / zone optimale / zone haute + curseur. */
function RangeTrack({ value, m }: { value?: number; m: LabMarkerDefinition }) {
  const span = Math.max(m.maxFunctional - m.minFunctional, 0.0001);
  const lo = Math.max(0, m.minFunctional - span * 0.8);
  const hi = m.maxFunctional + span * 0.8;
  const pct = (x: number) => ((Math.min(Math.max(x, lo), hi) - lo) / (hi - lo)) * 100;
  const minPct = pct(m.minFunctional);
  const maxPct = pct(m.maxFunctional);
  const fmt = (x: number) => String(Math.round(x * 10) / 10);

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.track}>
        <View style={[styles.zone, { left: 0, width: `${minPct}%`, backgroundColor: Palette.coralSoft }]} />
        <View
          style={[styles.zone, { left: `${minPct}%`, width: `${maxPct - minPct}%`, backgroundColor: Palette.lime }]}
        />
        <View style={[styles.zone, { left: `${maxPct}%`, right: 0, backgroundColor: Palette.amberSoft }]} />
        {value !== undefined && <View style={[styles.needle, { left: `${pct(value)}%` }]} />}
      </View>
      <View style={styles.rowBetween}>
        <AppText variant="labelSm" color={Palette.textMuted}>
          {fmt(lo)}
        </AppText>
        <AppText variant="labelSm" color={Palette.primary}>
          Idéal : {m.minFunctional} – {m.maxFunctional}
        </AppText>
        <AppText variant="labelSm" color={Palette.textMuted}>
          {fmt(hi)}
        </AppText>
      </View>
    </View>
  );
}

export default function NormsScreen() {
  const [activeTab, setActiveTab] = useState<'norms' | 'tests'>('norms');
  const [showHidden, setShowHidden] = useState(false);
  const [markers, setMarkers] = useState<LabMarkerDefinition[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Modal Ajout/Modification de Norme
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [markerName, setMarkerName] = useState('');
  const [markerMin, setMarkerMin] = useState('');
  const [markerMax, setMarkerMax] = useState('');
  const [markerUnit, setMarkerUnit] = useState('');
  const [markerDesc, setMarkerDesc] = useState('');

  // Modal Saisie de Prise de Sang
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [testDate, setTestDate] = useState(todayIso());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerStep, setPickerStep] = useState<PickerStep>('year');
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [testNotes, setTestNotes] = useState('');
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [loadedMarkers, loadedTests] = await Promise.all([
        StorageService.getLabMarkers(),
        StorageService.getLabTests(),
      ]);
      setMarkers(loadedMarkers);
      setLabTests(loadedTests);
    } catch (e) {
      console.error('Erreur chargement normes:', e);
      Toast.error('Impossible de charger les normes');
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // Écran monté dès la connexion (lazy: false) : on se rafraîchit à chaque synchro cloud
  useEffect(() => {
    return SyncEvent.subscribe(() => {
      loadAll();
    });
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const handleEditMarker = (marker: LabMarkerDefinition) => {
    setEditingMarkerId(marker.id);
    setMarkerName(marker.name);
    setMarkerMin(String(marker.minFunctional));
    setMarkerMax(String(marker.maxFunctional));
    setMarkerUnit(marker.unit);
    setMarkerDesc(marker.description || '');
    setShowMarkerModal(true);
  };

  const handleOpenAddMarker = () => {
    setEditingMarkerId(null);
    setMarkerName('');
    setMarkerMin('');
    setMarkerMax('');
    setMarkerUnit('µg/L');
    setMarkerDesc('');
    setShowMarkerModal(true);
  };

  const handleToggleMarkerHidden = async (marker: LabMarkerDefinition) => {
    try {
      const updated = { ...marker, hidden: !marker.hidden };
      setMarkers(await StorageService.saveLabMarker(updated));
    } catch {
      Toast.error('Connexion requise pour modifier');
    }
  };

  const handleDeleteMarker = (marker: LabMarkerDefinition) => {
    Alert.alert(
      'Supprimer cette molécule ?',
      `« ${marker.name} » sera définitivement supprimée. Les valeurs déjà enregistrées dans tes prises de sang seront conservées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setMarkers(await StorageService.deleteLabMarker(marker.id));
            } catch {
              Toast.error('Connexion requise pour supprimer');
            }
          },
        },
      ],
    );
  };

  const handleSaveMarker = async () => {
    if (!markerName.trim() || !markerMin || !markerMax || !markerUnit.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner le nom, min, max et unité.');
      return;
    }
    const minVal = parseFloat(markerMin.replace(',', '.'));
    const maxVal = parseFloat(markerMax.replace(',', '.'));
    if (isNaN(minVal) || isNaN(maxVal)) {
      Alert.alert('Valeurs invalides', 'Min et Max doivent être des nombres.');
      return;
    }

    const newMarker: LabMarkerDefinition = {
      id: editingMarkerId || `marker-${Date.now()}`,
      code: markerName.toLowerCase().replace(/\s+/g, '_'),
      name: markerName.trim(),
      minFunctional: minVal,
      maxFunctional: maxVal,
      unit: markerUnit.trim(),
      description: markerDesc.trim(),
      displayOrder: markers.length + 1,
    };

    setSaving(true);
    try {
      setMarkers(await StorageService.saveLabMarker(newMarker));
      setShowMarkerModal(false);
    } catch {
      Toast.error('Connexion requise pour enregistrer');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddTest = () => {
    setEditingTest(null);
    setTestDate(todayIso());
    setShowDatePicker(false);
    setTestNotes('');
    setTestValues({});
    setShowTestModal(true);
  };

  const handleEditTest = (test: LabTest) => {
    setEditingTest(test);
    setTestDate(test.date);
    setShowDatePicker(false);
    setTestNotes(test.notes || '');
    setTestValues(Object.fromEntries(Object.entries(test.values).map(([id, v]) => [id, String(v)])));
    setShowTestModal(true);
  };

  const handleSaveTest = async () => {
    const numericValues: Record<string, number> = {};
    if (editingTest) {
      Object.entries(editingTest.values).forEach(([id, v]) => {
        if (!markers.some((m) => m.id === id)) numericValues[id] = v;
      });
    }
    Object.entries(testValues).forEach(([markerId, valStr]) => {
      if (valStr.trim() !== '') {
        const parsed = parseFloat(valStr.replace(',', '.'));
        if (!isNaN(parsed)) numericValues[markerId] = parsed;
      }
    });

    if (Object.keys(numericValues).length === 0) {
      Alert.alert('Attention', "Veuillez saisir au moins une valeur d'analyse.");
      return;
    }

    const test: LabTest = {
      id: editingTest?.id ?? `test-${Date.now()}`,
      date: testDate,
      notes: testNotes.trim(),
      values: numericValues,
    };

    setSaving(true);
    try {
      setLabTests(await StorageService.saveLabTest(test));
      setShowTestModal(false);
      Alert.alert('Succès', editingTest ? 'Bilan de prise de sang modifié.' : 'Bilan de prise de sang enregistré.');
      setEditingTest(null);
    } catch {
      Toast.error('Connexion requise pour enregistrer');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTest = async (id: string) => {
    Alert.alert('Confirmer', 'Supprimer ce bilan de prise de sang ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            setLabTests(await StorageService.deleteLabTest(id));
          } catch {
            Toast.error('Connexion requise pour supprimer');
          }
        },
      },
    ]);
  };

  // Dernière valeur connue pour chaque analyse
  const testsDesc = [...labTests].sort((a, b) => b.date.localeCompare(a.date));
  const latest = new Map<string, { value: number; date: string }>();
  testsDesc.forEach((t) => {
    Object.entries(t.values).forEach(([id, v]) => {
      if (!latest.has(id)) latest.set(id, { value: v, date: t.date });
    });
  });
  const visibleMarkers = markers.filter((m) => !m.hidden);
  const hiddenCount = markers.filter((m) => m.hidden).length;
  const withStatus = visibleMarkers.map((m) => ({ m, last: latest.get(m.id), status: statusOf(latest.get(m.id)?.value, m) }));
  const hiddenWithStatus = markers.filter((m) => m.hidden).map((m) => ({ m, last: latest.get(m.id), status: statusOf(latest.get(m.id)?.value, m) }));
  const markerMap = new Map(markers.map((m) => [m.id, m]));

  if (initialLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Normes bilan" />
        <DataLoading />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Normes bilan" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contexte */}
        <View style={{ gap: 14 }}>
          <AppText variant="bodyMd" color={Palette.textMuted}>
            Valeurs cibles optimales pour stimuler le follicule et soutenir la repousse — souvent plus exigeantes que
            les normes de laboratoire.
          </AppText>
          <PillButton label="Saisir une prise de sang" icon={ArrowRight} variant="lime" onPress={handleOpenAddTest} />
          <Segmented
            options={[
              { id: 'norms', label: 'Normes' },
              { id: 'tests', label: `Mes prises de sang (${labTests.length})` },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            size="lg"
          />
        </View>

        {activeTab === 'norms' ? (
          <>
            {withStatus.length === 0 && (
              <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
                <IconCircle icon={FlaskConical} size={48} />
                <AppText variant="bodyMd" color={Palette.textMuted} style={{ textAlign: 'center' }}>
                  Aucune analyse dans cette catégorie.
                </AppText>
              </Card>
            )}

            {withStatus.map(({ m, last, status }) => {
              const badge = STATUS_BADGE[status];
              const alert = status === 'low' || status === 'high';
              return (
                <Card
                  key={m.id}
                  onPress={() => router.push({ pathname: '/marker/[id]', params: { id: m.id } })}
                  style={[{ gap: 16 }, alert && { borderWidth: 1, borderColor: Palette.coralSoft }]}>
                  <View style={styles.rowBetweenTop}>
                    <View style={styles.inlineLg}>
                      <IconCircle
                        icon={Droplet}
                        size={44}
                        bg={alert ? Palette.coralSoft : Palette.limeSoft}
                        color={alert ? Palette.coralDeep : Palette.primary}
                      />
                      <View style={{ flexShrink: 1 }}>
                        <AppText variant="headlineSm" style={{ fontSize: 17 }}>
                          {m.name}
                        </AppText>
                        {m.description ? (
                          <AppText variant="bodySm" color={Palette.textMuted} numberOfLines={2}>
                            {m.description}
                          </AppText>
                        ) : null}
                      </View>
                    </View>
                    <Badge
                      label={badge.label}
                      tone={badge.tone}
                      icon={status === 'ok' ? CircleCheck : alert ? TriangleAlert : undefined}
                    />
                  </View>

                  <View style={styles.metricRow}>
                    <View style={styles.metricValue}>
                      <AppText variant="metric">{last ? last.value : '–'}</AppText>
                      <AppText variant="labelMd" color={Palette.textMuted}>
                        {m.unit}
                      </AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText variant="labelSm" color={Palette.textMuted}>
                        Cible fonctionnelle
                      </AppText>
                      <AppText variant="labelMd">
                        {m.minFunctional} – {m.maxFunctional} {m.unit}
                      </AppText>
                    </View>
                  </View>

                  <RangeTrack value={last?.value} m={m} />

                  <View style={[styles.rowBetween, styles.cardFooter]}>
                    <AppText variant="bodySm" color={Palette.textMuted} style={{ flexShrink: 1 }}>
                      {last ? `Mesuré le ${frDate(last.date)}` : 'Pas encore mesuré'}
                    </AppText>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable onPress={() => handleToggleMarkerHidden(m)} hitSlop={6} style={styles.editBtn}>
                        <EyeOff size={16} color={Palette.textMuted} />
                      </Pressable>
                      <PillButton label="Ajuster taux optimaux" icon={Pencil} variant="ghost" compact onPress={() => handleEditMarker(m)} />
                    </View>
                  </View>
                </Card>
              );
            })}

            {hiddenCount > 0 && (
              <Pressable
                onPress={() => setShowHidden((v) => !v)}
                style={({ pressed }) => [styles.addRow, pressed && { transform: [{ scale: 0.98 }] }]}>
                <View style={[styles.addIcon, { backgroundColor: Palette.container }]}>
                  {showHidden ? <Eye size={18} color={Palette.text} /> : <EyeOff size={18} color={Palette.textMuted} />}
                </View>
                <AppText variant="labelMd" color={Palette.textMuted}>
                  {showHidden
                    ? 'Masquer'
                    : 'Afficher ' + hiddenCount + (hiddenCount > 1 ? ' molecules masquees' : ' molecule masquee')}
                </AppText>
              </Pressable>
            )}

            {showHidden && hiddenWithStatus.map(({ m, last, status }) => {
              const badge = STATUS_BADGE[status];
              const alert = status === 'low' || status === 'high';
              return (
                <Card
                  key={m.id}
                  onPress={() => router.push({ pathname: '/marker/[id]', params: { id: m.id } })}
                  style={[{ gap: 16, opacity: 0.6 }, alert && { borderWidth: 1, borderColor: Palette.coralSoft }]}>
                  <View style={styles.rowBetweenTop}>
                    <View style={styles.inlineLg}>
                      <IconCircle icon={Droplet} size={44} bg={Palette.container} color={Palette.textMuted} />
                      <View style={{ flexShrink: 1 }}>
                        <AppText variant="headlineSm" style={{ fontSize: 17 }}>{m.name}</AppText>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable onPress={() => handleToggleMarkerHidden(m)} hitSlop={6} style={styles.editBtn}>
                        <Eye size={18} color={Palette.textMuted} />
                      </Pressable>
                      <Pressable onPress={() => handleEditMarker(m)} hitSlop={6} style={styles.editBtn}>
                        <Pencil size={16} color={Palette.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                </Card>
              );
            })}

            <Pressable
              onPress={handleOpenAddMarker}
              style={({ pressed }) => [styles.addRow, pressed && { transform: [{ scale: 0.98 }] }]}>
              <View style={styles.addIcon}>
                <Plus size={18} color={Palette.obsidian} strokeWidth={2.6} />
              </View>
              <AppText variant="labelMd">Ajouter une molécule / analyse</AppText>
            </Pressable>
          </>
        ) : (
          <>
            <PillButton label="Enregistrer une nouvelle prise de sang" icon={Plus} onPress={handleOpenAddTest} />

            {labTests.length === 0 ? (
              <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 32 }}>
                <IconCircle icon={Syringe} size={52} />
                <AppText variant="headlineSm">Aucune prise de sang</AppText>
                <AppText variant="bodySm" color={Palette.textMuted} style={{ textAlign: 'center' }}>
                  Renseigne tes résultats (Ferritine, TSH, T3, T4, Anti-TPO, NFS…) pour suivre leur évolution.
                </AppText>
              </Card>
            ) : (
              testsDesc.map((test) => (
                <Card key={test.id} style={{ gap: 14 }}>
                  <View style={styles.rowBetween}>
                    <View style={styles.inlineLg}>
                      <IconCircle icon={CalendarDays} size={40} bg={Palette.coralSoft} color={Palette.coralDeep} />
                      <View>
                        <AppText variant="labelSm" color={Palette.textMuted}>
                          Bilan du
                        </AppText>
                        <AppText variant="headlineSm">{frDate(test.date)}</AppText>
                      </View>
                    </View>
                    <View style={styles.testActions}>
                      <Pressable
                        onPress={() => handleEditTest(test)}
                        style={styles.editBtn}
                        hitSlop={6}
                        accessibilityLabel="Modifier ce bilan">
                        <Pencil size={16} color={Palette.text} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteTest(test.id)}
                        style={styles.deleteBtn}
                        hitSlop={6}
                        accessibilityLabel="Supprimer ce bilan">
                        <Trash2 size={17} color={Palette.coralDeep} />
                      </Pressable>
                    </View>
                  </View>

                  {test.notes ? (
                    <AppText variant="bodySm" color={Palette.textVariant} style={{ fontStyle: 'italic' }}>
                      « {test.notes} »
                    </AppText>
                  ) : null}

                  <View style={{ gap: 6 }}>
                    {Object.entries(test.values).map(([markerId, val]) => {
                      const marker = markerMap.get(markerId);
                      const st = marker ? statusOf(val, marker) : 'ok';
                      const b = STATUS_BADGE[st];
                      return (
                        <View key={markerId} style={styles.resultRow}>
                          <View style={{ flexShrink: 1 }}>
                            <AppText variant="bodySm" color={Palette.textMuted}>
                              {marker ? marker.name : markerId}
                            </AppText>
                            <AppText variant="labelMd" style={{ fontSize: 15 }}>
                              {val} {marker?.unit ?? ''}
                            </AppText>
                          </View>
                          <Badge
                            label={
                              st === 'low' && marker
                                ? `< ${marker.minFunctional}`
                                : st === 'high' && marker
                                ? `> ${marker.maxFunctional}`
                                : b.label
                            }
                            tone={b.tone}
                            icon={st === 'ok' ? CircleCheck : TriangleAlert}
                          />
                        </View>
                      );
                    })}
                  </View>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Modal Ajout/Modif Norme */}
      <BottomSheet
        visible={showMarkerModal}
        onClose={() => setShowMarkerModal(false)}
        title={editingMarkerId ? 'Ajuster les seuils cibles' : 'Ajouter une analyse'}
        subtitle="Personnalise tes objectifs fonctionnels">
        <Field label="Nom de la molécule / analyse">
          <TextInput
            style={inputStyle}
            value={markerName}
            onChangeText={setMarkerName}
            placeholder="Ex : Ferritine, Zinc, TSH…"
            placeholderTextColor={Palette.textMuted}
          />
        </Field>
        <View style={styles.rowFields}>
          <Field label="Cible min." style={{ flex: 1 }}>
            <TextInput
              style={inputStyle}
              keyboardType="numeric"
              value={markerMin}
              onChangeText={setMarkerMin}
              placeholder="70"
              placeholderTextColor={Palette.textMuted}
            />
          </Field>
          <Field label="Cible max." style={{ flex: 1 }}>
            <TextInput
              style={inputStyle}
              keyboardType="numeric"
              value={markerMax}
              onChangeText={setMarkerMax}
              placeholder="120"
              placeholderTextColor={Palette.textMuted}
            />
          </Field>
        </View>
        <Field label="Unité de mesure">
          <TextInput
            style={inputStyle}
            value={markerUnit}
            onChangeText={setMarkerUnit}
            placeholder="µg/L, mUI/L, pg/mL…"
            placeholderTextColor={Palette.textMuted}
          />
        </Field>
        <Field label="Objectif pour les cheveux (optionnel)">
          <TextInput
            style={[inputStyle, styles.multiline]}
            multiline
            value={markerDesc}
            onChangeText={setMarkerDesc}
            placeholder="Ex : nécessaire > 70 pour la repousse…"
            placeholderTextColor={Palette.textMuted}
          />
        </Field>
        <View style={styles.rowFields}>
          <PillButton label="Annuler" variant="ghost" onPress={() => setShowMarkerModal(false)} style={{ flex: 1 }} />
          <PillButton label="Enregistrer" icon={Check} onPress={handleSaveMarker} loading={saving} disabled={saving} style={{ flex: 1.4 }} />
        </View>
        {editingMarkerId && (
          <Pressable
            onPress={() => {
              const marker = markers.find((m) => m.id === editingMarkerId);
              if (marker) {
                setShowMarkerModal(false);
                handleDeleteMarker(marker);
              }
            }}
            style={styles.deleteMarkerRow}>
            <Trash2 size={16} color={Palette.coralDeep} />
            <AppText variant="labelMd" color={Palette.coralDeep}>
              Supprimer cette molécule
            </AppText>
          </Pressable>
        )}
      </BottomSheet>

      {/* Modal Saisie Prise de Sang */}
      <BottomSheet
        visible={showTestModal}
        onClose={() => setShowTestModal(false)}
        title={editingTest ? 'Modifier la prise de sang' : 'Saisir une prise de sang'}
        subtitle="Laisse vide les analyses non réalisées">
        <Field label="Date de la prise de sang">
          <Pressable
            onPress={() => {
              if (!showDatePicker) {
                setPickerYear(parseInt(testDate.substring(0, 4)));
                setPickerMonth(parseInt(testDate.substring(5, 7)) - 1);
                setPickerStep('year');
              }
              setShowDatePicker((v) => !v);
            }}
            style={[styles.dateField, showDatePicker && styles.dateFieldActive]}>
            <AppText variant="bodyLg">{frDate(testDate)}</AppText>
            <CalendarDays size={18} color={showDatePicker ? Palette.primary : Palette.textMuted} />
          </Pressable>
        </Field>
        {showDatePicker && (
          <View style={styles.datePicker}>
            {pickerStep === 'year' && (() => {
              const now = new Date();
              const currentYear = now.getFullYear();
              const years = Array.from({ length: 10 }, (_, i) => currentYear - 9 + i);
              return (
                <>
                  <AppText variant="headlineSm" style={{ textAlign: 'center', marginBottom: 12 }}>
                    Choisir l'année
                  </AppText>
                  <View style={styles.pickerGrid}>
                    {years.map((yr) => (
                      <Pressable
                        key={yr}
                        onPress={() => { setPickerYear(yr); setPickerStep('month'); }}
                        style={[styles.pickerCell, yr === pickerYear && styles.pickerCellSelected]}
                      >
                        <AppText variant="labelMd" style={yr === pickerYear ? { color: '#FFF' } : undefined}>
                          {yr}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </>
              );
            })()}
            {pickerStep === 'month' && (() => {
              const now = new Date();
              const currentYear = now.getFullYear();
              const currentMonth = now.getMonth();
              return (
                <>
                  <Pressable onPress={() => setPickerStep('year')} style={styles.pickerBack}>
                    <ChevronLeft size={18} color={Palette.primary} />
                    <AppText variant="headlineSm" color={Palette.primary}>{pickerYear}</AppText>
                  </Pressable>
                  <View style={styles.pickerGrid}>
                    {MONTHS_FR.map((name, i) => {
                      const disabled = pickerYear === currentYear && i > currentMonth;
                      return (
                        <Pressable
                          key={i}
                          disabled={disabled}
                          onPress={() => { setPickerMonth(i); setPickerStep('day'); }}
                          style={[
                            styles.pickerCell,
                            i === pickerMonth && styles.pickerCellSelected,
                            disabled && { opacity: 0.3 },
                          ]}
                        >
                          <AppText
                            variant="labelMd"
                            style={i === pickerMonth ? { color: '#FFF' } : disabled ? { color: Palette.textMuted } : undefined}
                          >
                            {name}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              );
            })()}
            {pickerStep === 'day' && (
              <>
                <Pressable onPress={() => setPickerStep('month')} style={styles.pickerBack}>
                  <ChevronLeft size={18} color={Palette.primary} />
                  <AppText variant="headlineSm" color={Palette.primary}>
                    {MONTHS_FR[pickerMonth]} {pickerYear}
                  </AppText>
                </Pressable>
                <Calendar
                  key={`${pickerYear}-${pickerMonth}`}
                  current={`${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-01`}
                  maxDate={todayIso()}
                  firstDay={1}
                  hideArrows
                  onDayPress={(day: { dateString: string }) => {
                    setTestDate(day.dateString);
                    setShowDatePicker(false);
                  }}
                  markedDates={{ [testDate]: { selected: true } }}
                  theme={{
                    calendarBackground: 'transparent',
                    textSectionTitleColor: Palette.textMuted,
                    arrowColor: Palette.obsidian,
                    monthTextColor: Palette.text,
                    dayTextColor: Palette.text,
                    textDisabledColor: Palette.outlineVariant,
                    todayTextColor: Palette.primary,
                    selectedDayBackgroundColor: Palette.obsidian,
                    selectedDayTextColor: '#FFFFFF',
                    textMonthFontFamily: Type.headlineSm.fontFamily,
                    textDayFontFamily: Type.labelMd.fontFamily,
                    textDayHeaderFontFamily: Type.labelSm.fontFamily,
                    textMonthFontSize: 16,
                  }}
                />
              </>
            )}
          </View>
        )}
        <Field label="Notes / contexte">
          <TextInput
            style={inputStyle}
            value={testNotes}
            onChangeText={setTestNotes}
            placeholder="Ex : contrôle après 3 mois de cure"
            placeholderTextColor={Palette.textMuted}
          />
        </Field>
        <View style={{ gap: 8 }}>
          {markers.map((m) => (
            <View key={m.id} style={styles.testInputRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="labelMd">{m.name}</AppText>
                <AppText variant="bodySm" color={Palette.textMuted}>
                  Cible {m.minFunctional}–{m.maxFunctional} {m.unit}
                </AppText>
              </View>
              <TextInput
                style={styles.testValueInput}
                keyboardType="numeric"
                placeholder={m.unit}
                placeholderTextColor={Palette.textMuted}
                value={testValues[m.id] || ''}
                onChangeText={(val) => setTestValues((prev) => ({ ...prev, [m.id]: val }))}
              />
            </View>
          ))}
        </View>
        <PillButton label={editingTest ? 'Enregistrer les modifications' : 'Enregistrer le bilan'} icon={Check} onPress={handleSaveTest} loading={saving} disabled={saving} />
      </BottomSheet>
    </View>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <AppText variant="labelSm" color={Palette.textVariant} style={{ paddingLeft: 8 }}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.rowBetween}>
            <View style={styles.inlineLg}>
              <IconCircle icon={SlidersHorizontal} size={40} bg={Palette.limeSoft} color={Palette.primary} />
              <View style={{ flexShrink: 1 }}>
                <AppText variant="headlineSm">{title}</AppText>
                {subtitle ? (
                  <AppText variant="bodySm" color={Palette.textMuted}>
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={6}>
              <X size={18} color={Palette.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  rowBetweenTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  inlineLg: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  caps: { textTransform: 'uppercase', letterSpacing: 1 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    backgroundColor: Palette.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.outlineVariant,
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: Palette.containerLow,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  metricValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  track: {
    height: 12,
    borderRadius: 6,
    overflow: 'visible',
    backgroundColor: Palette.container,
  },
  zone: { position: 'absolute', top: 0, bottom: 0, borderRadius: 6 },
  needle: {
    position: 'absolute',
    top: -5,
    width: 6,
    height: 22,
    marginLeft: -3,
    borderRadius: 3,
    backgroundColor: Palette.obsidian,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cardFooter: { borderTopWidth: 1, borderTopColor: Palette.container, paddingTop: 12 },
  testActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.coralSoft,
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
    paddingVertical: 10,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(18,22,20,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.margin,
    paddingTop: 10,
    gap: 16,
    maxHeight: '90%',
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: Palette.containerHighest },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowFields: { flexDirection: 'row', gap: 10 },
  deleteMarkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Palette.container,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Palette.containerLow,
    paddingHorizontal: 20,
  },
  dateFieldActive: { borderWidth: 1.5, borderColor: Palette.lime },
  datePicker: { backgroundColor: Palette.card, borderRadius: Radius.lg, padding: 12 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerCell: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Palette.containerLow,
  },
  pickerCellSelected: { backgroundColor: Palette.obsidian },
  pickerBack: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  multiline: { height: 88, borderRadius: Radius.lg, paddingTop: 14, textAlignVertical: 'top' },
  testInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 12,
  },
  testValueInput: {
    width: 104,
    height: 42,
    borderRadius: Radius.full,
    backgroundColor: Palette.containerLow,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Palette.text,
    textAlign: 'center',
  },
});
