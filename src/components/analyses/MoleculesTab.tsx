import React, { useState } from 'react';
import { View, Pressable, TextInput, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Check, CircleCheck, Droplet, Eye, EyeOff, FlaskConical, Pencil, Plus, Search, Trash2, TriangleAlert, X } from 'lucide-react-native';
import { LabMarkerDefinition, LabTest } from '../../types';
import { StorageService } from '../../services/storageService';
import { Palette, Radius } from '../../constants/theme';
import { AppText, Badge, Card, IconCircle, PillButton, inputStyle } from '../ui';
import { frDate } from '../../lib/dates';
import { Toast } from '../../lib/toast';
import { latestValues, normalizeSearch, statusOf } from '../../lib/labStatus';
import { AddRow, BottomSheet, Field, RangeTrack, STATUS_BADGE, sharedStyles } from './shared';

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

  // Feuille ajout / modification
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    setEditingId(null);
    setName(query.trim());
    setMin('');
    setMax('');
    setUnit('µg/L');
    setDesc('');
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (m: LabMarkerDefinition) => {
    setEditingId(m.id);
    setName(m.name);
    setMin(String(m.minFunctional));
    setMax(String(m.maxFunctional));
    setUnit(m.unit);
    setDesc(m.description || '');
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
      Toast.error('Connexion requise pour modifier');
    } finally {
      setBusyMarkerId(null);
    }
  };

  const confirmDelete = (m: LabMarkerDefinition) => {
    Alert.alert(
      'Supprimer cette molécule ?',
      `« ${m.name} » sera définitivement supprimée. Les valeurs déjà enregistrées dans tes prises de sang seront conservées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              onMarkersChange(await StorageService.deleteLabMarker(m.id));
            } catch (e) {
              console.error('[analyses] suppression molécule', e);
              Toast.error('Connexion requise pour supprimer');
            }
          },
        },
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

    const existing = markers.find((m) => m.id === editingId);
    const marker: LabMarkerDefinition = {
      ...existing,
      id: editingId || `marker-${Date.now()}`,
      code: existing?.code ?? name.toLowerCase().trim().replace(/\s+/g, '_'),
      name: name.trim(),
      minFunctional: minVal,
      maxFunctional: maxVal,
      unit: unit.trim(),
      description: desc.trim(),
      displayOrder: existing?.displayOrder ?? markers.length + 1,
    };

    setSaving(true);
    try {
      onMarkersChange(await StorageService.saveLabMarker(marker));
      setShowModal(false);
    } catch (e) {
      console.error('[analyses] enregistrement molécule', e);
      Toast.error('Connexion requise pour enregistrer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
        const badge = STATUS_BADGE[status];
        const alert = status === 'low' || status === 'high';
        return (
          <Card
            key={m.id}
            onPress={() => router.push({ pathname: '/marker/[id]', params: { id: m.id } })}
            style={[{ gap: 16 }, alert && { borderWidth: 1, borderColor: Palette.coralSoft }]}>
            <View style={sharedStyles.rowBetweenTop}>
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

            <View style={[sharedStyles.rowBetween, sharedStyles.cardFooter]}>
              <AppText variant="bodySm" color={Palette.textMuted} style={{ flexShrink: 1 }}>
                {last ? `Mesuré le ${frDate(last.date)}` : 'Pas encore mesuré'}
                {m.recheckMonths ? ` · suivi ${m.recheckMonths === 12 ? '1 an' : '6 mois'}` : ''}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable
                  onPress={() => toggleHidden(m)}
                  disabled={busyMarkerId !== null}
                  hitSlop={6}
                  style={[sharedStyles.roundBtn, busyMarkerId === m.id && { opacity: 0.4 }]}>
                  <EyeOff size={16} color={Palette.textMuted} />
                </Pressable>
                <PillButton label="Ajuster taux optimaux" icon={Pencil} variant="ghost" compact onPress={() => openEdit(m)} />
              </View>
            </View>
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
          <Card
            key={m.id}
            onPress={() => router.push({ pathname: '/marker/[id]', params: { id: m.id } })}
            style={{ gap: 16, opacity: 0.6 }}>
            <View style={sharedStyles.rowBetweenTop}>
              <View style={sharedStyles.inlineLg}>
                <IconCircle icon={Droplet} size={44} bg={Palette.container} color={Palette.textMuted} />
                <AppText variant="headlineSm" style={{ fontSize: 17, flexShrink: 1 }}>
                  {m.name}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable
                  onPress={() => toggleHidden(m)}
                  disabled={busyMarkerId !== null}
                  hitSlop={6}
                  style={[sharedStyles.roundBtn, busyMarkerId === m.id && { opacity: 0.4 }]}>
                  <Eye size={18} color={Palette.textMuted} />
                </Pressable>
                <Pressable onPress={() => openEdit(m)} hitSlop={6} style={sharedStyles.roundBtn}>
                  <Pencil size={16} color={Palette.textMuted} />
                </Pressable>
              </View>
            </View>
          </Card>
        ))}

      <AddRow label="Ajouter une molécule / analyse" icon={Plus} onPress={openAdd} />

      <BottomSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Ajuster les seuils cibles' : 'Ajouter une analyse'}
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
        {editingId && (
          <Pressable
            onPress={() => {
              const m = markers.find((x) => x.id === editingId);
              if (m) {
                setShowModal(false);
                confirmDelete(m);
              }
            }}
            style={sharedStyles.deleteRow}>
            <Trash2 size={16} color={Palette.coralDeep} />
            <AppText variant="labelMd" color={Palette.coralDeep}>
              Supprimer cette molécule
            </AppText>
          </Pressable>
        )}
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
});
