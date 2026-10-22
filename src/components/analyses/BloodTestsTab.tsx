import { CalendarDays, CircleCheck, Pencil, Syringe, Trash2, TriangleAlert } from 'lucide-react-native';
import { Alert, Pressable, View } from 'react-native';
import { Palette } from '../../constants/theme';
import { frDate } from '../../lib/dates';
import { statusOf } from '../../lib/labStatus';
import { Toast } from '../../lib/toast';
import { actionError } from '../../lib/errors';
import { StorageService } from '../../services/storageService';
import { LabMarkerDefinition, LabTest, PlannedCheckup } from '../../types';
import { AppText, Badge, Card, IconCircle, SkeletonCard } from '../ui';
import { PlannedSection } from './Planning';
import { STATUS_BADGE, sharedStyles } from './shared';

export function BloodTestsTab({
  loading,
  markers,
  labTests,
  onLabTestsChange,
  planned,
  onEditTest,
  onCompletePlan,
  onEditPlan,
  onDeletePlan,
}: {
  loading: boolean;
  markers: LabMarkerDefinition[];
  labTests: LabTest[];
  onLabTestsChange: (tests: LabTest[]) => void;
  planned: PlannedCheckup[];
  onEditTest: (test: LabTest) => void;
  onCompletePlan: (item: PlannedCheckup) => void;
  onEditPlan: (item: PlannedCheckup) => void;
  onDeletePlan: (item: PlannedCheckup) => void;
}) {
  if (loading) {
    return (
      <>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </>
    );
  }

  const markerMap = new Map(markers.map((m) => [m.id, m]));

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
            Toast.error(actionError(e, 'supprimer'));
          }
        },
      },
    ]);
  };

  const testsDesc = [...labTests].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PlannedSection
        items={planned}
        markers={markers}
        onComplete={onCompletePlan}
        onEdit={onEditPlan}
        onDelete={onDeletePlan}
      />

      {testsDesc.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 32 }}>
          <IconCircle icon={Syringe} size={52} />
          <AppText variant="headlineSm">Aucune prise de sang</AppText>
          <AppText variant="bodySm" color={Palette.textMuted} style={{ textAlign: 'center' }}>
            Appuie sur « + » pour renseigner tes résultats (Ferritine, TSH, T3, T4, Anti-TPO, NFS…).
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
                <Pressable onPress={() => onEditTest(test)} style={sharedStyles.roundBtn} hitSlop={6} accessibilityLabel="Modifier ce bilan">
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
    </>
  );
}
