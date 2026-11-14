import { Sparkles } from 'lucide-react-native';
import { Palette } from '../../constants/theme';
import type { HairChartPoint } from '../../lib/dashboard';
import { PillBarChart } from '../charts';
import { Badge, Card, SectionHeader } from '../ui';
import { EmptyHint } from './shared';

/** Évolution des dernières estimations de chute, jours de règles en rouge. */
export function HairLossCard({ points }: { points: HairChartPoint[] }) {
  return (
    <Card style={{ gap: 12 }}>
      <SectionHeader
        icon={Sparkles}
        iconColor={Palette.primary}
        iconBg={Palette.limeSoft}
        title="Perte de cheveux"
        right={<Badge label={points.length > 1 ? `${points.length} dernières saisies` : 'Dernières saisies'} />}
      />
      {points.length > 1 ? (
        <PillBarChart data={points} legend />
      ) : (
        <EmptyHint text="Renseigne au moins 2 estimations de chute dans le journal pour afficher l'évolution." />
      )}
    </Card>
  );
}
