import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { StorageService } from '../../services/storageService';
import { Palette, Radius } from '../../constants/theme';
import { AppText } from '../ui';

/**
 * Photo stockée dans le bucket privé : on demande une URL signée à l'affichage.
 * À monter avec `key={path}` pour repartir d'un état vierge quand la photo change.
 */
export function ExamPhoto({ path, onPress }: { path: string; onPress?: (url: string) => void }) {
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
      <View style={[photoStyles.photo, photoStyles.placeholder]}>
        <AppText variant="bodySm" color={Palette.textMuted}>
          Photo indisponible hors ligne
        </AppText>
      </View>
    );
  }
  if (!url) {
    return (
      <View style={[photoStyles.photo, photoStyles.placeholder]}>
        <ActivityIndicator color={Palette.textMuted} />
      </View>
    );
  }
  return (
    <Pressable onPress={() => onPress?.(url)} disabled={!onPress}>
      <Image source={{ uri: url }} style={photoStyles.photo} contentFit="cover" />
    </Pressable>
  );
}

export const photoStyles = StyleSheet.create({
  photo: { width: '100%', height: 180, borderRadius: Radius.lg, backgroundColor: Palette.containerLow },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
