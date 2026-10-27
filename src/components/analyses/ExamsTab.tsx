import React, { useState } from 'react';
import { View, Pressable, Alert, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { MapPin, Pencil, ScanLine, Trash2 } from 'lucide-react-native';
import { MedicalExam, MedicalExamType } from '../../types';
import { StorageService } from '../../services/storageService';
import { Palette } from '../../constants/theme';
import { AppText, Badge, Card, IconCircle, SkeletonCard } from '../ui';
import { frDate } from '../../lib/dates';
import { Toast } from '../../lib/toast';
import { actionError } from '../../lib/errors';
import { sharedStyles } from './shared';
import { ExamPhoto } from './ExamPhoto';

const TYPE_LABEL: Record<MedicalExamType, string> = { radio: 'Radio', echographie: 'Échographie' };

export function ExamsTab({
  loading,
  exams,
  onExamsChange,
  onEditExam,
}: {
  loading: boolean;
  exams: MedicalExam[];
  onExamsChange: (exams: MedicalExam[]) => void;
  onEditExam: (exam: MedicalExam) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  if (loading) {
    return (
      <>
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </>
    );
  }

  const confirmDelete = (exam: MedicalExam) => {
    Alert.alert('Supprimer cet examen ?', 'La photo associée sera aussi supprimée.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(exam.id);
          try {
            onExamsChange(await StorageService.deleteMedicalExam(exam.id));
          } catch (e) {
            console.error('[analyses] suppression examen', e);
            Toast.error(actionError(e, 'supprimer'));
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <>
      {exams.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 32 }}>
          <IconCircle icon={ScanLine} size={52} />
          <AppText variant="headlineSm">Aucun examen</AppText>
          <AppText variant="bodySm" color={Palette.textMuted} style={{ textAlign: 'center' }}>
            Appuie sur « + » pour enregistrer tes radios et échographies avec leur résultat et une photo.
          </AppText>
        </Card>
      ) : (
        exams.map((exam) => (
          <Card key={exam.id} style={{ gap: 12, opacity: deletingId === exam.id ? 0.5 : 1 }}>
            <View style={sharedStyles.rowBetweenTop}>
              <View style={sharedStyles.inlineLg}>
                <IconCircle icon={ScanLine} size={40} bg={Palette.limeSoft} color={Palette.primary} />
                <View style={{ flexShrink: 1 }}>
                  <AppText variant="labelSm" color={Palette.textMuted}>
                    {frDate(exam.date)}
                  </AppText>
                  <AppText variant="headlineSm" style={{ fontSize: 17 }}>
                    {exam.title}
                  </AppText>
                </View>
              </View>
              <View style={sharedStyles.actions}>
                <Pressable onPress={() => onEditExam(exam)} style={sharedStyles.roundBtn} hitSlop={6} accessibilityLabel="Modifier cet examen">
                  <Pencil size={16} color={Palette.text} />
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(exam)}
                  disabled={deletingId !== null}
                  style={sharedStyles.deleteBtn}
                  hitSlop={6}
                  accessibilityLabel="Supprimer cet examen">
                  {deletingId === exam.id ? (
                    <ActivityIndicator size="small" color={Palette.coralDeep} />
                  ) : (
                    <Trash2 size={17} color={Palette.coralDeep} />
                  )}
                </Pressable>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Badge label={TYPE_LABEL[exam.type]} tone="neutral" />
              {exam.location ? <Badge label={exam.location} tone="light" icon={MapPin} /> : null}
            </View>
            {exam.result ? (
              <AppText variant="bodyMd" color={Palette.textVariant}>
                {exam.result}
              </AppText>
            ) : null}
            {exam.photoPath ? <ExamPhoto key={exam.photoPath} path={exam.photoPath} onPress={setViewerUrl} /> : null}
          </Card>
        ))
      )}

      <Modal visible={viewerUrl !== null} transparent animationType="fade" onRequestClose={() => setViewerUrl(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewerUrl(null)}>
          {viewerUrl && <Image source={{ uri: viewerUrl }} style={{ width: '100%', height: '80%' }} contentFit="contain" />}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
});
