import React, { useState } from 'react';
import { View, Pressable, TextInput, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Check, Droplet, Eye, EyeOff, FlaskConical, Plus, Search, X } from 'lucide-react-native';
import { LabMarkerDefinition, LabTest } from '../../types';
import { StorageService } from '../../services/storageService';
import { Palette, Radius } from '../../constants/theme';
import { AppText, Card, IconCircle, PillButton, inputStyle } from '../ui';
import { frDateShort } from '../../lib/dates';
import { Toast } from '../../lib/toast';
import { actionError } from '../../lib/errors';
import { latestValues, normalizeSearch, statusOf } from '../../lib/labStatus';
import { AddRow, BottomSheet, Field, RangeTrack, sharedStyles } from './shared';

export function MoleculesTab({
  markers,
  labTests,
  onMarkersChange,
}: {
  markers: LabMarkerDefinition[];
  labTests: LabTest[];
  onMarkersChange: (markers: LabMarkerDefinition[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [busyMarkerId, setBusyMarkerId] = useState<string | null>(null);

  // Feuille d'ajout (la modification des seuils se fera depuis la page détail)
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [unit, setUnit] = useState('');
  const [desc, setDesc] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const latest = latestValues(labTests);
  const q = normalizeSearch(query);
  const matches = (m: LabMarkerDefinition) =>
    !q || normalizeSearch(m.name).includes(q) || normalizeSearch(m.code).includes(q);
  const visible = markers.filter((m) => !m.hidden && matches(m));
  const hidden = markers.filter((m) => m.hidden && matches(m));
  // Pendant une recherche, les molécules masquées qui correspondent sont affichées aussi
  const showHiddenList = showHidden || (q !== '' && hidden.length > 0);

  const openAdd = () => {
    setName(query.trim());
    setMin('');
    setMax('');
    setUnit('µg/L');
    setDesc('');
    setErrors({});
    setShowModal(true);
  };

  const toggleHidden = async (m: LabMarkerDefinition) => {
    if (busyMarkerId) return;
    setBusyMarkerId(m.id);
    try {
      onMarkersChange(await StorageService.saveLabMarker({ ...m, hidden: !m.hidden }));
    } catch (e) {
      console.error('[analyses] masquage molécule', e);
      Toast.error(actionError(e, 'modifier'));
    } finally {
      setBusyMarkerId(null);
    }
  };

  const confirmHide = (m: LabMarkerDefinition) => {
    if (busyMarkerId) return;
    Alert.alert(
      'Masquer cette molécule ?',
      `« ${m.name} » n'apparaîtra plus dans la liste. Tu pourras la ré-afficher à tout moment, ses résultats sont conservés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Masquer', onPress: () => toggleHidden(m) },
      ],
    );
  };

  const handleSave = async () => {
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
      description: desc.trim(),
      displayOrder: markers.length + 1,
    };

    setSaving(true);
    try {
      onMarkersChange(await StorageService.saveLabMarker(marker));
      setShowModal(false);
    } catch (e) {
      console.error('[analyses] enregistrement molécule', e);
      Toast.error(actionError(e, 'enregistrer'));
    } finally {
      setSaving(false);
    }
  };

  const openMarker = (m: LabMarkerDefinition) => router.push({ pathname: '/marker/[id]', params: { id: m.id } });

  return (
    <>
      <AddRow label="Ajouter une molécule / analyse" icon={Plus} onPress={openAdd} />

      <View style={styles.search}>
        <Search size={18} color={Palette.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une molécule…"
          placeholderTextColor={Palette.textMuted}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Effacer la recherche">
            <X size={18} color={Palette.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {visible.length === 0 && !showHiddenList && (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
          <IconCircle icon={FlaskConical} size={48} />
          <AppText variant="bodyMd" color={Palette.textMuted} style={{ textAlign: 'center' }}>
            {q ? `Aucune molécule ne correspond à « ${query.trim()} ».` : 'Aucune molécule.'}
          </AppText>
        </Card>
      )}

      {visible.map((m) => {
        const last = latest.get(m.id);
        const status = statusOf(last?.value, m);
        const alert = status === 'low' || status === 'high';
        return (
          <Card
            key={m.id}
            onPress={() => openMarker(m)}
            accessibilityLabel={`${m.name}, ${last ? `${last.value} ${m.unit} le ${frDateShort(last.date)}` : 'pas encore mesurée'}`}
            accessibilityHint="Ouvre l'évolution de cette molécule"
            style={[{ gap: 14 }, alert && { borderWidth: 1, borderColor: Palette.coralSoft }]}>
            <View style={sharedStyles.rowBetween}>
              <View style={sharedStyles.inlineLg}>
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
                  {last ? (
                    <AppText variant="bodySm" color={Palette.textMuted}>
                      <AppText variant="labelMd" color={alert ? Palette.coralDeep : Palette.text}>
                        {last.value} {m.unit}
                      </AppText>
                      {` · ${frDateShort(last.date)}`}
                    </AppText>
                  ) : (
                    <AppText variant="bodySm" color={Palette.textMuted}>
                      Pas encore mesuré
                    </AppText>
                  )}
                </View>
              </View>
              <Pressable
                onPress={() => confirmHide(m)}
                disabled={busyMarkerId !== null}
                hitSlop={6}
                accessibilityLabel={`Masquer ${m.name}`}
                style={[sharedStyles.roundBtn, busyMarkerId === m.id && { opacity: 0.4 }]}>
                <EyeOff size={16} color={Palette.textMuted} />
              </Pressable>
            </View>

            <RangeTrack value={last?.value} m={m} />
          </Card>
        );
      })}

      {!q && markers.some((m) => m.hidden) && (
        <Pressable
          onPress={() => setShowHidden((v) => !v)}
          style={({ pressed }) => [sharedStyles.addRow, pressed && { transform: [{ scale: 0.98 }] }]}>
          <View style={[sharedStyles.addIcon, { backgroundColor: Palette.container }]}>
            {showHidden ? <Eye size={18} color={Palette.text} /> : <EyeOff size={18} color={Palette.textMuted} />}
          </View>
          <AppText variant="labelMd" color={Palette.textMuted}>
            {showHidden
              ? 'Masquer'
              : `Afficher ${hidden.length} molécule${hidden.length > 1 ? 's masquées' : ' masquée'}`}
          </AppText>
        </Pressable>
      )}

      {showHiddenList &&
        hidden.map((m) => (
          <Card key={m.id} onPress={() => openMarker(m)} style={{ opacity: 0.6 }}>
            <View style={sharedStyles.rowBetween}>
              <View style={sharedStyles.inlineLg}>
                <IconCircle icon={Droplet} size={44} bg={Palette.container} color={Palette.textMuted} />
                <AppText variant="headlineSm" style={{ fontSize: 17, flexShrink: 1 }}>
                  {m.name}
                </AppText>
              </View>
              <Pressable
                onPress={() => toggleHidden(m)}
                disabled={busyMarkerId !== null}
                hitSlop={6}
                accessibilityLabel={`Ré-afficher ${m.name}`}
                style={[sharedStyles.roundBtn, busyMarkerId === m.id && { opacity: 0.4 }]}>
                <Eye size={18} color={Palette.textMuted} />
              </Pressable>
            </View>
          </Card>
        ))}

      <BottomSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title="Ajouter une analyse"
        subtitle="Personnalise tes objectifs fonctionnels">
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
        <Field label="Objectif pour les cheveux (optionnel)">
          <TextInput
            style={[inputStyle, sharedStyles.multiline]}
            multiline
            value={desc}
            onChangeText={setDesc}
            placeholder="Ex : nécessaire > 70 pour la repousse…"
            placeholderTextColor={Palette.textMuted}
          />
        </Field>
        <View style={sharedStyles.rowFields}>
          <PillButton label="Annuler" variant="ghost" onPress={() => setShowModal(false)} style={{ flex: 1 }} />
          <PillButton label="Enregistrer" icon={Check} onPress={handleSave} loading={saving} disabled={saving} style={{ flex: 1.4 }} />
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Palette.card,
    paddingHorizontal: 18,
  },
  searchInput: { flex: 1, fontSize: 15, color: Palette.text, height: '100%' },
});
