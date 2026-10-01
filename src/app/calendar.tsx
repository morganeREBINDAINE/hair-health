import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Scissors,
  Pill,
  Droplet,
  Sparkles,
  Zap,
  Activity,
  Calendar as CalendarIcon,
  ChevronRight,
  Filter,
  CheckCircle2,
  Plus,
  Moon,
} from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { StorageService } from '../services/storageService';
import { DailyLog, FatigueLevel, LabTest } from '../types';

// Configuration locale en français pour react-native-calendars
LocaleConfig.locales['fr'] = {
  monthNames: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ],
  monthNamesShort: ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

interface FilterState {
  showMeds: boolean;
  showHaircut: boolean;
  showWash: boolean;
  showHenna: boolean;
  showStress: boolean;
  showBloodTest: boolean;
  showSleep: boolean;
}

export default function CalendarScreen() {
  const router = useRouter();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [labTests, setLabTests] = useState<LabTest[]>([]);

  // Filtres d'affichage des icônes
  const [filters, setFilters] = useState<FilterState>({
    showMeds: true,
    showHaircut: true,
    showWash: true,
    showHenna: true,
    showStress: true,
    showBloodTest: true,
    showSleep: true,
  });

  const colors = Colors.light;

  const loadData = useCallback(async () => {
    try {
      const allLogs = await StorageService.getAllDailyLogs();
      const tests = await StorageService.getLabTests();
      setLogs(allLogs || {});
      setLabTests(tests || []);
    } catch (e) {
      console.error('Erreur chargement calendrier:', e);
    }
  }, []);

  // Recharger dès que l'écran reprend le focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Construction des pastilles d'événements pour chaque date
  const bloodTestDates = new Set(labTests.map((t) => t.date));
  const allDates = new Set([...Object.keys(logs), ...bloodTestDates]);

  const markedDates: Record<string, { dots: { key: string; color: string }[] }> = {};

  allDates.forEach((date) => {
    const log = logs[date];
    const hasBlood = bloodTestDates.has(date);
    const dots: { key: string; color: string }[] = [];

    // 1. Prise de sang (Rouge vif)
    if (filters.showBloodTest && hasBlood) {
      dots.push({ key: 'blood', color: '#DC2626' });
    }
    // 2. Henné (Ambre / Caramel)
    if (filters.showHenna && log?.hennaDone) {
      dots.push({ key: 'henna', color: '#D97706' });
    }
    // 3. Shampoing (Cyan)
    if (filters.showWash && log?.hairWashDone) {
      dots.push({ key: 'wash', color: '#06B6D4' });
    }
    // 4. Stress / Disputé / Boule gorge (Corail)
    if (filters.showStress && (log?.conflictWithHusband || log?.lumpInThroat || (log?.anxietyScore !== null && log?.anxietyScore !== undefined && log.anxietyScore >= 5))) {
      dots.push({ key: 'stress', color: '#F43F5E' });
    }
    // 5. Compléments pris (Émeraude)
    if (filters.showMeds && log?.medications?.some((m) => m.taken)) {
      dots.push({ key: 'meds', color: '#10B981' });
    }
    // 6. Coupe de cheveux (Violet)
    if (filters.showHaircut && log?.haircutDone) {
      dots.push({ key: 'haircut', color: '#8B5CF6' });
    }
    // 7. Fatigue importante/modérée (Indigo)
    if (filters.showSleep && (log?.fatigueLevel === 'importante' || log?.fatigueLevel === 'modérée')) {
      dots.push({ key: 'sleep', color: '#6366F1' });
    }

    if (dots.length > 0) {
      markedDates[date] = { dots };
    }
  });

  const selectedLog = logs[selectedDate];
  const selectedBloodTest = labTests.find((t) => t.date === selectedDate);

  const toggleFilter = (key: keyof FilterState) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Barre de Filtres */}
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Filter size={16} color={colors.textSecondary} />
            <Text style={styles.filterTitle}>Filtres d'affichage sur le calendrier :</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
            <TouchableOpacity
              onPress={() => toggleFilter('showMeds')}
              style={[styles.filterChip, filters.showMeds && { backgroundColor: colors.medsLight, borderColor: colors.meds }]}>
              <Pill size={14} color={filters.showMeds ? colors.meds : colors.textMuted} />
              <Text style={[styles.filterText, filters.showMeds && { color: colors.meds, fontWeight: '700' }]}>
                Médicaments
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleFilter('showHaircut')}
              style={[styles.filterChip, filters.showHaircut && { backgroundColor: colors.hairLight, borderColor: colors.hair }]}>
              <Scissors size={14} color={filters.showHaircut ? colors.hair : colors.textMuted} />
              <Text style={[styles.filterText, filters.showHaircut && { color: colors.hair, fontWeight: '700' }]}>
                Coupe
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleFilter('showWash')}
              style={[styles.filterChip, filters.showWash && { backgroundColor: colors.washLight, borderColor: colors.wash }]}>
              <Droplet size={14} color={filters.showWash ? colors.wash : colors.textMuted} />
              <Text style={[styles.filterText, filters.showWash && { color: colors.wash, fontWeight: '700' }]}>
                Shampoing
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleFilter('showHenna')}
              style={[styles.filterChip, filters.showHenna && { backgroundColor: colors.hennaLight, borderColor: colors.henna }]}>
              <Sparkles size={14} color={filters.showHenna ? colors.henna : colors.textMuted} />
              <Text style={[styles.filterText, filters.showHenna && { color: colors.henna, fontWeight: '700' }]}>
                Henné
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleFilter('showStress')}
              style={[styles.filterChip, filters.showStress && { backgroundColor: colors.conflictLight, borderColor: colors.danger }]}>
              <Zap size={14} color={filters.showStress ? colors.danger : colors.textMuted} />
              <Text style={[styles.filterText, filters.showStress && { color: colors.danger, fontWeight: '700' }]}>
                Stress/Dispute
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleFilter('showBloodTest')}
              style={[styles.filterChip, filters.showBloodTest && { backgroundColor: colors.bloodLight, borderColor: colors.blood }]}>
              <Activity size={14} color={filters.showBloodTest ? colors.blood : colors.textMuted} />
              <Text style={[styles.filterText, filters.showBloodTest && { color: colors.blood, fontWeight: '700' }]}>
                Prise de sang
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleFilter('showSleep')}
              style={[styles.filterChip, filters.showSleep && { backgroundColor: colors.sleepLight, borderColor: colors.sleep }]}>
              <Moon size={14} color={filters.showSleep ? colors.sleep : colors.textMuted} />
              <Text style={[styles.filterText, filters.showSleep && { color: colors.sleep, fontWeight: '700' }]}>
                Fatigue
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Composant Calendrier */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            dayComponent={({ date, state }: any) => {
              if (!date) return null;
              const isSelected = date.dateString === selectedDate;
              const isToday = date.dateString === todayStr;
              const isDiffMonth = state === 'disabled';
              const dayMarking = markedDates[date.dateString];
              const dots = dayMarking?.dots || [];

              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSelectedDate(date.dateString)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}>
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && !isSelected && styles.dayTextToday,
                      isDiffMonth && styles.dayTextDisabled,
                    ]}>
                    {date.day}
                  </Text>
                  <View style={styles.dotsRow}>
                    {dots.slice(0, 5).map((dot, idx) => (
                      <View
                        key={`${dot.key}-${idx}`}
                        style={[styles.dotIndicator, { backgroundColor: dot.color }]}
                      />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            }}
            theme={{
              backgroundColor: '#FFFFFF',
              calendarBackground: '#FFFFFF',
              textSectionTitleColor: '#94A3B8',
              arrowColor: '#17191C',
              monthTextColor: '#17191C',
              textMonthFontWeight: '800',
              textMonthFontSize: 17,
            }}
          />
        </View>

        {/* Légende visuelle des pastilles */}
        <View style={styles.legendCard}>
          <Text style={styles.legendHeader}>Légende des couleurs</Text>
          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendLabel}>Prise de sang</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
              <Text style={styles.legendLabel}>Henné</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#06B6D4' }]} />
              <Text style={styles.legendLabel}>Shampoing</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F43F5E' }]} />
              <Text style={styles.legendLabel}>Stress / Gorge</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendLabel}>Compléments</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={styles.legendLabel}>Coupe</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
              <Text style={styles.legendLabel}>Fatigue</Text>
            </View>
          </View>
        </View>

        {/* Détail de la journée sélectionnée */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleRow}>
              <CalendarIcon size={18} color="#17191C" />
              <Text style={styles.detailTitle}>Journée du {selectedDate}</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/entry')}>
              <Text style={styles.editButtonText}>Ouvrir Saisie</Text>
              <ChevronRight size={14} color="#17191C" />
            </TouchableOpacity>
          </View>

          {!selectedLog && !selectedBloodTest ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune donnée enregistrée pour cette date.</Text>
              <TouchableOpacity
                style={styles.quickAddDayBtn}
                onPress={() => router.push('/entry')}>
                <Plus size={15} color="#FFFFFF" />
                <Text style={styles.quickAddDayBtnText}>Saisir pour ce jour</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.summaryList}>
              {/* Sommeil */}
              {selectedLog?.sleepHours !== null && selectedLog?.sleepHours !== undefined && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Sommeil :</Text>
                  <View style={[styles.badgePill, { backgroundColor: '#EEF2FF' }]}>
                    <Text style={[styles.summaryValue, { color: '#6366F1', fontWeight: '700' }]}>
                      🌙 {selectedLog.sleepHours}h
                    </Text>
                  </View>
                </View>
              )}

              {/* Fatigue */}
              {selectedLog?.fatigueLevel && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Fatigue au réveil :</Text>
                  <View style={[styles.badgePill, {
                    backgroundColor: selectedLog.fatigueLevel === 'importante' ? '#FEF2F2'
                      : selectedLog.fatigueLevel === 'modérée' ? '#FFF7ED'
                      : selectedLog.fatigueLevel === 'légère' ? '#FFFBEB'
                      : '#ECFDF5',
                  }]}>
                    <Text style={[styles.summaryValue, {
                      color: selectedLog.fatigueLevel === 'importante' ? '#DC2626'
                        : selectedLog.fatigueLevel === 'modérée' ? '#EA580C'
                        : selectedLog.fatigueLevel === 'légère' ? '#D97706'
                        : '#059669',
                      fontWeight: '700',
                      textTransform: 'capitalize',
                    }]}>
                      {selectedLog.fatigueLevel}
                    </Text>
                  </View>
                </View>
              )}

              {/* Chute de cheveux */}
              {selectedLog?.hairLossAmount !== null && selectedLog?.hairLossAmount !== undefined && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Perte de cheveux :</Text>
                  <View style={styles.badgePill}>
                    <Text style={[styles.summaryValue, { color: '#7C3AED', fontWeight: '700' }]}>
                      ~{selectedLog.hairLossAmount} cheveux
                    </Text>
                  </View>
                </View>
              )}

              {/* Shampoing */}
              {selectedLog?.hairWashDone && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shampoing fait :</Text>
                  <View style={[styles.badgePill, { backgroundColor: '#ECFEFF' }]}>
                    <Text style={[styles.summaryValue, { color: '#0891B2' }]}>
                      💧 {selectedLog.shampooType ? selectedLog.shampooType.replace('_', ' ') : 'Oui'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Coupe */}
              {selectedLog?.haircutDone && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Coupe effectuée :</Text>
                  <View style={[styles.badgePill, { backgroundColor: '#F5F3FF' }]}>
                    <Text style={[styles.summaryValue, { color: '#7C3AED' }]}>
                      ✂️ {selectedLog.haircutNotes ? selectedLog.haircutNotes : 'Oui'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Henné */}
              {selectedLog?.hennaDone && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Soin Henné :</Text>
                  <View style={[styles.badgePill, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.summaryValue, { color: '#B45309', fontWeight: '600' }]}>🌿 Oui</Text>
                  </View>
                </View>
              )}

              {/* Stress / Dispute */}
              {selectedLog?.anxietyScore !== null && selectedLog?.anxietyScore !== undefined && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Anxiété :</Text>
                  <View style={[styles.badgePill, { backgroundColor: selectedLog.anxietyScore >= 6 ? '#FEE2E2' : '#FFF7ED' }]}>
                    <Text style={[styles.summaryValue, { color: selectedLog.anxietyScore >= 6 ? '#DC2626' : '#EA580C', fontWeight: '700' }]}>
                      ⚡ {selectedLog.anxietyScore} / 10
                    </Text>
                  </View>
                </View>
              )}

              {selectedLog?.lumpInThroat && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Boule dans la gorge :</Text>
                  <View style={[styles.badgePill, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.summaryValue, { color: '#DC2626', fontWeight: '600' }]}>Présente</Text>
                  </View>
                </View>
              )}

              {selectedLog?.conflictWithHusband && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Dispute de couple :</Text>
                  <View style={[styles.badgePill, { backgroundColor: '#FFE4E6' }]}>
                    <Text style={[styles.summaryValue, { color: '#E11D48', fontWeight: '700' }]}>Oui</Text>
                  </View>
                </View>
              )}

              {/* Compléments pris */}
              {selectedLog?.medications && selectedLog.medications.some((m) => m.taken) && (
                <View style={styles.medsSummaryBox}>
                  <Text style={styles.medsSummaryTitle}>Compléments pris ce jour :</Text>
                  <View style={styles.medsChips}>
                    {selectedLog.medications
                      .filter((m) => m.taken)
                      .map((m) => (
                        <View key={m.name} style={styles.medChip}>
                          <Text style={styles.medChipText}>
                            ✓ {m.name} {m.dosage ? `(${m.dosage})` : ''}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}

              {/* Bilan sanguin */}
              {selectedBloodTest && (
                <View style={styles.bloodTestBox}>
                  <Text style={styles.bloodTestBoxTitle}>🩸 Prise de sang enregistrée ce jour</Text>
                  {selectedBloodTest.notes ? (
                    <Text style={styles.bloodTestNotes}>{selectedBloodTest.notes}</Text>
                  ) : null}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E4E8DB',
  },
  scrollContent: {
    paddingBottom: 50,
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DDE4D8',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A9080',
  },
  filterBar: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#EDF1E8',
    borderWidth: 1.5,
    borderColor: '#DDE4D8',
  },
  filterText: {
    fontSize: 12,
    color: '#8A9080',
    fontWeight: '600',
  },
  calendarContainer: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 12,
    shadowColor: '#1A2E14',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dayCell: {
    width: 38,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 3,
  },
  dayCellSelected: {
    backgroundColor: '#1A1C1F',
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: '#A8D86A',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1C1F',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayTextToday: {
    color: '#5A8B2A',
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: '#C8D4BE',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 8,
    marginTop: 3,
    gap: 2,
  },
  dotIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#1A2E14',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  legendHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A9080',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: '28%',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  detailCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#1A2E14',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4EB',
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1C1F',
    letterSpacing: -0.2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EDF1E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  editButtonText: {
    fontSize: 12,
    color: '#1A1C1F',
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#9BA89C',
    fontStyle: 'italic',
  },
  quickAddDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1C1F',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  quickAddDayBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryList: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#637064',
    fontWeight: '500',
  },
  badgePill: {
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F5F3FF',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  medsSummaryBox: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F4EB',
  },
  medsSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  medsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  medChip: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  medChipText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '700',
  },
  bloodTestBox: {
    marginTop: 8,
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  bloodTestBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
  },
  bloodTestNotes: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 4,
  },
});
