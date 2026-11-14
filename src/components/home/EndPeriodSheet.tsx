import { Check, CircleStop } from 'lucide-react-native';
import { useState } from 'react';
import { TextInput } from 'react-native';
import { Palette } from '../../constants/theme';
import { normalizeTime, validatePeriodEnd } from '../../lib/cycle';
import { currentTime, frDate, todayIso } from '../../lib/dates';
import { Period } from '../../types';
import { BottomSheet, DateField, Field } from '../analyses/shared';
import { AppText, PillButton, inputStyle } from '../ui';

/**
 * Déclare la fin des règles en cours : date (aujourd'hui par défaut) et heure (maintenant par défaut).
 * À monter avec une `key` propre à chaque ouverture, pour repartir des valeurs par défaut.
 */
export function EndPeriodSheet({
  visible,
  onClose,
  period,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  period: Period;
  /** Doit lever une erreur si l'enregistrement échoue (le toast est affiché par l'écran parent). */
  onSave: (date: string, time: string) => Promise<void>;
}) {
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState(currentTime());
  const [saving, setSaving] = useState(false);

  const errors = validatePeriodEnd(date, time, period, todayIso(), currentTime());
  const hasErrors = !!(errors.date || errors.time);

  const handleSave = async () => {
    const normalized = normalizeTime(time);
    if (hasErrors || !normalized || saving) return;
    setSaving(true);
    try {
      await onSave(date, normalized);
      onClose();
    } catch {
      // Le toast d'erreur est affiché par l'écran parent ; la saisie est conservée
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={saving ? () => { } : onClose}
      icon={CircleStop}
      title="Règles arrêtées"
      subtitle={`Règles commencées le ${frDate(period.start)}`}>
      <DateField label="Date de fin" value={date} onChange={setDate} mode="past" />
      {errors.date ? (
        <AppText variant="bodySm" color={Palette.coralDeep} style={{ paddingLeft: 8, marginTop: -8 }}>
          {errors.date}
        </AppText>
      ) : null}
      <Field label="Heure de fin" error={errors.time}>
        <TextInput
          style={inputStyle}
          value={time}
          onChangeText={setTime}
          placeholder="Ex : 14:30"
          placeholderTextColor={Palette.textMuted}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          editable={!saving}
          accessibilityLabel="Heure de fin des règles"
        />
      </Field>
      <PillButton label="Enregistrer" icon={Check} onPress={handleSave} loading={saving} disabled={saving || hasErrors} />
    </BottomSheet>
  );
}
