import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Leaf, LogIn } from 'lucide-react-native';
import { signInWithGoogle } from '../lib/supabase';
import { Palette, Radius, Spacing } from '../constants/theme';
import { AppText, Card, PillButton } from './ui';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result && !result.success && result.error) {
        setError(result.error as string);
        setLoading(false);
      }
      // Sur web, la page entière redirige vers Google — pas besoin de reset loading
      if (Platform.OS !== 'web') {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoArea}>
          <View style={styles.logo}>
            <Leaf size={34} color={Palette.obsidian} />
          </View>
          <AppText variant="labelSm" color={Palette.textMuted} style={styles.eyebrow}>
            Vitalité Capillaire
          </AppText>
          <AppText variant="displayLg" style={{ textAlign: 'center' }}>
            Prends soin de toi, en douceur.
          </AppText>
          <AppText variant="bodyMd" color={Palette.textMuted} style={{ textAlign: 'center' }}>
            Chute, anxiété, compléments et bilans sanguins réunis au même endroit.
          </AppText>
        </View>

        <Card style={styles.card}>
          <AppText variant="headlineSm">Connexion</AppText>
          <AppText variant="bodyMd" color={Palette.textMuted}>
            Connecte-toi pour synchroniser tes données sur tous tes appareils.
          </AppText>

          {error ? (
            <View style={styles.error}>
              <AppText variant="bodySm" color={Palette.onCoral} style={{ textAlign: 'center' }}>
                {error}
              </AppText>
            </View>
          ) : null}

          <PillButton label="Se connecter avec Google" icon={LogIn} loading={loading} onPress={handleGoogle} />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  content: { width: '100%', maxWidth: 400, alignItems: 'center', gap: 28 },
  logoArea: { alignItems: 'center', gap: 10 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Palette.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: Palette.lime,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2 },
  card: { width: '100%', gap: 14, padding: 24, borderRadius: Radius.xxl },
  error: { backgroundColor: Palette.coralSoft, padding: 12, borderRadius: Radius.md },
});
