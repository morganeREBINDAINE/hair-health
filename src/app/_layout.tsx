import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator, Animated } from 'react-native';
import { Tabs } from 'expo-router';
import { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { House, CalendarDays, Plus, FlaskConical, Settings } from 'lucide-react-native';
import type { Session } from '@supabase/supabase-js';
import { StorageService } from '../services/storageService';
import { supabase, createSessionFromUrl } from '../lib/supabase';
import { Toast } from '../lib/toast';
import LoginScreen from '../components/LoginScreen';
import { Palette, Elevation, Type } from '../constants/theme';

SplashScreen.preventAutoHideAsync();

const TAB_LABELS: Record<string, string> = {
  index: 'Accueil',
  calendar: 'Calendrier',
  entry: 'Journal',
  norms: 'Normes',
  settings: 'Paramètres',
};

/** Dock de navigation flottant en forme de pilule (design Stitch). */
function FloatingDock({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((route) => route.name in TAB_LABELS);

  return (
    <View pointerEvents="box-none" style={[dockStyles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={dockStyles.dock}>
        {visibleRoutes.map((route) => {
          const index = state.routes.indexOf(route);
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isCenter = route.name === 'entry';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isCenter) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityLabel={TAB_LABELS[route.name]}
                style={({ pressed }) => [
                  dockStyles.center,
                  isFocused && dockStyles.centerFocused,
                  pressed && { transform: [{ scale: 0.94 }] },
                ]}>
                {options.tabBarIcon?.({ color: Palette.obsidian, size: 26, focused: isFocused })}
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityLabel={TAB_LABELS[route.name]}
              style={({ pressed }) => [
                dockStyles.tab,
                isFocused && dockStyles.tabActive,
                pressed && { transform: [{ scale: 0.95 }] },
              ]}>
              {options.tabBarIcon?.({
                color: isFocused ? '#FFFFFF' : Palette.textMuted,
                size: 21,
                focused: isFocused,
              })}
              {isFocused && <Text style={[Type.labelMd, { color: '#FFFFFF' }]}>{TAB_LABELS[route.name]}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const dockStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.96)',
    ...Elevation.floating,
  },
  tab: {
    height: 48,
    minWidth: 48,
    paddingHorizontal: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: Palette.obsidian,
    paddingHorizontal: 16,
    ...Elevation.dark,
  },
  center: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.lime,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.lime,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  centerFocused: {
    borderWidth: 3,
    borderColor: Palette.obsidian,
  },
});

function ErrorToast() {
  const [message, setMessage] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return Toast.subscribe((msg) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setMessage(msg);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setMessage(''));
      }, 3000);
    });
  }, [opacity]);

  if (!message) return null;

  return (
    <Animated.View style={[toastStyles.container, { opacity }]} pointerEvents="none">
      <View style={toastStyles.pill}>
        <Text style={toastStyles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Type.labelMd.fontFamily,
    textAlign: 'center',
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppRoot />
      <ErrorToast />
    </SafeAreaProvider>
  );
}

function AppRoot() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  // undefined = vérification en cours, null = pas de session, Session = connectée
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let splashHidden = false;
    const hideSplash = () => {
      if (!splashHidden) {
        splashHidden = true;
        SplashScreen.hideAsync();
      }
    };

    // Sur natif, on retarde l'affichage du login tant qu'on n'a pas vérifié
    // s'il y a un deep link OAuth en attente (évite un flash de l'écran de login)
    let awaitingDeepLinkCheck = Platform.OS !== 'web';

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (newSession) {
        setSession(newSession);
        hideSplash();
      } else if (!awaitingDeepLinkCheck) {
        setSession(null);
        hideSplash();
      }

      if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        try {
          const { synced } = await StorageService.syncFromCloud(newSession.user.id);
          if (synced > 0) console.log(`[Sync] ${synced} entrée(s) restaurée(s) depuis le cloud`);
        } catch {
          Toast.error('Connexion internet requise pour récupérer vos données');
        }
      }
    });

    const timeout = setTimeout(() => {
      setSession((prev) => (prev === undefined ? null : prev));
      hideSplash();
    }, 5000);

    if (Platform.OS !== 'web') {
      const isAuthCallback = (url: string): boolean => {
        const { path } = Linking.parse(url);
        return (path || '').replace(/\/$/, '') === 'auth/callback';
      };

      const handleDeepLink = async (url: string) => {
        if (!isAuthCallback(url)) return;
        try {
          await createSessionFromUrl(url);
        } catch (e) {
          console.error('Deep link auth error:', e);
        }
      };

      Linking.getInitialURL().then(async (url) => {
        if (url && isAuthCallback(url)) {
          await handleDeepLink(url);
        }
        awaitingDeepLinkCheck = false;
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setSession(null);
          hideSplash();
        }
      });

      const linkSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
        linkSub.remove();
      };
    }

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Vérification de session en cours — le splash screen couvre ce moment
  if (session === undefined || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Palette.obsidian} />
      </View>
    );
  }

  // Pas de session → écran de login
  if (!session) {
    return <LoginScreen />;
  }

  return (
    <Tabs
      tabBar={(props) => <FloatingDock {...props} />}
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Palette.canvas },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <House size={size || 21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendrier',
          tabBarIcon: ({ color, size }) => <CalendarDays size={size || 21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="entry"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => <Plus size={size || 26} color={color} strokeWidth={2.6} />,
        }}
      />
      <Tabs.Screen
        name="norms"
        options={{
          title: 'Normes',
          tabBarIcon: ({ color, size }) => <FlaskConical size={size || 21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarIcon: ({ color, size }) => <Settings size={size || 21} color={color} />,
        }}
      />
      {/* Route cachée : détail d'une analyse, ouverte depuis Normes */}
      <Tabs.Screen
        name="marker/[id]"
        options={{ href: null, headerShown: false }}
      />
      {/* Route cachée : pas d'onglet, juste une page de callback OAuth */}
      <Tabs.Screen
        name="auth/callback"
        options={{ href: null, headerShown: false }}
      />
      {/* Route cachée : ancienne page export, remplacée par Paramètres */}
      <Tabs.Screen
        name="export"
        options={{ href: null, headerShown: false }}
      />
    </Tabs>
  );
}
