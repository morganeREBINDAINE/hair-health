import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { LayoutDashboard, Calendar, PlusCircle, Syringe, Download } from 'lucide-react-native';
import { StorageService } from '../services/storageService';

SplashScreen.preventAutoHideAsync();

const TAB_LABELS: Record<string, string> = {
  index: 'Stats',
  calendar: 'Calendrier',
  entry: 'Saisie',
  norms: 'Normes',
  export: 'Export',
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={tabStyles.wrapper}>
      <View style={tabStyles.container}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label = TAB_LABELS[route.name] ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={[tabStyles.tab, isFocused ? tabStyles.tabActive : tabStyles.tabInactive]}>
              {options.tabBarIcon?.({
                color: isFocused ? '#FFFFFF' : '#8A9080',
                size: 20,
                focused: isFocused,
              })}
              {isFocused && <Text style={tabStyles.tabLabel}>{label}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    paddingBottom: Platform.OS === 'ios' ? 26 : 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8EDE5',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    minWidth: 44,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#1A1C1F',
    paddingHorizontal: 18,
  },
  tabInactive: {
    backgroundColor: '#EDF1E8',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});

export default function RootLayout() {
  useEffect(() => {
    StorageService.initializeDefaults().finally(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E8EDE5',
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '800',
          color: '#1A1C1F',
          letterSpacing: -0.3,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tableau de bord',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendrier de Suivi',
          tabBarIcon: ({ color, size }) => <Calendar size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="entry"
        options={{
          title: 'Saisie Journalière',
          tabBarIcon: ({ color, size }) => <PlusCircle size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="norms"
        options={{
          title: 'Normes & Bilans',
          tabBarIcon: ({ color, size }) => <Syringe size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Export & Compte',
          tabBarIcon: ({ color, size }) => <Download size={size || 20} color={color} />,
        }}
      />
      {/* Route cachée : pas d'onglet, juste une page de callback OAuth */}
      <Tabs.Screen
        name="auth/callback"
        options={{ href: null, headerShown: false }}
      />
    </Tabs>
  );
}
