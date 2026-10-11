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
    flowType: 'pkce',
  },
});

const handledAuthUrls = new Set<string>();

export const createSessionFromUrl = async (url: string) => {
  if (handledAuthUrls.has(url)) return supabase.auth.getSession().then(({ data }) => data.session);
  handledAuthUrls.add(url);

  const parsed = Linking.parse(url);
  const params = (parsed.queryParams ?? {}) as Record<string, string>;

  if (params.error || params.error_description) {
    throw new Error(params.error_description || params.error);
  }

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return data.session;
  }

  return null;
};

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
    console.log('[OAuth] redirectUrl =', redirectUrl);
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
    console.log('[OAuth] result =', res.type);
    if (res.type === 'success' && res.url) {
      await createSessionFromUrl(res.url);
      return { success: true };
    }

    // Sur Android, le retour peut arriver via le deep link (géré dans _layout.tsx)
    // alors qu'openAuthSessionAsync renvoie "dismiss" : on vérifie la session avant d'abandonner.
    const { data: current } = await supabase.auth.getSession();
    return { success: !!current.session };
  } catch (err: any) {
    console.error('Erreur de connexion Google:', err);
    return { success: false, error: err.message };
  }
};
