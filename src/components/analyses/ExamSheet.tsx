import React, { useState } from 'react';
import { View, TextInput, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { Camera, Check, ImagePlus, ScanLine, X } from 'lucide-react-native';
import { MedicalExam, MedicalExamType, PlannedCheckup } from '../../types';
import { StorageService } from '../../services/storageService';
import { Palette } from '../../constants/theme';
import { PillButton, Segmented, inputStyle } from '../ui';
import { todayIso } from '../../lib/dates';
import { Toast } from '../../lib/toast';
import { BottomSheet, DateField, Field, sharedStyles } from './shared';
import { ExamPhoto, photoStyles } from './ExamPhoto';

/**
 * Saisie / modification d'un examen (radio, échographie) avec photo facultative.
 * À monter avec une `key` propre à chaque ouverture : l'état initial vient des props.
 * `fromPlan` : planification réalisée, marquée faite une fois l'examen enregistré.
 */
export function ExamSheet({
  visible,
  onClose,
  editing,
  fromPlan,
  onExamsChange,
  onCheckupsChange,
}: {
  visible: boolean;
  onClose: () => void;
  editing: MedicalExam | null;
  fromPlan: PlannedCheckup | null;
  onExamsChange: (exams: MedicalExam[]) => void;
  onCheckupsChange?: (checkups: PlannedCheckup[]) => void;
}) {
  const today = todayIso();
  const [type, setType] = useState<MedicalExamType>(
    editing?.type ?? (fromPlan && /radio/i.test(fromPlan.examLabel) ? 'radio' : 'echographie'),
  );
  const [date, setDate] = useState(editing?.date ?? (fromPlan && fromPlan.date <= today ? fromPlan.date : today));
  const [title, setTitle] = useState(editing?.title ?? fromPlan?.examLabel ?? '');
  const [location, setLocation] = useState(editing?.location ?? '');
  const [result, setResult] = useState(editing?.result ?? fromPlan?.note ?? '');
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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

    setSaving(true);
    try {
      onExamsChange(
        await StorageService.saveMedicalExam(
          {
            id: editing?.id ?? Crypto.randomUUID(),
            type,
            date,
            title: title.trim(),
            location: location.trim(),
            result: result.trim(),
            photoPath: editing?.photoPath ?? null,
          },
          { localPhotoUri, removePhoto },
        ),
      );
    } catch (e) {
      console.error('[analyses] enregistrement examen', e);
      Toast.error("Impossible d'enregistrer l'examen. Vérifie ta connexion.");
      setSaving(false);
      return;
    }
    if (fromPlan) {
      try {
        const checkups = await StorageService.savePlannedCheckup({ ...fromPlan, done: true });
        onCheckupsChange?.(checkups);
      } catch (e) {
        console.error('[analyses] clôture planification', e);
        Toast.error('Examen enregistré, mais le rendez-vous reste ouvert');
      }
    }
    setSaving(false);
    onClose();
  };

  const currentPhotoPath = !removePhoto && !localPhotoUri ? editing?.photoPath ?? null : null;
  const hasPhoto = Boolean(localPhotoUri || currentPhotoPath);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
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
          <Image source={{ uri: localPhotoUri }} style={photoStyles.photo} contentFit="cover" />
        ) : currentPhotoPath ? (
          <ExamPhoto key={currentPhotoPath} path={currentPhotoPath} />
        ) : null}
        <View style={sharedStyles.rowFields}>
          <PillButton
            label={hasPhoto ? 'Changer' : 'Ajouter une photo'}
            icon={hasPhoto ? Camera : ImagePlus}
            variant="ghost"
            compact
            onPress={choosePhoto}
            style={{ flex: 1 }}
          />
          {hasPhoto && (
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
  );
}
