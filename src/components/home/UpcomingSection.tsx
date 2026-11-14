import { CalendarClock, CircleCheck, Droplet, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Palette, Spacing } from '../../constants/theme';
import { HOME_HORIZON_DAYS, type UpcomingAgenda } from '../../lib/dashboard';
import { daysBetween, frDate } from '../../lib/dates';
import type { RecheckReminder } from '../../lib/labStatus';
import { LabMarkerDefinition, PlannedCheckup } from '../../types';
import { checkupLabel } from '../analyses/Planning';
import { AppText, Badge, Card, IconCircle, ShowMoreToggle } from '../ui';
import { HomeSection, SectionLink, homeStyles } from './shared';

/** Nombre de prises de sang à prévoir affichées avant « Voir plus ». */
const CHECKS_PREVIEW = 3;

/** Rendez-vous planifiés et prises de sang à prévoir, en retard ou dans les 30 prochains jours. */
export function UpcomingSection({
  agenda,
  markers,
  today,
  onSeeAll,
  onOpenPlanned,
  onDone,
  onOpenMarker,
}: {
  agenda: UpcomingAgenda;
  markers: LabMarkerDefinition[];
  today: string;
  onSeeAll: () => void;
  onOpenPlanned: () => void;
  onDone: (item: PlannedCheckup) => void;
  onOpenMarker: (markerId: string) => void;
}) {
  const [showAllChecks, setShowAllChecks] = useState(false);
  const { planned, checks, nextLater } = agenda;
  if (planned.length === 0 && checks.length === 0 && !nextLater) return null;

  const shownChecks = showAllChecks ? checks : checks.slice(0, CHECKS_PREVIEW);

  return (
    <HomeSection
      title="À venir"
      right={<SectionLink label="Tout voir" onPress={onSeeAll} accessibilityLabel="Voir tous les rendez-vous planifiés" />}>
      {planned.length === 0 && checks.length === 0 && nextLater && (
        <Card style={homeStyles.itemRow} accessibilityLabel={`Rien dans les ${HOME_HORIZON_DAYS} prochains jours. Prochain le ${frDate(nextLater)}`}>
          <IconCircle icon={CalendarClock} size={48} bg={Palette.limeSoft} color={Palette.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="labelMd" style={homeStyles.itemTitle}>
              Rien dans les {HOME_HORIZON_DAYS} prochains jours
            </AppText>
            <AppText variant="bodySm" color={Palette.textMuted}>
              Prochain rendez-vous ou contrôle le {frDate(nextLater)}
            </AppText>
          </View>
        </Card>
      )}

      {/* Un seul rendez-vous : hors carrousel, la carte est bornée à la largeur de l'écran */}
      {planned.length === 1 ? (
        <PlannedCard
          item={planned[0]}
          label={checkupLabel(planned[0], markers)}
          today={today}
          single
          onOpen={onOpenPlanned}
          onDone={() => onDone(planned[0])}
        />
      ) : planned.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} style={styles.carouselBleed}>
          {planned.map((c) => (
            <PlannedCard
              key={c.id}
              item={c}
              label={checkupLabel(c, markers)}
              today={today}
              single={false}
              onOpen={onOpenPlanned}
              onDone={() => onDone(c)}
            />
          ))}
        </ScrollView>
      ) : null}

      {shownChecks.map((r) => (
        <BloodCheckRow key={r.marker.id} check={r} onPress={() => onOpenMarker(r.marker.id)} />
      ))}
      {checks.length > CHECKS_PREVIEW && (
        <ShowMoreToggle
          expanded={showAllChecks}
          hiddenCount={checks.length - CHECKS_PREVIEW}
          onToggle={() => setShowAllChecks((v) => !v)}
        />
      )}
    </HomeSection>
  );
}

/** Carte de rendez-vous : verte pour un examen, rouge pour une prise de sang. */
function PlannedCard({
  item,
  label,
  today,
  single,
  onOpen,
  onDone,
}: {
  item: PlannedCheckup;
  label: string;
  today: string;
  single: boolean;
  onOpen: () => void;
  onDone: () => void;
}) {
  const blood = item.kind === 'blood';
  const fg = blood ? '#FFFFFF' : Palette.obsidian;
  const muted = blood ? 'rgba(255,255,255,0.85)' : 'rgba(18,22,20,0.7)';
  const days = daysBetween(today, item.date);
  const when = days < 0 ? `En retard ${-days} j` : days === 0 ? "Aujourd'hui" : `Dans ${days} j`;
  const kind = blood ? 'Prise de sang' : 'Examen';

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${kind} le ${frDate(item.date)}, ${when.toLowerCase()} : ${label}`}
      accessibilityHint="Ouvre les rendez-vous planifiés"
      style={({ pressed }) => [
        styles.plannedCard,
        single && { width: '100%' },
        { backgroundColor: blood ? Palette.coralDeep : Palette.lime },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}>
      <View style={homeStyles.rowBetween}>
        <View style={{ gap: 2, flex: 1 }}>
          <AppText variant="labelSm" color={muted}>
            {kind} · {frDate(item.date)}
          </AppText>
          <AppText variant="labelMd" color={fg} style={homeStyles.itemTitle} numberOfLines={3}>
            {label}
          </AppText>
          {item.note ? (
            <AppText variant="bodySm" color={muted} numberOfLines={1}>
              {item.note}
            </AppText>
          ) : null}
        </View>
        <Badge label={when} tone={blood ? 'light' : 'dark'} />
      </View>

      <Pressable
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel="C'est fait, saisir le résultat"
        style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.8 }]}>
        <CircleCheck size={16} color={blood ? Palette.coralDeep : Palette.obsidian} />
        <AppText variant="labelMd" color={blood ? Palette.coralDeep : Palette.obsidian}>
          C&apos;est fait
        </AppText>
      </Pressable>
    </Pressable>
  );
}

/** Prise de sang à prévoir pour une molécule suivie ; fond rouge quand elle est due. */
function BloodCheckRow({ check, onPress }: { check: RecheckReminder; onPress: () => void }) {
  const { due, last, months, dueDate, daysLeft, marker, status } = check;
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
    <Card
      onPress={onPress}
      style={[homeStyles.itemRow, due && styles.bloodDue]}
      accessibilityLabel={`Prise de sang ${marker.name}, ${badge.toLowerCase()}. ${lastLine}. ${nextLine}`}
      accessibilityHint="Ouvre l'évolution de cette molécule">
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
      <Badge label={badge} tone={due ? 'light' : daysLeft !== null && daysLeft <= 14 ? 'amber' : 'neutral'} />
    </Card>
  );
}

const styles = StyleSheet.create({
  bloodDue: {
    backgroundColor: Palette.coralDeep,
    shadowColor: Palette.coralDeep,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  // Le carrousel déborde jusqu'aux bords de l'écran tout en restant aligné sur la marge
  carouselBleed: { marginHorizontal: -Spacing.margin },
  carousel: { paddingHorizontal: Spacing.margin, gap: 12, flexGrow: 1 },
  plannedCard: { width: 250, borderRadius: 24, padding: 16, gap: 12 },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
});
