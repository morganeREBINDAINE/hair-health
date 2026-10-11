import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Palette } from '../constants/theme';
import { AppText } from './ui';

export function InfinityLoader({ size = 64, color = Palette.primary }: { size?: number; color?: string }) {
  const [phase] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  const w = size;
  const h = size * 0.5;
  const halfW = w / 2;
  const r = h / 2 - 2;

  const rotate = phase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '360deg'],
  });

  const scaleX = phase.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.85, 1, 0.85, 1],
  });

  return (
    <Animated.View
      style={{
        width: w,
        height: h,
        transform: [{ rotate }, { scaleX }],
      }}>
      <View
        style={{
          position: 'absolute',
          left: halfW - r * 2 - 1,
          top: h / 2 - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          borderWidth: 3,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: halfW + 1,
          top: h / 2 - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          borderWidth: 3,
          borderColor: color,
        }}
      />
    </Animated.View>
  );
}

/** Loader centré « Chargement de vos données… », utilisé pendant la récupération des données. */
export function DataLoading() {
  return (
    <View style={styles.container}>
      <InfinityLoader size={64} color={Palette.primary} />
      <AppText variant="labelMd" color={Palette.textMuted} style={{ marginTop: 16 }}>
        Chargement de vos données…
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.canvas },
});
