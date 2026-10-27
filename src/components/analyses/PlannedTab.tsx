import { CalendarClock } from 'lucide-react-native';
import { Palette } from '../../constants/theme';
import { LabMarkerDefinition, PlannedCheckup } from '../../types';
import { AppText, Card, IconCircle, SkeletonCard } from '../ui';
import { PlannedSection } from './Planning';

/** Prises de sang et examens planifiés non réalisés, du plus proche au plus lointain. */
export function PlannedTab({
  loading,
  planned,
  markers,
  onComplete,
  onEdit,
  onDelete,
}: {
  loading: boolean;
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

  if (planned.length === 0) {
    return (
      <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 32 }}>
        <IconCircle icon={CalendarClock} size={52} />
        <AppText variant="headlineSm">Rien de planifié</AppText>
        <AppText variant="bodySm" color={Palette.textMuted} style={{ textAlign: 'center' }}>
          Appuie sur « Planifier » pour programmer une prise de sang ou un examen.
        </AppText>
      </Card>
    );
  }

  const byDate = [...planned].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <PlannedSection items={byDate} markers={markers} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} />
  );
}
