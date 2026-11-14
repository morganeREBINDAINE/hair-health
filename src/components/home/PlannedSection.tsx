import { CalendarClock, CircleCheck } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Palette, Spacing } from '../../constants/theme';
import { HOME_HORIZON_DAYS, type PlannedAgenda } from '../../lib/dashboard';
import { daysBetween, frDate } from '../../lib/dates';
import { LabMarkerDefinition, PlannedCheckup } from '../../types';
import { checkupLabel } from '../analyses/Planning';
import { AppText, Badge, Card, IconCircle } from '../ui';
import { HomeSection, SectionLink, homeStyles } from './shared';

/** Prises de sang et examens planifiés, en retard ou dans les 30 prochains jours. */
export function PlannedSection({
  agenda,
  markers,
  today,
  onSeeAll,
  onDone,
}: {
  agenda: PlannedAgenda;
  markers: LabMarkerDefinition[];
  today: string;
  /** Ouvre l'onglet « Planifiés » des Analyses. */
  onSeeAll: () => void;
  onDone: (item: PlannedCheckup) => void;
}) {
  const { planned, nextLater } = agenda;
  if (planned.length === 0 && !nextLater) return null;

  return (
    <HomeSection
      title="Prises de sang et examens planifiés"
      right={<SectionLink label="Tout voir" onPress={onSeeAll} accessibilityLabel="Voir tous les rendez-vous planifiés" />}>
      {planned.length === 0 && nextLater && (
        <Card style={homeStyles.itemRow} accessibilityLabel={`Rien dans les ${HOME_HORIZON_DAYS} prochains jours. Prochain le ${frDate(nextLater)}`}>
          <IconCircle icon={CalendarClock} size={48} bg={Palette.limeSoft} color={Palette.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="labelMd" style={homeStyles.itemTitle}>
              Rien dans les {HOME_HORIZON_DAYS} prochains jours
            </AppText>
            <AppText variant="bodySm" color={Palette.textMuted}>
              Prochain rendez-vous le {frDate(nextLater)}
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
          onOpen={onSeeAll}
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
              onOpen={onSeeAll}
              onDone={() => onDone(c)}
            />
          ))}
        </ScrollView>
      ) : null}

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

const styles = StyleSheet.create({
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
