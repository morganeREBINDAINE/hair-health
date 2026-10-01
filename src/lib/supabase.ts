import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

const SafeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return null;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    await AsyncStorage.removeItem(key);
  },
};

export const DEFAULT_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://votre-projet.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'votre-cle-anon';

export const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
  auth: {
    storage: SafeStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Sur web : true pour que Supabase lise automatiquement le code/token dans l'URL de callback
    // Sur natif : false car on gère la session manuellement via WebBrowser
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export const signInWithGoogle = async () => {
  try {
    if (Platform.OS === 'web') {
      // Web : redirection pleine page — pas besoin de WebBrowser
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) throw error;
      // Le navigateur est redirigé vers Google, la fonction ne retourne rien d'utile ici
      return { success: true };
    }

    // Natif (iOS / Android) : deep link via expo-web-browser
    const redirectUrl = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data?.url) return { success: false };

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    if (res.type === 'success' && res.url) {
      const parsed = Linking.parse(res.url);
      const access_token = parsed.queryParams?.access_token as string | undefined;
      const refresh_token = parsed.queryParams?.refresh_token as string | undefined;
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      } else {
        // Flux PKCE : échange du code
        const code = parsed.queryParams?.code as string | undefined;
        if (code) await supabase.auth.exchangeCodeForSession(code);
      }
      return { success: true };
    }

    return { success: false };
  } catch (err: any) {
    console.error('Erreur de connexion Google:', err);
    return { success: false, error: err.message };
  }
};
