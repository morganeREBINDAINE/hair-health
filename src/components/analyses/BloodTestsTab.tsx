import React, { useState } from 'react';
import { View, Pressable, TextInput, Alert, StyleSheet } from 'react-native';
import { CalendarClock, CalendarDays, Check, CircleCheck, Pencil, Plus, Syringe, Trash2, TriangleAlert } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import { LabMarkerDefinition, LabTest, PlannedCheckup } from '../../types';
import { StorageService } from '../../services/storageService';
import { Palette, Radius } from '../../constants/theme';
import { AppText, Badge, Card, IconCircle, PillButton, inputStyle } from '../ui';
import { frDate, todayIso } from '../../lib/dates';
import { Toast } from '../../lib/toast';
import { statusOf } from '../../lib/labStatus';
import { BottomSheet, DateField, Field, STATUS_BADGE, sharedStyles } from './shared';
import { PlannedSection } from './Planning';

export function BloodTestsTab({
  markers,
  labTests,
  onLabTestsChange,
  planned,
  onPlan,
  onEditPlan,
  onDeletePlan,
  onCheckupDone,
}: {
  markers: LabMarkerDefinition[];
  labTests: LabTest[];
  onLabTestsChange: (tests: LabTest[]) => void;
  planned: PlannedCheckup[];
  onPlan: () => void;
  onEditPlan: (item: PlannedCheckup) => void;
  onDeletePlan: (item: PlannedCheckup) => void;
  onCheckupDone: (item: PlannedCheckup) => Promise<void>;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LabTest | null>(null);
  const [completing, setCompleting] = useState<PlannedCheckup | null>(null);
  const [showAllMarkers, setShowAllMarkers] = useState(true);
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const markerMap = new Map(markers.map((m) => [m.id, m]));

  const openAdd = (fromPlan: PlannedCheckup | null = null) => {
    setEditing(null);
    setCompleting(fromPlan);
    setShowAllMarkers(!fromPlan);
    const today = todayIso();
    setDate(fromPlan && fromPlan.date <= today ? fromPlan.date : today);
    setNotes(fromPlan?.note ?? '');
    setValues({});
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (test: LabTest) => {
    setEditing(test);
    setCompleting(null);
    setShowAllMarkers(true);
    setDate(test.date);
    setNotes(test.notes || '');
    setValues(Object.fromEntries(Object.entries(test.values).map(([id, v]) => [id, String(v)])));
    setFormError(null);
    setShowModal(true);
  };

  const plannedCodes = new Set((completing?.markerCodes ?? []).map((c) => c.toLowerCase()));
  const formMarkers = showAllMarkers ? markers : markers.filter((m) => plannedCodes.has(m.code.toLowerCase()));

  const handleSave = async () => {
    const numeric: Record<string, number> = {};
    if (editing) {
      // Conserve les valeurs de molécules supprimées depuis
      Object.entries(editing.values).forEach(([id, v]) => {
        if (!markerMap.has(id)) numeric[id] = v;
      });
    }
    const invalid: string[] = [];
    Object.entries(values).forEach(([markerId, raw]) => {
      if (raw.trim() === '') return;
      const parsed = parseFloat(raw.replace(',', '.'));
      if (isNaN(parsed)) invalid.push(markerMap.get(markerId)?.name ?? markerId);
      else numeric[markerId] = parsed;
    });

    if (invalid.length) {
      setFormError(`Valeur non numérique : ${invalid.join(', ')}.`);
      return;
    }
    if (Object.keys(numeric).length === 0) {
      setFormError("Saisis au moins une valeur d'analyse.");
      return;
    }
    setFormError(null);

    setSaving(true);
    try {
      onLabTestsChange(
        await StorageService.saveLabTest({
          id: editing?.id ?? `test-${Crypto.randomUUID()}`,
          date,
          notes: notes.trim(),
          values: numeric,
        }),
      );
    } catch (e) {
      console.error('[analyses] enregistrement prise de sang', e);
      Toast.error('Connexion requise pour enregistrer');
      setSaving(false);
      return;
    }

    if (completing) {
      try {
        await onCheckupDone(completing);
      } catch {
        // Bilan enregistré mais planification non clôturée : le parent a affiché le toast
      }
    }
    setSaving(false);
    setShowModal(false);
    Alert.alert('Succès', editing ? 'Bilan de prise de sang modifié.' : 'Bilan de prise de sang enregistré.');
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Confirmer', 'Supprimer ce bilan de prise de sang ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            onLabTestsChange(await StorageService.deleteLabTest(id));
          } catch (e) {
            console.error('[analyses] suppression prise de sang', e);
            Toast.error('Connexion requise pour supprimer');
          }
        },
      },
    ]);
  };

  const testsDesc = [...labTests].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <View style={sharedStyles.rowFields}>
        <PillButton label="Ajouter" icon={Plus} onPress={() => openAdd()} style={{ flex: 1 }} />
        <PillButton label="Planifier" icon={CalendarClock} variant="ghost" onPress={onPlan} style={{ flex: 1 }} />
      </View>

      <PlannedSection
        items={planned}
        markers={markers}
        onComplete={(item) => openAdd(item)}
        onEdit={onEditPlan}
        onDelete={onDeletePlan}
      />

      {testsDesc.length === 0 ? (
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
            <View style={sharedStyles.rowBetween}>
              <View style={sharedStyles.inlineLg}>
                <IconCircle icon={CalendarDays} size={40} bg={Palette.coralSoft} color={Palette.coralDeep} />
                <View>
                  <AppText variant="labelSm" color={Palette.textMuted}>
                    Bilan du
                  </AppText>
                  <AppText variant="headlineSm">{frDate(test.date)}</AppText>
                </View>
              </View>
              <View style={sharedStyles.actions}>
                <Pressable onPress={() => openEdit(test)} style={sharedStyles.roundBtn} hitSlop={6} accessibilityLabel="Modifier ce bilan">
                  <Pencil size={16} color={Palette.text} />
                </Pressable>
                <Pressable onPress={() => confirmDelete(test.id)} style={sharedStyles.deleteBtn} hitSlop={6} accessibilityLabel="Supprimer ce bilan">
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
                  <View key={markerId} style={sharedStyles.resultRow}>
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

      <BottomSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        icon={Syringe}
        title={editing ? 'Modifier la prise de sang' : 'Saisir une prise de sang'}
        subtitle="Laisse vide les analyses non réalisées">
        <DateField label="Date de la prise de sang" value={date} onChange={setDate} mode="past" />
        <Field label="Notes / contexte">
          <TextInput
            style={inputStyle}
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex : contrôle après 3 mois de cure"
            placeholderTextColor={Palette.textMuted}
          />
        </Field>
        <View style={{ gap: 8 }}>
          {formMarkers.map((m) => (
            <View key={m.id} style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="labelMd">{m.name}</AppText>
                <AppText variant="bodySm" color={Palette.textMuted}>
                  Cible {m.minFunctional}–{m.maxFunctional} {m.unit}
                </AppText>
              </View>
              <TextInput
                style={styles.valueInput}
                keyboardType="numeric"
                placeholder={m.unit}
                placeholderTextColor={Palette.textMuted}
                value={values[m.id] || ''}
                onChangeText={(val) => {
                  setFormError(null);
                  setValues((prev) => ({ ...prev, [m.id]: val }));
                }}
              />
            </View>
          ))}
          {!showAllMarkers && (
            <PillButton label="Afficher toutes les molécules" variant="ghost" compact onPress={() => setShowAllMarkers(true)} />
          )}
        </View>
        {formError ? (
          <AppText variant="bodySm" color={Palette.coralDeep} style={{ textAlign: 'center' }}>
            {formError}
          </AppText>
        ) : null}
        <PillButton
          label={editing ? 'Enregistrer les modifications' : 'Enregistrer le bilan'}
          icon={Check}
          onPress={handleSave}
          loading={saving}
          disabled={saving}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 12,
  },
  valueInput: {
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
