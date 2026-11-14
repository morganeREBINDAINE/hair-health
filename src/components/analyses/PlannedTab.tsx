import { CalendarClock } from 'lucide-react-native';
import { Palette } from '../../constants/theme';
import { CheckupKind, LabMarkerDefinition, PlannedCheckup } from '../../types';
import { AppText, Card, IconCircle, SkeletonCard } from '../ui';
import { PlannedSection } from './Planning';

/** Prises de sang ou examens planifiés non réalisés, du plus proche au plus lointain. */
export function PlannedTab({
  loading,
  kind,
  planned,
  markers,
  onComplete,
  onEdit,
  onDelete,
}: {
  loading: boolean;
  kind: CheckupKind;
  planned: PlannedCheckup[];
  markers: LabMarkerDefinition[];
  onComplete: (item: PlannedCheckup) => void;
  onEdit: (item: PlannedCheckup) => void;
  onDelete: (item: PlannedCheckup) => void;
}) {
  if (loading) {
    return (
      <>
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </>
    );
  }

  const items = planned.filter((c) => c.kind === kind).sort((a, b) => a.date.localeCompare(b.date));

  if (items.length === 0) {
    return (
      <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 32 }}>
        <IconCircle icon={CalendarClock} size={52} />
        <AppText variant="headlineSm">Rien de planifié</AppText>
        <AppText variant="bodySm" color={Palette.textMuted} style={{ textAlign: 'center' }}>
          {kind === 'blood'
            ? 'Appuie sur « Planifier une prise de sang » pour programmer ton prochain bilan.'
            : 'Appuie sur « Planifier un examen » pour programmer une radio ou une échographie.'}
        </AppText>
      </Card>
    );
  }

  return (
    <PlannedSection items={items} markers={markers} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} />
  );
}
