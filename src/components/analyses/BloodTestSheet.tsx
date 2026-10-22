import React, { useState } from 'react';
import { View, TextInput, Alert, StyleSheet } from 'react-native';
import * as Crypto from 'expo-crypto';
import { Check, Syringe } from 'lucide-react-native';
import { LabMarkerDefinition, LabTest, PlannedCheckup } from '../../types';
import { StorageService } from '../../services/storageService';
import { Palette, Radius } from '../../constants/theme';
import { AppText, PillButton, inputStyle } from '../ui';
import { todayIso } from '../../lib/dates';
import { Toast } from '../../lib/toast';
import { actionError } from '../../lib/errors';
import { BottomSheet, DateField, Field } from './shared';

/**
 * Saisie / modification d'une prise de sang.
 * À monter avec une `key` propre à chaque ouverture : l'état initial vient des props.
 * `fromPlan` : planification réalisée, supprimée une fois le bilan enregistré.
 */
export function BloodTestSheet({
  visible,
  onClose,
  markers,
  editing,
  fromPlan,
  onTestsChange,
  onCheckupsChange,
}: {
  visible: boolean;
  onClose: () => void;
  markers: LabMarkerDefinition[];
  editing: LabTest | null;
  fromPlan: PlannedCheckup | null;
  onTestsChange: (tests: LabTest[]) => void;
  onCheckupsChange?: (checkups: PlannedCheckup[]) => void;
}) {
  const today = todayIso();
  const [date, setDate] = useState(editing?.date ?? (fromPlan && fromPlan.date <= today ? fromPlan.date : today));
  const [notes, setNotes] = useState(editing?.notes ?? fromPlan?.note ?? '');
  const [values, setValues] = useState<Record<string, string>>(
    editing ? Object.fromEntries(Object.entries(editing.values).map(([id, v]) => [id, String(v)])) : {},
  );
  const [showAllMarkers, setShowAllMarkers] = useState(!fromPlan);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const markerMap = new Map(markers.map((m) => [m.id, m]));
  const plannedCodes = new Set((fromPlan?.markerCodes ?? []).map((c) => c.toLowerCase()));
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
      onTestsChange(
        await StorageService.saveLabTest({
          id: editing?.id ?? `test-${Crypto.randomUUID()}`,
          date,
          notes: notes.trim(),
          values: numeric,
        }),
      );
    } catch (e) {
      console.error('[analyses] enregistrement prise de sang', e);
      Toast.error(actionError(e, 'enregistrer le bilan'));
      setSaving(false);
      return;
    }

    if (fromPlan) {
      try {
        // Le rendez-vous est réalisé : on ne garde que le résultat
        onCheckupsChange?.(await StorageService.deletePlannedCheckup(fromPlan.id));
      } catch (e) {
        console.error('[analyses] suppression planification réalisée', e);
        Toast.error(`Bilan enregistré, mais ${actionError(e, 'retirer le rendez-vous').toLowerCase()}`);
      }
    }
    setSaving(false);
    onClose();
    Alert.alert('Succès', editing ? 'Bilan de prise de sang modifié.' : 'Bilan de prise de sang enregistré.');
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
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
