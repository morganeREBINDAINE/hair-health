import { CalendarPlus, Droplet, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Palette } from '../../constants/theme';
import type { MarkerToCheck } from '../../lib/dashboard';
import { frDate } from '../../lib/dates';
import { LabMarkerDefinition } from '../../types';
import { AppText, Badge, Card, IconCircle, ShowMoreToggle } from '../ui';
import { HomeSection, SectionLink, homeStyles } from './shared';

/** Nombre de molécules affichées avant « Voir plus ». */
const PREVIEW = 3;

/** Molécules suivies à contrôler dans les 30 prochains jours ; « Planifier » quand la date est arrivée. */
export function MarkersToCheckSection({
  items,
  onSeeAll,
  onOpenMarker,
  onPlan,
}: {
  items: MarkerToCheck[];
  /** Ouvre l'onglet des bilans dans les Analyses. */
  onSeeAll: () => void;
  onOpenMarker: (markerId: string) => void;
  onPlan: (marker: LabMarkerDefinition) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, PREVIEW);

  return (
    <HomeSection
      title="Molécules à contrôler ce mois"
      right={<SectionLink label="Bilans" onPress={onSeeAll} accessibilityLabel="Voir les bilans sanguins" />}>
      {shown.map((item) => (
        <MarkerRow
          key={item.reminder.marker.id}
          item={item}
          onOpen={() => onOpenMarker(item.reminder.marker.id)}
          onPlan={() => onPlan(item.reminder.marker)}
        />
      ))}
      {items.length > PREVIEW && (
        <ShowMoreToggle expanded={expanded} hiddenCount={items.length - PREVIEW} onToggle={() => setExpanded((v) => !v)} />
      )}
    </HomeSection>
  );
}

/** Molécule à contrôler ; fond rouge quand la date est arrivée. */
function MarkerRow({ item, onOpen, onPlan }: { item: MarkerToCheck; onOpen: () => void; onPlan: () => void }) {
  const { reminder, planned } = item;
  const { due, last, months, dueDate, daysLeft, marker, status } = reminder;
  const outOfRange = status === 'low' || status === 'high';
  const fg = due ? '#FFFFFF' : Palette.text;
  const muted = due ? 'rgba(255,255,255,0.85)' : Palette.textMuted;

  const lastLine = last
    ? `Dernière : ${last.value} ${marker.unit} le ${frDate(last.date)}${outOfRange ? ' · hors norme' : ''}`
    : 'Aucun résultat enregistré';
  const nextLine =
    dueDate && months !== null
      ? `${due ? 'Prévue le' : 'Prochaine le'} ${frDate(dueDate)} · tous les ${months} mois`
      : 'À faire dès que possible';
  const badge =
    daysLeft === null
      ? 'À faire'
      : daysLeft === 0
        ? "Aujourd'hui"
        : daysLeft < 0
          ? `En retard ${-daysLeft} j`
          : `Dans ${daysLeft} j`;

  return (
    // La carte n'est pas cliquable en bloc : le bouton « Planifier » reste atteignable au lecteur d'écran
    <Card style={[styles.card, due && styles.cardDue]}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${marker.name}, ${badge.toLowerCase()}${planned ? ', déjà planifiée' : ''}. ${lastLine}. ${nextLine}`}
        accessibilityHint="Ouvre l'évolution de cette molécule"
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
        <IconCircle
          icon={due ? TriangleAlert : Droplet}
          size={48}
          bg={due ? 'rgba(255,255,255,0.2)' : Palette.coralSoft}
          color={due ? '#FFFFFF' : Palette.coralDeep}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="labelMd" style={homeStyles.itemTitle} color={fg} numberOfLines={1}>
            {marker.name}
          </AppText>
          <AppText variant="bodySm" color={muted} numberOfLines={1}>
            {lastLine}
          </AppText>
          <AppText variant="bodySm" color={muted} numberOfLines={1}>
            {nextLine}
          </AppText>
        </View>
        <View style={styles.badges}>
          <Badge label={badge} tone={due ? 'light' : daysLeft !== null && daysLeft <= 14 ? 'amber' : 'neutral'} />
          {planned && <Badge label="Planifié" tone={due ? 'light' : 'limeSoft'} />}
        </View>
      </Pressable>

      {due && !planned && (
        <Pressable
          onPress={onPlan}
          accessibilityRole="button"
          accessibilityLabel={`Planifier une prise de sang pour ${marker.name}`}
          style={({ pressed }) => [styles.planBtn, pressed && { opacity: 0.8 }]}>
          <CalendarPlus size={16} color={Palette.coralDeep} />
          <AppText variant="labelMd" color={Palette.coralDeep}>
            Planifier
          </AppText>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 24, gap: 12 },
  cardDue: {
    backgroundColor: Palette.coralDeep,
    shadowColor: Palette.coralDeep,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badges: { alignItems: 'flex-end', gap: 6 },
  planBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
});
