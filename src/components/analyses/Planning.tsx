import React, { useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { CalendarClock, Check, Pencil, Trash2, ClipboardCheck } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import { CheckupKind, LabMarkerDefinition, PlannedCheckup } from '../../types';
import { Palette } from '../../constants/theme';
import { AppText, Card, Chip, IconCircle, PillButton, inputStyle } from '../ui';
import { daysBetween, frDate, todayIso } from '../../lib/dates';
import { BottomSheet, DateField, Field, sharedStyles } from './shared';

/** Libellé lisible d'une planification (molécules ou examen). */
export function checkupLabel(item: PlannedCheckup, markers: LabMarkerDefinition[]): string {
  if (item.kind === 'exam') return item.examLabel || 'Examen';
  const names = item.markerCodes.map(
    (code) => markers.find((m) => m.code.toLowerCase() === code.toLowerCase())?.name ?? code,
  );
  return names.length ? names.join(', ') : 'Prise de sang';
}

/** À monter avec une `key` propre à chaque ouverture : l'état initial vient des props.
 * Le type est fixé à l'ouverture (`initialKind`, ou celui de la planification modifiée). */
export function PlanningSheet({
  visible,
  onClose,
  initialKind,
  editing,
  markers,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  initialKind: CheckupKind;
  editing: PlannedCheckup | null;
  markers: LabMarkerDefinition[];
  /** Doit lever une erreur si l'enregistrement échoue. */
  onSave: (item: PlannedCheckup) => Promise<void>;
}) {
  const kind = editing?.kind ?? initialKind;
  const [date, setDate] = useState(editing?.date ?? todayIso());
  const [codes, setCodes] = useState<string[]>(editing?.markerCodes ?? []);
  const [examLabel, setExamLabel] = useState(editing?.examLabel ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleCode = (code: string) => {
    setError(null);
    setCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const handleSave = async () => {
    if (kind === 'blood' && codes.length === 0) {
      setError('Sélectionne au moins une molécule à doser.');
      return;
    }
    if (kind === 'exam' && !examLabel.trim()) {
      setError("Indique l'examen à réaliser.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: editing?.id ?? Crypto.randomUUID(),
        kind,
        date,
        markerCodes: kind === 'blood' ? codes : [],
        examLabel: kind === 'exam' ? examLabel.trim() : '',
        note: note.trim(),
        done: editing?.done ?? false,
      });
      onClose();
    } catch {
      // Le toast d'erreur est affiché par l'écran parent ; on garde la saisie
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      icon={CalendarClock}
      title={
        editing ? 'Modifier la planification' : kind === 'blood' ? 'Planifier une prise de sang' : 'Planifier un examen'
      }
      subtitle={kind === 'blood' ? 'Prise de sang à venir' : 'Examen médical à venir'}>
      <DateField label="Date prévue" value={date} onChange={setDate} mode="future" />
      {kind === 'blood' ? (
        <Field label="Molécules à doser" error={error}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {markers.map((m) => (
              <Chip key={m.id} label={m.name} selected={codes.includes(m.code)} onPress={() => toggleCode(m.code)} />
            ))}
          </View>
        </Field>
      ) : (
        <Field label="Examens à réaliser" error={error}>
          <TextInput
            style={inputStyle}
            value={examLabel}
            onChangeText={(t) => {
              setExamLabel(t);
              setError(null);
            }}
            placeholder="Ex : échographie thyroïdienne"
            placeholderTextColor={Palette.textMuted}
          />
        </Field>
      )}
      <Field label="Note (optionnel)">
        <TextInput
          style={[inputStyle, sharedStyles.multiline]}
          multiline
          value={note}
          onChangeText={setNote}
          placeholder="Ex : à jeun, ordonnance du Dr …"
          placeholderTextColor={Palette.textMuted}
        />
      </Field>
      <PillButton label="Enregistrer" icon={Check} onPress={handleSave} loading={saving} disabled={saving} />
    </BottomSheet>
  );
}

/** Rendez-vous planifiés non réalisés pour un type donné. */
export function PlannedSection({
  items,
  markers,
  onComplete,
  onEdit,
  onDelete,
}: {
  items: PlannedCheckup[];
  markers: LabMarkerDefinition[];
  onComplete: (item: PlannedCheckup) => void;
  onEdit: (item: PlannedCheckup) => void;
  onDelete: (item: PlannedCheckup) => void;
}) {
  if (items.length === 0) return null;
  const today = todayIso();
  return (
    <View style={{ gap: 10 }}>
      <AppText variant="labelSm" color={Palette.textVariant} style={{ paddingLeft: 8 }}>
        PLANIFIÉ
      </AppText>
      {items.map((item) => {
        const days = daysBetween(today, item.date);
        const when = days < 0 ? `En retard de ${-days} j` : days === 0 ? "Aujourd'hui" : `Dans ${days} j`;
        return (
          <Card key={item.id} style={{ gap: 12, borderWidth: 1, borderColor: Palette.lime }}>
            <View style={sharedStyles.rowBetweenTop}>
              <View style={sharedStyles.inlineLg}>
                <IconCircle icon={CalendarClock} size={40} bg={Palette.limeSoft} color={Palette.primary} />
                <View style={{ flexShrink: 1 }}>
                  <AppText variant="labelSm" color={days < 0 ? Palette.coralDeep : Palette.textMuted}>
                    {frDate(item.date)} · {when}
                  </AppText>
                  <AppText variant="labelMd" style={{ fontSize: 15 }}>
                    {checkupLabel(item, markers)}
                  </AppText>
                </View>
              </View>
              <View style={sharedStyles.actions}>
                <Pressable onPress={() => onEdit(item)} style={sharedStyles.roundBtn} hitSlop={6} accessibilityLabel="Modifier">
                  <Pencil size={16} color={Palette.text} />
                </Pressable>
                <Pressable onPress={() => onDelete(item)} style={sharedStyles.deleteBtn} hitSlop={6} accessibilityLabel="Supprimer">
                  <Trash2 size={17} color={Palette.coralDeep} />
                </Pressable>
              </View>
            </View>
            {item.note ? (
              <AppText variant="bodySm" color={Palette.textVariant} style={{ fontStyle: 'italic' }}>
                « {item.note} »
              </AppText>
            ) : null}
            <PillButton label="Saisir le résultat" icon={ClipboardCheck} variant="lime" compact onPress={() => onComplete(item)} />
          </Card>
        );
      })}
    </View>
  );
}
