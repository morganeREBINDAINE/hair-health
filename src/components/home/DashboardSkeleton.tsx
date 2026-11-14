import { ScrollView, StyleSheet, View } from 'react-native';
import { Spacing } from '../../constants/theme';
import { Card, ScreenHeader, Skeleton, SkeletonCard } from '../ui';

/** Accueil pendant le chargement : même structure, données remplacées par des squelettes. */
export function DashboardSkeleton({ contentStyle }: { contentStyle: object }) {
  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Accueil" />
      <ScrollView contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false} scrollEnabled={false}>
        <View style={{ gap: 12 }}>
          <Skeleton width={140} height={14} />
          <SkeletonCard lines={1} />
        </View>
        <View style={styles.bento}>
          {[0, 1].map((i) => (
            <Card key={i} style={styles.bentoCard}>
              <Skeleton width={36} height={36} radius={18} />
              <Skeleton width="60%" height={34} />
              <Skeleton width="80%" height={12} />
            </Card>
          ))}
        </View>
        <SkeletonCard lines={1} />
        <Card style={{ gap: 16 }}>
          <Skeleton width="50%" height={20} />
          <Skeleton height={150} radius={16} />
        </Card>
        <Card style={{ gap: 16 }}>
          <Skeleton width="40%" height={20} />
          <Skeleton height={120} radius={16} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bento: { flexDirection: 'row', gap: Spacing.gutter },
  bentoCard: { flex: 1, padding: 16, height: 176, gap: 12 },
});
