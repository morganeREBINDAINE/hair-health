import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import { Check } from 'lucide-react-native';
import { LabMarkerDefinition } from '../../types';
import { StorageService } from '../../services/storageService';
import { Palette } from '../../constants/theme';
import { PillButton, inputStyle } from '../ui';
import { Toast } from '../../lib/toast';
import { actionError } from '../../lib/errors';
import { BottomSheet, Field, sharedStyles } from './shared';

/** Ajout d'une molécule / analyse. À monter avec une `key` propre à chaque ouverture pour repartir d'un formulaire vierge. */
export function MarkerSheet({
  visible,
  onClose,
  markers,
  onMarkersChange,
}: {
  visible: boolean;
  onClose: () => void;
  markers: LabMarkerDefinition[];
  onMarkersChange: (markers: LabMarkerDefinition[]) => void;
}) {
  const [name, setName] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [unit, setUnit] = useState('µg/L');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    const next: Record<string, string> = {};
    const minVal = parseFloat(min.replace(',', '.'));
    const maxVal = parseFloat(max.replace(',', '.'));
    if (!name.trim()) next.name = 'Nom requis.';
    if (!min.trim() || isNaN(minVal)) next.min = 'Nombre requis.';
    if (!max.trim() || isNaN(maxVal)) next.max = 'Nombre requis.';
    if (!next.min && !next.max && minVal > maxVal) next.max = 'Doit être ≥ au min.';
    if (!unit.trim()) next.unit = 'Unité requise.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const marker: LabMarkerDefinition = {
      id: `marker-${Date.now()}`,
      code: name.toLowerCase().trim().replace(/\s+/g, '_'),
      name: name.trim(),
      minFunctional: minVal,
      maxFunctional: maxVal,
      unit: unit.trim(),
      description: note.trim(),
      displayOrder: markers.length + 1,
    };

    setSaving(true);
    try {
      onMarkersChange(await StorageService.saveLabMarker(marker));
      onClose();
    } catch (e) {
      console.error('[analyses] enregistrement molécule', e);
      Toast.error(actionError(e, 'enregistrer'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Ajouter une molécule" subtitle="Personnalise tes objectifs fonctionnels">
      <Field label="Nom de la molécule / analyse" error={errors.name}>
        <TextInput
          style={inputStyle}
          value={name}
          onChangeText={setName}
          placeholder="Ex : Ferritine, Zinc, TSH…"
          placeholderTextColor={Palette.textMuted}
        />
      </Field>
      <View style={sharedStyles.rowFields}>
        <Field label="Cible min." error={errors.min} style={{ flex: 1 }}>
          <TextInput
            style={inputStyle}
            keyboardType="numeric"
            value={min}
            onChangeText={setMin}
            placeholder="70"
            placeholderTextColor={Palette.textMuted}
          />
        </Field>
        <Field label="Cible max." error={errors.max} style={{ flex: 1 }}>
          <TextInput
            style={inputStyle}
            keyboardType="numeric"
            value={max}
            onChangeText={setMax}
            placeholder="120"
            placeholderTextColor={Palette.textMuted}
          />
        </Field>
      </View>
      <Field label="Unité de mesure" error={errors.unit}>
        <TextInput
          style={inputStyle}
          value={unit}
          onChangeText={setUnit}
          placeholder="µg/L, mUI/L, pg/mL…"
          placeholderTextColor={Palette.textMuted}
        />
      </Field>
      <Field label="Note (optionnel)">
        <TextInput
          style={[inputStyle, sharedStyles.multiline]}
          multiline
          value={note}
          onChangeText={setNote}
          placeholder="Ex : à doser à jeun…"
          placeholderTextColor={Palette.textMuted}
        />
      </Field>
      <View style={sharedStyles.rowFields}>
        <PillButton label="Annuler" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
        <PillButton label="Enregistrer" icon={Check} onPress={handleSave} loading={saving} disabled={saving} style={{ flex: 1.4 }} />
      </View>
    </BottomSheet>
  );
}
