import React, { useState } from 'react';
import { View, Pressable, TextInput, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Eye, EyeOff, FlaskConical, Search, X } from 'lucide-react-native';
import { LabMarkerDefinition, LabTest } from '../../types';
import { StorageService } from '../../services/storageService';
import { Palette, Radius } from '../../constants/theme';
import { AppText, Card, IconCircle } from '../ui';
import { frDateShort } from '../../lib/dates';
import { Toast } from '../../lib/toast';
import { actionError } from '../../lib/errors';
import { latestValues, normalizeSearch, statusOf } from '../../lib/labStatus';
import { RangeTrack, sharedStyles } from './shared';

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

  const latest = latestValues(labTests);
  const q = normalizeSearch(query);
  const matches = (m: LabMarkerDefinition) =>
    !q || normalizeSearch(m.name).includes(q) || normalizeSearch(m.code).includes(q);
  const visible = markers.filter((m) => !m.hidden && matches(m));
  const hidden = markers.filter((m) => m.hidden && matches(m));
  // Pendant une recherche, les molécules masquées qui correspondent sont affichées aussi
  const showHiddenList = showHidden || (q !== '' && hidden.length > 0);

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

  const openMarker = (m: LabMarkerDefinition) => router.push({ pathname: '/marker/[id]', params: { id: m.id } });

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
        const alert = status === 'low' || status === 'high';
        return (
          <Card
            key={m.id}
            onPress={() => openMarker(m)}
            accessibilityLabel={`${m.name}, ${last ? `${last.value} ${m.unit} le ${frDateShort(last.date)}` : 'pas encore mesurée'}`}
            accessibilityHint="Ouvre l'évolution de cette molécule"
            style={[{ gap: 14 }, alert && { borderWidth: 1, borderColor: Palette.coralSoft }]}>
            <View style={sharedStyles.rowBetween}>
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
              <AppText variant="headlineSm" style={{ fontSize: 17, flexShrink: 1 }}>
                {m.name}
              </AppText>
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
