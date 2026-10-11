import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { DailyEntryForm } from '../components/DailyEntryForm';
import { AppText, Badge, Card, IconCircle, ScreenHeader } from '../components/ui';
import { Palette, Radius, Elevation } from '../constants/theme';
import { StorageService } from '../services/storageService';
import { todayIso, shiftIso, dayShort, dayNum, longDay } from '../lib/dates';

export default function EntryScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const todayStr = todayIso();
  const [selectedDate, setSelectedDate] = useState<string>(params.date ?? todayStr);
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());

  // Ouverture depuis le calendrier avec une date précise
  const [lastParamDate, setLastParamDate] = useState(params.date);
  if (params.date !== lastParamDate) {
    setLastParamDate(params.date);
    if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) setSelectedDate(params.date);
  }

  const loadLogged = useCallback(async () => {
    const all = await StorageService.getAllDailyLogs();
    setLoggedDates(new Set(Object.keys(all)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLogged();
    }, [loadLogged])
  );

  // Jours consécutifs saisis jusqu'à aujourd'hui (ou hier si aujourd'hui n'est pas encore noté)
  let streak = 0;
  let cursor = loggedDates.has(todayStr) ? todayStr : shiftIso(todayStr, -1);
  while (loggedDates.has(cursor)) {
    streak++;
    cursor = shiftIso(cursor, -1);
  }

  const isToday = selectedDate === todayStr;
  const strip = Array.from({ length: 7 }).map((_, i) => shiftIso(selectedDate, i - 3));
  const recent = Array.from({ length: 5 }).map((_, i) => shiftIso(todayStr, i - 4));

  const header = (
    <View style={{ gap: 16 }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <AppText variant="headlineLg">Journal du jour</AppText>
          <AppText variant="bodyMd" color={Palette.textMuted}>
            {longDay(selectedDate)} · remplissage doux & guidé
          </AppText>
        </View>
        {isToday ? (
          <Badge label="Aujourd'hui" tone="lime" dot />
        ) : (
          <Pressable onPress={() => setSelectedDate(todayStr)}>
            <Badge label="Revenir à aujourd'hui" />
          </Pressable>
        )}
      </View>

      <View style={styles.strip}>
        <Pressable style={styles.arrow} onPress={() => setSelectedDate(shiftIso(selectedDate, -1))} hitSlop={6}>
          <ChevronLeft size={18} color={Palette.text} />
        </Pressable>
        {strip.map((d) => {
          const active = d === selectedDate;
          return (
            <Pressable
              key={d}
              onPress={() => setSelectedDate(d)}
              style={[styles.stripDay, active && styles.stripDayActive]}>
              <AppText variant="labelSm" color={active ? Palette.lime : Palette.textMuted}>
                {dayShort(d)}
              </AppText>
              <AppText variant="labelMd" color={active ? '#FFFFFF' : Palette.text}>
                {dayNum(d)}
              </AppText>
              <View
                style={[
                  styles.loggedDot,
                  { backgroundColor: loggedDates.has(d) ? (active ? Palette.lime : Palette.primary) : 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
        <Pressable style={styles.arrow} onPress={() => setSelectedDate(shiftIso(selectedDate, 1))} hitSlop={6}>
          <ChevronRight size={18} color={Palette.text} />
        </Pressable>
      </View>

      <Card style={styles.streakCard}>
        <IconCircle icon={CalendarDays} size={40} bg={Palette.limeSoft} color={Palette.primary} />
        <View style={{ flex: 1 }}>
          <AppText variant="labelMd">Continuité</AppText>
          <AppText variant="bodySm" color={Palette.textMuted}>
            {streak > 0 ? `${streak} jour${streak > 1 ? 's' : ''} consécutif${streak > 1 ? 's' : ''} complété${streak > 1 ? 's' : ''}` : 'Commence ta série aujourd’hui'}
          </AppText>
        </View>
        <View style={styles.streakDots}>
          {recent.map((d) => {
            const done = loggedDates.has(d);
            return (
              <View key={d} style={[styles.streakDot, done ? { backgroundColor: Palette.lime } : null]}>
                <AppText variant="labelSm" color={done ? Palette.onLime : Palette.textMuted} style={{ fontSize: 10 }}>
                  {dayShort(d).charAt(0)}
                </AppText>
              </View>
            );
          })}
        </View>
      </Card>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Journal" />
      <DailyEntryForm key={selectedDate} selectedDate={selectedDate} header={header} onSaved={loadLogged} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Palette.card,
    gap: 2,
  },
  stripDayActive: { backgroundColor: Palette.obsidian, ...Elevation.dark },
  loggedDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.lg },
  streakDots: { flexDirection: 'row', gap: 4 },
  streakDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
