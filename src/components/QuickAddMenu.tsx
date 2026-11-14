import { router } from 'expo-router';
import { ChevronRight, Droplet, NotebookPen, Stethoscope, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Palette } from '../constants/theme';
import { todayIso } from '../lib/dates';
import { actionError } from '../lib/errors';
import { SyncEvent, useInitialSyncing } from '../lib/syncEvent';
import { Toast } from '../lib/toast';
import { StorageService } from '../services/storageService';
import { CheckupKind, LabMarkerDefinition, PlannedCheckup } from '../types';
import { PlanningSheet } from './analyses/Planning';
import { BottomSheet } from './analyses/shared';
import { AppText, IconCircle } from './ui';

/** Planification ouverte : `session` sert de `key` pour repartir d'un formulaire vierge. */
type PlanState = { session: number; kind: CheckupKind; markers: LabMarkerDefinition[] };

/**
 * Menu du bouton + du dock : saisie du jour ou planification rapide.
 * La planification s'ouvre par-dessus l'écran courant ; après enregistrement,
 * `SyncEvent` fait recharger le cache à tous les écrans (accueil, analyses…).
 */
export function QuickAddMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const initialSyncing = useInitialSyncing();
  const [opening, setOpening] = useState<CheckupKind | null>(null);
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [session, setSession] = useState(0);

  const openDailyEntry = () => {
    onClose();
    router.push({ pathname: '/entry', params: { date: todayIso() } });
  };

  const openPlanning = async (kind: CheckupKind) => {
    setOpening(kind);
    try {
      const markers = await StorageService.getLabMarkers();
      const next = session + 1;
      setSession(next);
      setPlan({ session: next, kind, markers });
      onClose();
    } catch (e) {
      console.error('[quick-add] chargement des molécules', e);
      Toast.error('Impossible de charger les molécules');
    } finally {
      setOpening(null);
    }
  };

  const savePlan = async (item: PlannedCheckup) => {
    try {
      await StorageService.savePlannedCheckup(item);
      // Les écrans déjà montés ne repassent pas par le focus : on leur demande de relire le cache
      SyncEvent.emit();
    } catch (e) {
      console.error('[quick-add] enregistrement planification', e);
      Toast.error(actionError(e, 'planifier'));
      throw e;
    }
  };

  const busy = opening !== null;
  // Pendant la synchro de connexion, les molécules ne sont pas encore en cache
  const planDisabled = busy || initialSyncing;

  return (
    <>
      {visible && (
        <BottomSheet
          visible
          // Fermeture bloquée pendant le chargement, sinon la planification s'ouvrirait après coup
          onClose={busy ? () => {} : onClose}
          icon={null}
          title="Ajouter"
          subtitle="Que veux-tu enregistrer ?">
          <MenuRow
            icon={NotebookPen}
            title="Données du jour"
            subtitle="Journal d'aujourd'hui"
            disabled={busy}
            onPress={openDailyEntry}
          />
          <MenuRow
            icon={Droplet}
            title="Planifier prise de sang"
            subtitle={initialSyncing ? 'Synchronisation en cours…' : 'Molécules à doser et date prévue'}
            loading={opening === 'blood'}
            disabled={planDisabled}
            onPress={() => openPlanning('blood')}
          />
          <MenuRow
            icon={Stethoscope}
            title="Planifier examen"
            subtitle={initialSyncing ? 'Synchronisation en cours…' : 'Examen médical à venir'}
            loading={opening === 'exam'}
            disabled={planDisabled}
            onPress={() => openPlanning('exam')}
          />
        </BottomSheet>
      )}
      {plan && (
        <PlanningSheet
          key={plan.session}
          visible
          onClose={() => setPlan(null)}
          initialKind={plan.kind}
          editing={null}
          markers={plan.markers}
          onSave={savePlan}
        />
      )}
    </>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  loading,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.row,
        disabled && !loading && styles.rowDisabled,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}>
      <IconCircle icon={icon} size={44} bg={Palette.limeSoft} color={Palette.primary} />
      <View style={styles.rowText}>
        <AppText variant="labelMd" style={{ fontSize: 15 }}>
          {title}
        </AppText>
        <AppText variant="bodySm" color={Palette.textMuted}>
          {subtitle}
        </AppText>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={Palette.text} />
      ) : (
        <ChevronRight size={18} color={Palette.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 24,
    backgroundColor: Palette.containerLow,
  },
  rowDisabled: { opacity: 0.5 },
  rowText: { flex: 1, gap: 2 },
});
