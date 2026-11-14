import { Check, Clock } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Palette } from '../../constants/theme';
import { frDate } from '../../lib/dates';
import { DailyMedicationItem, TreatmentPlan } from '../../types';
import { AppText, Badge, Card, IconCircle } from '../ui';
import { HomeSection, homeStyles } from './shared';

/** Cures actives aujourd'hui, cochées si la prise est notée dans le journal du jour. */
export function CureSection({
  plans,
  takenToday,
  onOpenEntry,
}: {
  plans: TreatmentPlan[];
  takenToday: DailyMedicationItem[];
  onOpenEntry: () => void;
}) {
  if (plans.length === 0) return null;
  return (
    <HomeSection
      title="Cure en cours"
      right={<Badge label={`${plans.length} active${plans.length > 1 ? 's' : ''}`} tone="limeSoft" />}>
      {plans.map((p) => {
        const done = takenToday.some((m) => m.name.toLowerCase() === p.name.toLowerCase());
        const subtitle = `${p.dosage}${p.endDate ? ` · jusqu'au ${frDate(p.endDate)}` : ''}`;
        return (
          <Card
            key={p.id}
            onPress={onOpenEntry}
            style={homeStyles.itemRow}
            accessibilityLabel={`${p.name}, ${subtitle}. ${done ? "Prise notée aujourd'hui" : "Pas encore notée aujourd'hui"}`}
            accessibilityHint="Ouvre le journal du jour">
            <IconCircle icon={Clock} size={48} bg={Palette.containerLow} color={Palette.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="labelMd" style={homeStyles.itemTitle} numberOfLines={1}>
                {p.name}
              </AppText>
              <AppText variant="bodySm" color={Palette.textMuted} numberOfLines={1}>
                {subtitle}
              </AppText>
            </View>
            <View style={[styles.checkCircle, done && { backgroundColor: Palette.lime }]}>
              {done && <Check size={17} color={Palette.onLime} strokeWidth={3} />}
            </View>
          </Card>
        );
      })}
    </HomeSection>
  );
}

const styles = StyleSheet.create({
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
