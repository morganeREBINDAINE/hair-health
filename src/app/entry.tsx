import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import { DailyEntryForm } from '../components/DailyEntryForm';
import { Colors } from '../constants/theme';

export default function EntryScreen() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const colors = Colors.light;

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleSetToday = () => {
    setSelectedDate(todayStr);
  };

  const isToday = selectedDate === todayStr;

  const formatDateHuman = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Générer les 7 jours entourant la date courante (comme sur la maquette "Schedule")
  const getNearbyDays = () => {
    const current = new Date(selectedDate);
    const days: { dateStr: string; dayNum: string; dayName: string; isSelected: boolean }[] = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() + i);
      const str = d.toISOString().slice(0, 10);
      days.push({
        dateStr: str,
        dayNum: String(d.getDate()).padStart(2, '0'),
        dayName: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        isSelected: str === selectedDate,
      });
    }
    return days;
  };

  const nearbyDays = getNearbyDays();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Barre de sélection avec bande de jours style santé */}
      <View style={styles.headerContainer}>
        <View style={styles.dateBar}>
          <TouchableOpacity style={styles.navButton} onPress={handlePrevDay}>
            <ChevronLeft size={20} color="#17191C" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.dateCenter} onPress={handleSetToday}>
            <View style={styles.dateRow}>
              <CalendarIcon size={16} color="#17191C" />
              <Text style={styles.dateText}>{formatDateHuman(selectedDate)}</Text>
            </View>
            {isToday && <Text style={styles.todayBadge}>Aujourd'hui</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={handleNextDay}>
            <ChevronRight size={20} color="#17191C" />
          </TouchableOpacity>
        </View>

        {/* Bande horizontale de jours (Maquette "Schedule") */}
        <View style={styles.dayStrip}>
          {nearbyDays.map((item) => (
            <TouchableOpacity
              key={item.dateStr}
              activeOpacity={0.7}
              onPress={() => setSelectedDate(item.dateStr)}
              style={[
                styles.stripDayItem,
                item.isSelected && styles.stripDayItemSelected,
              ]}>
              <Text
                style={[
                  styles.stripDayName,
                  item.isSelected && styles.stripDayNameSelected,
                ]}>
                {item.dayName}
              </Text>
              <Text
                style={[
                  styles.stripDayNum,
                  item.isSelected && styles.stripDayNumSelected,
                ]}>
                {item.dayNum}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Formulaire de saisie du jour */}
      <DailyEntryForm
        key={selectedDate}
        selectedDate={selectedDate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E4E8DB',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EFE5',
    paddingBottom: 10,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  navButton: {
    padding: 8,
    borderRadius: 14,
    backgroundColor: '#EDF1E8',
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#17191C',
    textTransform: 'capitalize',
  },
  todayBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    marginTop: 2,
  },
  dayStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 6,
  },
  stripDayItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: '#EDF1E8',
    minWidth: 42,
  },
  stripDayItemSelected: {
    backgroundColor: '#1A1C1F',
  },
  stripDayName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9BA89C',
    textTransform: 'capitalize',
  },
  stripDayNameSelected: {
    color: '#A8D86A',
  },
  stripDayNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1C1F',
    marginTop: 2,
  },
  stripDayNumSelected: {
    color: '#FFFFFF',
  },
});
