import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import {
  Sparkles,
  Zap,
  Activity,
  PlusCircle,
  AlertTriangle,
  HeartCrack,
  CheckCircle2,
  Calendar,
  ChevronRight,
  TrendingDown,
  Info,
} from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { StorageService } from '../services/storageService';
import { DailyLog, LabMarkerDefinition, LabTest } from '../types';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [markers, setMarkers] = useState<LabMarkerDefinition[]>([]);
  const [selectedThyroidMarker, setSelectedThyroidMarker] = useState<'tsh' | 't4'>('tsh');

  const colors = Colors.light;

  const loadData = useCallback(async () => {
    try {
      const all = await StorageService.getAllDailyLogs();
      const sorted = Object.values(all).sort((a, b) => a.date.localeCompare(b.date));
      setLogs(sorted);

      const tests = await StorageService.getLabTests();
      setLabTests(tests);

      const markerDefs = await StorageService.getLabMarkers();
      setMarkers(markerDefs);
    } catch (e) {
      console.error('Erreur chargement dashboard:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // 1. Calcul de la perte moyenne des 7 DERNIERS JOURS
  const now = new Date();
  const d7 = new Date();
  d7.setDate(now.getDate() - 7);
  const d7Str = d7.toISOString().slice(0, 10);

  const last7DaysLogs = logs.filter(
    (l) => l.date >= d7Str && l.hairLossAmount !== null && l.hairLossAmount !== undefined
  );
  const avgHairLoss7d =
    last7DaysLogs.length > 0
      ? Math.round(
          last7DaysLogs.reduce((acc, l) => acc + (l.hairLossAmount || 0), 0) /
            last7DaysLogs.length
        )
      : null;

  // 2. Moyenne anxiété des 7 derniers jours
  const anxietyLogs7d = logs.filter(
    (l) => l.date >= d7Str && l.anxietyScore !== null && l.anxietyScore !== undefined
  );
  const avgAnxiety7d =
    anxietyLogs7d.length > 0
      ? (
          anxietyLogs7d.reduce((acc, l) => acc + (l.anxietyScore || 0), 0) /
          anxietyLogs7d.length
        ).toFixed(1)
      : null;

  // 3. Indicateurs de stress récents (14 derniers jours)
  const recentLogs14d = logs.slice(-14);
  const conflictDaysCount = recentLogs14d.filter((l) => l.conflictWithHusband).length;
  const throatLumpCount = recentLogs14d.filter((l) => l.lumpInThroat).length;

  // 4. Données graphiques Chute de cheveux (10 derniers jours enregistrés)
  const hairChartData = recentLogs14d
    .filter((l) => l.hairLossAmount !== null && l.hairLossAmount !== undefined)
    .slice(-8)
    .map((l) => ({
      value: l.hairLossAmount as number,
      label: l.date.slice(5), // MM-DD
      frontColor: (l.hairLossAmount as number) > 80 ? '#F43F5E' : '#7C3AED',
    }));

  // 5. Extraction des résultats Thyroïde (TSH et T4) par date
  const sortedLabTests = [...labTests].sort((a, b) => a.date.localeCompare(b.date));

  const tshPoints: { value: number; label: string; date: string }[] = [];
  const t4Points: { value: number; label: string; date: string }[] = [];

  sortedLabTests.forEach((t) => {
    const label = t.date.slice(5); // MM-DD
    for (const [key, val] of Object.entries(t.values)) {
      const lower = key.toLowerCase();
      if (lower === 'marker-tsh' || lower === 'tsh') {
        tshPoints.push({ value: val, label, date: t.date });
      }
      if (lower === 'marker-t4' || lower === 't4' || lower.includes('t4')) {
        t4Points.push({ value: val, label, date: t.date });
      }
    }
  });

  const latestTsh = tshPoints.length > 0 ? tshPoints[tshPoints.length - 1] : null;
  const latestT4 = t4Points.length > 0 ? t4Points[t4Points.length - 1] : null;

  // Normes fonctionnelles capillaires
  const TSH_MIN = 1.0;
  const TSH_MAX = 2.0;
  const T4_MIN = 1.1;
  const T4_MAX = 1.6;

  const isTshOptimal = latestTsh ? latestTsh.value >= TSH_MIN && latestTsh.value <= TSH_MAX : null;
  const isT4Optimal = latestT4 ? latestT4.value >= T4_MIN && latestT4.value <= T4_MAX : null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isTodayLogged = logs.some((l) => l.date === todayStr);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Entête avec style santé moderne */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerGreeting}>Bonjour,</Text>
            <Text style={styles.headerTitle}>Santé & Suivi Capillaire</Text>
          </View>
          <TouchableOpacity
            style={styles.headerEntryBtn}
            onPress={() => router.push('/entry')}>
            <PlusCircle size={22} color="#17191C" />
          </TouchableOpacity>
        </View>

        {/* Bannière d'appel si la journée n'est pas encore enregistrée */}
        {!isTodayLogged && (
          <TouchableOpacity
            style={styles.todayBanner}
            onPress={() => router.push('/entry')}>
            <View style={styles.todayBannerLeft}>
              <View style={styles.todayBannerIcon}>
                <Calendar size={18} color="#17191C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.todayBannerTitle}>Journée non enregistrée</Text>
                <Text style={styles.todayBannerSub}>
                  Notez vos chutes, anxiété et compléments d'aujourd'hui.
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#17191C" />
          </TouchableOpacity>
        )}

        {/* GRILLE KPI HÉROS (Style de la maquette avec Carte Sombre + Carte Blanche) */}
        <View style={styles.heroGrid}>
          {/* CARTE 1 : HERO SOMBRE (Perte moyenne des 7 derniers jours) */}
          <View style={styles.darkHeroCard}>
            <View style={styles.darkHeroTop}>
              <View style={styles.darkHeroTitleGroup}>
                <Sparkles size={16} color="#B8F255" />
                <Text style={styles.darkHeroLabel}>Perte 7 derniers jours</Text>
              </View>
              <View style={styles.limePillBadge}>
                <Text style={styles.limePillBadgeText}>
                  {avgHairLoss7d !== null && avgHairLoss7d <= 50 ? 'Idéal' : 'Suivi'}
                </Text>
              </View>
            </View>

            <View style={styles.darkHeroValueGroup}>
              <Text style={styles.darkHeroValue}>
                {avgHairLoss7d !== null ? `~${avgHairLoss7d}` : '–'}
              </Text>
              <Text style={styles.darkHeroUnit}>cheveux / jour</Text>
            </View>
            <Text style={styles.darkHeroFooter}>
              {last7DaysLogs.length > 0
                ? `Calculé sur ${last7DaysLogs.length} jour(s) noté(s)`
                : 'Aucune perte notée sur 7j'}
            </Text>
          </View>

          {/* CARTE 2 : CARTE BLANCHE (Anxiété moyenne) */}
          <View style={styles.lightHeroCard}>
            <View style={styles.lightHeroTop}>
              <View style={styles.lightHeroTitleGroup}>
                <Zap size={16} color="#EA580C" />
                <Text style={styles.lightHeroLabel}>Anxiété moy.</Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor:
                      avgAnxiety7d !== null && parseFloat(avgAnxiety7d) >= 6
                        ? '#FEE2E2'
                        : '#E9F7DC',
                  },
                ]}>
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color:
                        avgAnxiety7d !== null && parseFloat(avgAnxiety7d) >= 6
                          ? '#DC2626'
                          : '#2B6612',
                    },
                  ]}>
                  {avgAnxiety7d !== null && parseFloat(avgAnxiety7d) <= 3
                    ? 'Calme'
                    : avgAnxiety7d !== null && parseFloat(avgAnxiety7d) <= 6
                    ? 'Modéré'
                    : avgAnxiety7d !== null
                    ? 'Élevé'
                    : '–'}
                </Text>
              </View>
            </View>

            <View style={styles.lightHeroValueGroup}>
              <Text style={styles.lightHeroValue}>
                {avgAnxiety7d !== null ? avgAnxiety7d : '–'}
              </Text>
              <Text style={styles.lightHeroUnit}>/ 10</Text>
            </View>
            <Text style={styles.lightHeroFooter}>Moyenne sur 7 jours</Text>
          </View>
        </View>

        {/* Alerte Symptômes & Disputes récentes */}
        {(conflictDaysCount > 0 || throatLumpCount > 0) && (
          <View style={styles.stressAlertBox}>
            <Text style={styles.stressAlertTitle}>Indicateurs de stress récents (14 jours) :</Text>
            <View style={styles.stressBadgeRow}>
              {conflictDaysCount > 0 && (
                <View style={styles.stressTag}>
                  <HeartCrack size={14} color="#BE123C" />
                  <Text style={styles.stressTagText}>
                    {conflictDaysCount} dispute{conflictDaysCount > 1 ? 's' : ''} de couple
                  </Text>
                </View>
              )}
              {throatLumpCount > 0 && (
                <View style={[styles.stressTag, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                  <AlertTriangle size={14} color="#C2410C" />
                  <Text style={[styles.stressTagText, { color: '#9A3412' }]}>
                    {throatLumpCount} j avec boule dans la gorge
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* GRAPHIQUE 1 : Évolution de la chute de cheveux */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleGroup}>
              <Sparkles size={18} color="#7C3AED" />
              <Text style={styles.chartTitle}>Évolution de la Perte de Cheveux</Text>
            </View>
            <View style={styles.chartTag}>
              <Text style={styles.chartTagText}>Dernières saisies</Text>
            </View>
          </View>
          <Text style={styles.chartSub}>Nombre estimé de cheveux tombés par jour</Text>

          {hairChartData.length > 1 ? (
            <View style={styles.chartWrapper}>
              <BarChart
                data={hairChartData}
                barWidth={20}
                spacing={16}
                roundedTop
                yAxisTextStyle={{ color: '#9BA89C', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#637064', fontSize: 10, fontWeight: '600' }}
                height={160}
                width={screenWidth - 80}
              />
            </View>
          ) : (
            <View style={styles.noDataBox}>
              <Text style={styles.noDataText}>
                Renseignez au moins 2 estimations de chute dans la saisie journalière pour afficher le graphique.
              </Text>
            </View>
          )}
        </View>

        {/* NOUVEAU GRAPHIQUE : ÉVOLUTION THYROÏDE (TSH & T4) AVEC VALEURS FONCTIONNELLES CAPILLAIRES */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleGroup}>
              <Activity size={18} color="#059669" />
              <Text style={styles.chartTitle}>Évolution Thyroïde (TSH & T4)</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/norms')}
              style={styles.normsLinkBtn}>
              <Text style={styles.normsLinkBtnText}>Bilans</Text>
              <ChevronRight size={13} color="#059669" />
            </TouchableOpacity>
          </View>
          <Text style={styles.chartSub}>
            Suivi mensuel de vos hormones thyroïdiennes et comparaison aux normes fonctionnelles idéales pour les cheveux.
          </Text>

          {/* Bandeau repères fonctionnels cheveux */}
          <View style={styles.thyroidNormsBanner}>
            <View style={styles.thyroidNormItem}>
              <Text style={styles.thyroidNormLabel}>Cible idéale TSH :</Text>
              <Text style={styles.thyroidNormRange}>1.0 – 2.0 mUI/L</Text>
            </View>
            <View style={styles.thyroidNormDivider} />
            <View style={styles.thyroidNormItem}>
              <Text style={styles.thyroidNormLabel}>Cible idéale T4 Libre :</Text>
              <Text style={styles.thyroidNormRange}>1.1 – 1.6 ng/dL</Text>
            </View>
          </View>

          {/* Sélecteur d'affichage TSH ou T4 */}
          <View style={styles.thyroidToggleRow}>
            <TouchableOpacity
              onPress={() => setSelectedThyroidMarker('tsh')}
              style={[
                styles.thyroidToggleBtn,
                selectedThyroidMarker === 'tsh' && styles.thyroidToggleBtnActive,
              ]}>
              <Text
                style={[
                  styles.thyroidToggleBtnText,
                  selectedThyroidMarker === 'tsh' && styles.thyroidToggleBtnTextActive,
                ]}>
                TSH (mUI/L) {latestTsh ? `• Dernier: ${latestTsh.value}` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedThyroidMarker('t4')}
              style={[
                styles.thyroidToggleBtn,
                selectedThyroidMarker === 't4' && styles.thyroidToggleBtnActive,
              ]}>
              <Text
                style={[
                  styles.thyroidToggleBtnText,
                  selectedThyroidMarker === 't4' && styles.thyroidToggleBtnTextActive,
                ]}>
                T4 Libre (ng/dL) {latestT4 ? `• Dernier: ${latestT4.value}` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Statut du dernier résultat pour la repousse */}
          {selectedThyroidMarker === 'tsh' && latestTsh && (
            <View
              style={[
                styles.thyroidStatusBox,
                { backgroundColor: isTshOptimal ? '#ECFDF5' : '#FEF2F2' },
              ]}>
              <CheckCircle2
                size={16}
                color={isTshOptimal ? '#059669' : '#DC2626'}
              />
              <Text
                style={[
                  styles.thyroidStatusText,
                  { color: isTshOptimal ? '#065F46' : '#991B1B' },
                ]}>
                {isTshOptimal
                  ? `TSH à ${latestTsh.value} mUI/L : dans la zone optimale pour stimuler le bulbe capillaire !`
                  : `TSH à ${latestTsh.value} mUI/L : hors zone idéale cheveux (cible : 1.0 – 2.0 mUI/L).`}
              </Text>
            </View>
          )}

          {selectedThyroidMarker === 't4' && latestT4 && (
            <View
              style={[
                styles.thyroidStatusBox,
                { backgroundColor: isT4Optimal ? '#ECFDF5' : '#FEF2F2' },
              ]}>
              <CheckCircle2
                size={16}
                color={isT4Optimal ? '#059669' : '#DC2626'}
              />
              <Text
                style={[
                  styles.thyroidStatusText,
                  { color: isT4Optimal ? '#065F46' : '#991B1B' },
                ]}>
                {isT4Optimal
                  ? `T4 Libre à ${latestT4.value} ng/dL : dans la zone idéale pour l'énergie cellulaire capillaire.`
                  : `T4 Libre à ${latestT4.value} ng/dL : hors zone fonctionnelle cheveux (cible : 1.1 – 1.6 ng/dL).`}
              </Text>
            </View>
          )}

          {/* Rendu du Graphique Thyroïde */}
          {selectedThyroidMarker === 'tsh' ? (
            tshPoints.length > 0 ? (
              <View style={styles.chartWrapper}>
                <LineChart
                  data={tshPoints}
                  color="#059669"
                  thickness={3}
                  dataPointsColor="#059669"
                  dataPointsRadius={5}
                  textColor="#17191C"
                  textFontSize={11}
                  showReferenceLine1
                  referenceLine1Position={TSH_MIN}
                  referenceLine1Config={{
                    color: '#10B981',
                    dashWidth: 4,
                    dashGap: 4,
                  }}
                  showReferenceLine2
                  referenceLine2Position={TSH_MAX}
                  referenceLine2Config={{
                    color: '#10B981',
                    dashWidth: 4,
                    dashGap: 4,
                  }}
                  yAxisTextStyle={{ color: '#9BA89C', fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: '#637064', fontSize: 10, fontWeight: '600' }}
                  height={170}
                  width={screenWidth - 85}
                  maxValue={4}
                  noOfSections={4}
                />
                <Text style={styles.chartLegendHint}>
                  --- Lignes pointillées vertes : Zone fonctionnelle idéale cheveux (1.0 – 2.0 mUI/L)
                </Text>
              </View>
            ) : (
              <View style={styles.noDataBox}>
                <Text style={styles.noDataText}>
                  Aucun résultat TSH trouvé dans vos bilans sanguins.
                </Text>
                <TouchableOpacity
                  style={styles.addThyroidBtn}
                  onPress={() => router.push('/norms')}>
                  <Text style={styles.addThyroidBtnText}>Saisir une prise de sang avec TSH</Text>
                </TouchableOpacity>
              </View>
            )
          ) : t4Points.length > 0 ? (
            <View style={styles.chartWrapper}>
              <LineChart
                data={t4Points}
                color="#0284C7"
                thickness={3}
                dataPointsColor="#0284C7"
                dataPointsRadius={5}
                textColor="#17191C"
                textFontSize={11}
                showReferenceLine1
                referenceLine1Position={T4_MIN}
                referenceLine1Config={{
                  color: '#0284C7',
                  dashWidth: 4,
                  dashGap: 4,
                }}
                showReferenceLine2
                referenceLine2Position={T4_MAX}
                referenceLine2Config={{
                  color: '#0284C7',
                  dashWidth: 4,
                  dashGap: 4,
                }}
                yAxisTextStyle={{ color: '#9BA89C', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#637064', fontSize: 10, fontWeight: '600' }}
                height={170}
                width={screenWidth - 85}
                maxValue={3}
                noOfSections={3}
              />
              <Text style={styles.chartLegendHint}>
                --- Lignes pointillées bleues : Zone fonctionnelle idéale cheveux (1.1 – 1.6 ng/dL)
              </Text>
            </View>
          ) : (
            <View style={styles.noDataBox}>
              <Text style={styles.noDataText}>
                Aucun résultat T4 trouvé dans vos bilans sanguins.
              </Text>
              <TouchableOpacity
                style={styles.addThyroidBtn}
                onPress={() => router.push('/norms')}>
                <Text style={styles.addThyroidBtnText}>Saisir une prise de sang avec T4</Text>
              </TouchableOpacity>
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
    padding: 16,
    paddingBottom: 50,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerGreeting: {
    fontSize: 13,
    color: '#637064',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#17191C',
    letterSpacing: -0.3,
  },
  headerEntryBtn: {
    padding: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EFE5',
  },
  todayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1A2E14',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  todayBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  todayBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EAF7D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBannerTitle: {
    color: '#17191C',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  todayBannerSub: {
    color: '#637064',
    fontSize: 11,
  },
  heroGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  darkHeroCard: {
    flex: 1.2,
    backgroundColor: '#1A1C1F',
    borderRadius: 28,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  darkHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  darkHeroTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  darkHeroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D1D5DB',
  },
  limePillBadge: {
    backgroundColor: '#B8F255',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  limePillBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1A3805',
  },
  darkHeroValueGroup: {
    marginTop: 4,
    marginBottom: 4,
  },
  darkHeroValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  darkHeroUnit: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '500',
  },
  darkHeroFooter: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  lightHeroCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    shadowColor: '#1A2E14',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  lightHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  lightHeroTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lightHeroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#637064',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  lightHeroValueGroup: {
    marginTop: 4,
    marginBottom: 4,
  },
  lightHeroValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#17191C',
  },
  lightHeroUnit: {
    fontSize: 12,
    color: '#9BA89C',
    fontWeight: '500',
  },
  lightHeroFooter: {
    fontSize: 10,
    color: '#9BA89C',
    marginTop: 8,
  },
  stressAlertBox: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 24,
    padding: 14,
    marginBottom: 16,
  },
  stressAlertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9F1239',
    marginBottom: 8,
  },
  stressBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stressTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFE4E6',
    borderWidth: 1,
    borderColor: '#FDA4AF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  stressTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#BE123C',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#1A2E14',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chartTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#17191C',
  },
  chartTag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  chartTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },
  chartSub: {
    fontSize: 12,
    color: '#637064',
    marginBottom: 12,
    lineHeight: 16,
  },
  chartWrapper: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  chartLegendHint: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  noDataBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 12,
    color: '#9BA89C',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  normsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  normsLinkBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  thyroidNormsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  thyroidNormItem: {
    alignItems: 'center',
  },
  thyroidNormLabel: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  thyroidNormRange: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 2,
  },
  thyroidNormDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#BBF7D0',
  },
  thyroidToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  thyroidToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#E4E8DB',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EFE5',
  },
  thyroidToggleBtnActive: {
    backgroundColor: '#17191C',
    borderColor: '#17191C',
  },
  thyroidToggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#637064',
  },
  thyroidToggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  thyroidStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  thyroidStatusText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  addThyroidBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#17191C',
  },
  addThyroidBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
