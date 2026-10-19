import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  FileSpreadsheet,
  Share2,
  CircleCheck,
  LogOut,
  Sparkles,
  Pill,
  Activity,
  FlaskConical,
  SlidersHorizontal,
  User,
  Droplet,
} from 'lucide-react-native';
import { ExcelService, ExportFilterOptions } from '../services/excelService';
import { supabase } from '../lib/supabase';
import { StorageService } from '../services/storageService';
import { Palette, Spacing, DockClearance, Radius } from '../constants/theme';
import {
  AppText,
  Card,
  Chip,
  PillButton,
  ScreenHeader,
  SectionHeader,
  ToggleRow,
} from '../components/ui';

type DatePreset = '7d' | '30d' | '90d' | 'all';

export default function ExportScreen() {
  const [exporting, setExporting] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');

  // Filtres d'export
  const [includeSymptoms, setIncludeSymptoms] = useState(true);
  const [includeHairCare, setIncludeHairCare] = useState(true);
  const [includeMedications, setIncludeMedications] = useState(true);
  const [includeCycle, setIncludeCycle] = useState(true);
  const [includeLabTests, setIncludeLabTests] = useState(true);
  const [includeLabNorms, setIncludeLabNorms] = useState(true);

  // Utilisateur connecté
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await StorageService.clearCache();
    setUser(null);
    Alert.alert('Déconnexion', 'Vous êtes déconnecté.');
  };

  const handleGenerateExcel = async () => {
    setExporting(true);
    try {
      let startDate: string | undefined = undefined;
      const now = new Date();

      if (datePreset === '7d') {
        const d = new Date();
        d.setDate(now.getDate() - 7);
        startDate = d.toISOString().slice(0, 10);
      } else if (datePreset === '30d') {
        const d = new Date();
        d.setDate(now.getDate() - 30);
        startDate = d.toISOString().slice(0, 10);
      } else if (datePreset === '90d') {
        const d = new Date();
        d.setDate(now.getDate() - 90);
        startDate = d.toISOString().slice(0, 10);
      }

      const options: ExportFilterOptions = {
        startDate,
        endDate: now.toISOString().slice(0, 10),
        includeSymptoms,
        includeHairCare,
        includeMedications,
        includeCycle,
        includeLabTests,
        includeLabNorms,
      };

      const result = await ExcelService.generateAndShareExport(options);
      if (!result.success) {
        Alert.alert('Erreur', result.message || 'Échec de l’export Excel.');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Une erreur est survenue lors de l’export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Export & compte" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <AppText variant="labelMd" color={Palette.textVariant}>
            Partage avec ton médecin
          </AppText>
          <AppText variant="headlineLg" style={{ marginTop: 4 }}>
            Exporter mes données
          </AppText>
        </View>

        {/* Export Excel */}
        <Card style={{ gap: 18 }}>
          <SectionHeader
            icon={FileSpreadsheet}
            iconBg={Palette.limeSoft}
            iconColor={Palette.primary}
            title="Fichier Excel (.xlsx)"
            subtitle="Période et données à inclure"
          />

          <View style={{ gap: 10 }}>
            <AppText variant="labelMd">Période</AppText>
            <View style={styles.wrap}>
              {[
                { id: '7d', label: '7 jours' },
                { id: '30d', label: '30 jours' },
                { id: '90d', label: '3 mois' },
                { id: 'all', label: 'Tout' },
              ].map((p) => (
                <Chip
                  key={p.id}
                  label={p.label}
                  selected={datePreset === p.id}
                  onPress={() => setDatePreset(p.id as DatePreset)}
                  style={styles.flatChip}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <AppText variant="labelMd">Données à inclure</AppText>
            <ToggleRow icon={Activity} title="Anxiété, boule gorge & disputes" value={includeSymptoms} onValueChange={setIncludeSymptoms} />
            <ToggleRow icon={Sparkles} title="Cheveux, lavages & coupes" value={includeHairCare} onValueChange={setIncludeHairCare} />
            <ToggleRow icon={Pill} title="Compléments pris & dosages" value={includeMedications} onValueChange={setIncludeMedications} />
            <ToggleRow icon={Droplet} title="Cycle menstruel" value={includeCycle} onValueChange={setIncludeCycle} />
            <ToggleRow icon={FlaskConical} title="Bilans de prises de sang" value={includeLabTests} onValueChange={setIncludeLabTests} />
            <ToggleRow icon={SlidersHorizontal} title="Normes fonctionnelles" value={includeLabNorms} onValueChange={setIncludeLabNorms} />
          </View>

          <PillButton label="Générer et partager le fichier" icon={Share2} loading={exporting} onPress={handleGenerateExcel} />
        </Card>

        {/* Compte */}
        {user && (
          <Card style={{ gap: 14 }}>
            <SectionHeader
              icon={User}
              iconBg={Palette.containerLow}
              iconColor={Palette.textVariant}
              title="Mon compte"
              subtitle="Synchronisation automatique"
            />
            <View style={styles.userPill}>
              <CircleCheck size={16} color={Palette.primary} />
              <AppText variant="bodyMd" color={Palette.text} numberOfLines={1} style={{ flex: 1 }}>
                {user.email}
              </AppText>
            </View>
            <PillButton label="Se déconnecter" icon={LogOut} variant="coral" compact onPress={handleLogout} />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  content: {
    paddingHorizontal: Spacing.margin,
    paddingTop: 8,
    paddingBottom: DockClearance,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flatChip: { backgroundColor: Palette.containerLow, shadowOpacity: 0, elevation: 0 },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.containerLow,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
