import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

if (Platform.OS !== 'web' || typeof window !== 'undefined') {
  WebBrowser.maybeCompleteAuthSession();
}

// Adaptateur de stockage sécurisé contre les erreurs SSR / window is not defined
const SafeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
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
    detectSessionInUrl: false,
  },
});

export const signInWithGoogle = async () => {
  try {
    const redirectUrl = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (data?.url) {
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (res.type === 'success' && res.url) {
        const parsed = Linking.parse(res.url);
        if (parsed.queryParams?.access_token && parsed.queryParams?.refresh_token) {
          await supabase.auth.setSession({
            access_token: parsed.queryParams.access_token as string,
            refresh_token: parsed.queryParams.refresh_token as string,
          });
        }
        return { success: true };
      }
    }
    return { success: false };
  } catch (err: any) {
    console.error('Erreur de connexion Google:', err);
    return { success: false, error: err.message };
  }
};
