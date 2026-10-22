import React, { useEffect, useState } from 'react';
import { View, Pressable, TextInput, Alert, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { CalendarClock, Camera, Check, ImagePlus, MapPin, Pencil, Plus, ScanLine, Trash2, X } from 'lucide-react-native';
import { LabMarkerDefinition, MedicalExam, MedicalExamType, PlannedCheckup } from '../../types';
import { StorageService } from '../../services/storageService';
import { Palette, Radius } from '../../constants/theme';
import { AppText, Badge, Card, IconCircle, PillButton, Segmented, inputStyle } from '../ui';
import { frDate, todayIso } from '../../lib/dates';
import { Toast } from '../../lib/toast';
import { BottomSheet, DateField, Field, sharedStyles } from './shared';
import { PlannedSection } from './Planning';

const TYPE_LABEL: Record<MedicalExamType, string> = { radio: 'Radio', echographie: 'Échographie' };

/**
 * Photo stockée dans le bucket privé : on demande une URL signée à l'affichage.
 * À monter avec `key={path}` pour repartir d'un état vierge quand la photo change.
 */
function ExamPhoto({ path, onPress }: { path: string; onPress?: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    StorageService.getExamPhotoUrl(path)
      .then((u) => !cancelled && setUrl(u))
      .catch((e) => {
        console.error('[analyses] URL photo examen', e);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (failed) {
    return (
      <View style={[styles.photo, styles.photoPlaceholder]}>
        <AppText variant="bodySm" color={Palette.textMuted}>
          Photo indisponible hors ligne
        </AppText>
      </View>
    );
  }
  if (!url) {
    return (
      <View style={[styles.photo, styles.photoPlaceholder]}>
        <ActivityIndicator color={Palette.textMuted} />
      </View>
    );
  }
  return (
    <Pressable onPress={() => onPress?.(url)}>
      <Image source={{ uri: url }} style={styles.photo} contentFit="cover" />
    </Pressable>
  );
}

export function ExamsTab({
  exams,
  onExamsChange,
  markers,
  planned,
  onPlan,
  onEditPlan,
  onDeletePlan,
  onCheckupDone,
}: {
  exams: MedicalExam[];
  onExamsChange: (exams: MedicalExam[]) => void;
  markers: LabMarkerDefinition[];
  planned: PlannedCheckup[];
  onPlan: () => void;
  onEditPlan: (item: PlannedCheckup) => void;
  onDeletePlan: (item: PlannedCheckup) => void;
  onCheckupDone: (item: PlannedCheckup) => Promise<void>;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MedicalExam | null>(null);
  const [completing, setCompleting] = useState<PlannedCheckup | null>(null);
  const [type, setType] = useState<MedicalExamType>('echographie');
  const [date, setDate] = useState(todayIso());
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [result, setResult] = useState('');
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const openAdd = (fromPlan: PlannedCheckup | null = null) => {
    setEditing(null);
    setCompleting(fromPlan);
    const today = todayIso();
    setType(fromPlan && /radio/i.test(fromPlan.examLabel) ? 'radio' : 'echographie');
    setDate(fromPlan && fromPlan.date <= today ? fromPlan.date : today);
    setTitle(fromPlan?.examLabel ?? '');
    setLocation('');
    setResult(fromPlan?.note ?? '');
    setLocalPhotoUri(null);
    setRemovePhoto(false);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (exam: MedicalExam) => {
    setEditing(exam);
    setCompleting(null);
    setType(exam.type);
    setDate(exam.date);
    setTitle(exam.title);
    setLocation(exam.location);
    setResult(exam.result);
    setLocalPhotoUri(null);
    setRemovePhoto(false);
    setErrors({});
    setShowModal(true);
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Toast.error(source === 'camera' ? "Accès à l'appareil photo refusé" : 'Accès aux photos refusé');
        return;
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
      const res =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (!res.canceled && res.assets[0]) {
        setLocalPhotoUri(res.assets[0].uri);
        setRemovePhoto(false);
      }
    } catch (e) {
      console.error('[analyses] sélection photo', e);
      Toast.error('Impossible de récupérer la photo');
    }
  };

  const choosePhoto = () => {
    Alert.alert('Ajouter une photo', undefined, [
      { text: 'Prendre une photo', onPress: () => pickPhoto('camera') },
      { text: 'Choisir dans la galerie', onPress: () => pickPhoto('library') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Précise l'examen (ex : échographie thyroïdienne).";
    if (!location.trim()) next.location = 'Indique le lieu.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const exam: MedicalExam = {
      id: editing?.id ?? Crypto.randomUUID(),
      type,
      date,
      title: title.trim(),
      location: location.trim(),
      result: result.trim(),
      photoPath: editing?.photoPath ?? null,
    };

    setSaving(true);
    try {
      onExamsChange(await StorageService.saveMedicalExam(exam, { localPhotoUri, removePhoto }));
    } catch (e) {
      console.error('[analyses] enregistrement examen', e);
      Toast.error("Impossible d'enregistrer l'examen. Vérifie ta connexion.");
      setSaving(false);
      return;
    }
    if (completing) {
      try {
        await onCheckupDone(completing);
      } catch {
        // Examen enregistré ; le parent a signalé l'échec de clôture de la planification
      }
    }
    setSaving(false);
    setShowModal(false);
  };

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
            Toast.error('Connexion requise pour supprimer');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const currentPhotoPath = !removePhoto && !localPhotoUri ? editing?.photoPath ?? null : null;

  return (
    <>
      <View style={sharedStyles.rowFields}>
        <PillButton label="Ajouter" icon={Plus} onPress={() => openAdd()} style={{ flex: 1 }} />
        <PillButton label="Planifier" icon={CalendarClock} variant="ghost" onPress={onPlan} style={{ flex: 1 }} />
      </View>

      <PlannedSection
        items={planned}
        markers={markers}
        onComplete={(item) => openAdd(item)}
        onEdit={onEditPlan}
        onDelete={onDeletePlan}
      />

      {exams.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 32 }}>
          <IconCircle icon={ScanLine} size={52} />
          <AppText variant="headlineSm">Aucun examen</AppText>
          <AppText variant="bodySm" color={Palette.textMuted} style={{ textAlign: 'center' }}>
            Enregistre tes radios et échographies avec leur résultat et une photo du compte rendu.
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
                <Pressable onPress={() => openEdit(exam)} style={sharedStyles.roundBtn} hitSlop={6} accessibilityLabel="Modifier cet examen">
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

      <BottomSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        icon={ScanLine}
        title={editing ? "Modifier l'examen" : 'Nouvel examen'}
        subtitle="Radio ou échographie">
        <Segmented
          options={[
            { id: 'echographie', label: 'Échographie' },
            { id: 'radio', label: 'Radio' },
          ]}
          value={type}
          onChange={setType}
        />
        <Field label="Examen" error={errors.title}>
          <TextInput
            style={inputStyle}
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setErrors((e) => ({ ...e, title: '' }));
            }}
            placeholder="Ex : échographie thyroïdienne"
            placeholderTextColor={Palette.textMuted}
          />
        </Field>
        <DateField label="Date de l'examen" value={date} onChange={setDate} mode="past" />
        <Field label="Lieu" error={errors.location}>
          <TextInput
            style={inputStyle}
            value={location}
            onChangeText={(t) => {
              setLocation(t);
              setErrors((e) => ({ ...e, location: '' }));
            }}
            placeholder="Ex : Centre d'imagerie Paris 15"
            placeholderTextColor={Palette.textMuted}
          />
        </Field>
        <Field label="Résultat">
          <TextInput
            style={[inputStyle, sharedStyles.multiline]}
            multiline
            value={result}
            onChangeText={setResult}
            placeholder="Ex : nodule de 4 mm, à contrôler dans 1 an"
            placeholderTextColor={Palette.textMuted}
          />
        </Field>
        <Field label="Photo (optionnel)">
          {localPhotoUri ? (
            <Image source={{ uri: localPhotoUri }} style={styles.photo} contentFit="cover" />
          ) : currentPhotoPath ? (
            <ExamPhoto key={currentPhotoPath} path={currentPhotoPath} />
          ) : null}
          <View style={sharedStyles.rowFields}>
            <PillButton
              label={localPhotoUri || currentPhotoPath ? 'Changer' : 'Ajouter une photo'}
              icon={localPhotoUri || currentPhotoPath ? Camera : ImagePlus}
              variant="ghost"
              compact
              onPress={choosePhoto}
              style={{ flex: 1 }}
            />
            {(localPhotoUri || currentPhotoPath) && (
              <PillButton
                label="Retirer"
                icon={X}
                variant="coral"
                compact
                onPress={() => {
                  setLocalPhotoUri(null);
                  if (editing?.photoPath) setRemovePhoto(true);
                }}
                style={{ flex: 1 }}
              />
            )}
          </View>
        </Field>
        <PillButton
          label={editing ? 'Enregistrer les modifications' : "Enregistrer l'examen"}
          icon={Check}
          onPress={handleSave}
          loading={saving}
          disabled={saving}
        />
      </BottomSheet>

      <Modal visible={viewerUrl !== null} transparent animationType="fade" onRequestClose={() => setViewerUrl(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewerUrl(null)}>
          {viewerUrl && <Image source={{ uri: viewerUrl }} style={{ width: '100%', height: '80%' }} contentFit="contain" />}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', height: 180, borderRadius: Radius.lg, backgroundColor: Palette.containerLow },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
});
