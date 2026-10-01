import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handle = async () => {
      try {
        // Sur web, Supabase detectSessionInUrl:true a déjà traité le hash/code.
        // On attend un court instant que le client finalise, puis on redirige.
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          const code = url.searchParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        }
      } catch (e) {
        console.error('Auth callback error:', e);
      } finally {
        router.replace('/export');
      }
    };

    handle();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1A1C1F" />
      <Text style={styles.text}>Connexion en cours…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E4E8DB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: '#637064',
  },
});
