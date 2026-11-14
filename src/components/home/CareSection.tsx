import { Check, Clock, Droplets, Leaf, Scissors, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { shampooLabel } from '../../constants/hairCare';
import { CategoryColors, Palette, Radius } from '../../constants/theme';
import type { HairCareHistory } from '../../lib/dashboard';
import { daysBetween, frDate, relativeDays } from '../../lib/dates';
import { DailyMedicationItem, TreatmentPlan } from '../../types';
import { AppText, Badge, Card, IconCircle } from '../ui';
import { HomeSection, homeStyles } from './shared';

/** Derniers soins capillaires notés et cures actives du jour. */
export function CareSection({
  hairCare,
  plans,
  takenToday,
  today,
  onOpenEntry,
}: {
  hairCare: HairCareHistory;
  plans: TreatmentPlan[];
  takenToday: DailyMedicationItem[];
  today: string;
  onOpenEntry: () => void;
}) {
  const { wash, henna, haircut } = hairCare;
  const hasHairCare = !!(wash || henna || haircut);
  if (!hasHairCare && plans.length === 0) return null;

  const ago = (date: string | null) => (date ? relativeDays(daysBetween(date, today)) : 'Jamais noté');

  return (
    <HomeSection
      title="Soins & traitements"
      right={
        plans.length > 0 ? <Badge label={`${plans.length} cure${plans.length > 1 ? 's' : ''} active${plans.length > 1 ? 's' : ''}`} tone="limeSoft" /> : undefined
      }>
      {hasHairCare && (
        <Card style={styles.careCard}>
          <CareTile icon={Droplets} color={CategoryColors.wash} label="Lavage" value={ago(wash?.date ?? null)} detail={wash ? shampooLabel(wash.shampoo) : null} />
          <CareTile icon={Leaf} color={CategoryColors.henna} label="Henné" value={ago(henna)} />
          <CareTile icon={Scissors} color={CategoryColors.haircut} label="Coupe" value={ago(haircut)} />
        </Card>
      )}

      {plans.map((p) => {
        const done = takenToday.some((m) => m.name.toLowerCase() === p.name.toLowerCase());
        const subtitle = `${p.dosage}${p.endDate ? ` · jusqu'au ${frDate(p.endDate)}` : ''}`;
        return (
          <Card
            key={p.id}
            onPress={onOpenEntry}
            style={homeStyles.itemRow}
            accessibilityLabel={`Cure ${p.name}, ${subtitle}. ${done ? "Prise notée aujourd'hui" : "Pas encore notée aujourd'hui"}`}
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

function CareTile({
  icon,
  color,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  value: string;
  detail?: string | null;
}) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`Dernier ${label.toLowerCase()} : ${value}${detail ? `, ${detail}` : ''}`}>
      <IconCircle icon={icon} size={32} bg={Palette.card} color={color} />
      <AppText variant="labelSm" color={Palette.textMuted}>
        {label}
      </AppText>
      <AppText variant="labelMd" numberOfLines={2}>
        {value}
      </AppText>
      {detail ? (
        <AppText variant="bodySm" color={Palette.textMuted} numberOfLines={1}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  careCard: { flexDirection: 'row', gap: 8, padding: 12 },
  tile: { flex: 1, gap: 4, backgroundColor: Palette.containerLow, borderRadius: Radius.md, padding: 10 },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
