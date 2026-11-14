import { Check, ChevronRight, NotebookPen } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Palette } from '../../constants/theme';
import { longDay } from '../../lib/dates';
import { AppText, Card, IconCircle } from '../ui';

/** Date du jour et état de la saisie quotidienne : invitation à noter, ou confirmation. */
export function TodayStatus({ today, logged, onOpenEntry }: { today: string; logged: boolean; onOpenEntry: () => void }) {
  return (
    <View style={{ gap: 12 }}>
      <AppText variant="labelMd" color={Palette.textVariant} accessibilityRole="header">
        {longDay(today)}
      </AppText>

      {logged ? (
        <Card
          onPress={onOpenEntry}
          style={styles.row}
          accessibilityLabel="Journée notée"
          accessibilityHint="Ouvre le journal du jour pour le compléter ou le modifier">
          <IconCircle icon={Check} bg={Palette.limeSoft} color={Palette.primary} size={36} />
          <View style={{ flex: 1 }}>
            <AppText variant="labelMd">Journée notée</AppText>
            <AppText variant="bodySm" color={Palette.textMuted}>
              Touche pour compléter ou modifier
            </AppText>
          </View>
          <ChevronRight size={20} color={Palette.textMuted} />
        </Card>
      ) : (
        <Card
          onPress={onOpenEntry}
          style={styles.row}
          accessibilityLabel="Journée pas encore notée"
          accessibilityHint="Ouvre le journal du jour">
          <IconCircle icon={NotebookPen} bg={Palette.lime} color={Palette.obsidian} size={44} />
          <View style={{ flex: 1 }}>
            <AppText variant="labelMd">Journée pas encore notée</AppText>
            <AppText variant="bodySm" color={Palette.textMuted}>
              Chute, anxiété, compléments… 1 minute suffit.
            </AppText>
          </View>
          <ChevronRight size={20} color={Palette.text} />
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
});
