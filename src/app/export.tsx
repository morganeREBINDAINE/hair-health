import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import {
  FileSpreadsheet,
  Download,
  Share2,
  Cloud,
  CheckCircle2,
  LogIn,
  LogOut,
  Settings,
  Sparkles,
  Pill,
  Zap,
  Activity,
} from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { ExcelService, ExportFilterOptions } from '../services/excelService';
import { signInWithGoogle, supabase } from '../lib/supabase';

type DatePreset = '7d' | '30d' | '90d' | 'all';

export default function ExportScreen() {
  const [exporting, setExporting] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');

  // Filtres d'export
  const [includeSymptoms, setIncludeSymptoms] = useState(true);
  const [includeHairCare, setIncludeHairCare] = useState(true);
  const [includeMedications, setIncludeMedications] = useState(true);
  const [includeLabTests, setIncludeLabTests] = useState(true);
  const [includeLabNorms, setIncludeLabNorms] = useState(true);

  // État Supabase & Utilisateur
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Config manuelle Supabase
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');

  const colors = Colors.light;

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data } = await supabase.auth.getSession();
    setUser(data.session?.user ?? null);
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      const res = await signInWithGoogle();
      if (!res.success && res.error) {
        Alert.alert('Information Google Sign-In', res.error);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de se connecter à Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* BLOC 1 : EXPORTATION EXCEL */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FileSpreadsheet size={22} color={colors.meds} />
            <Text style={styles.cardTitle}>Exporter en Fichier Excel (.xlsx)</Text>
          </View>
          <Text style={styles.cardSub}>
            Choisissez la période et cochez les données que vous souhaitez inclure dans le tableur.
          </Text>

          {/* Choix de la période */}
          <Text style={styles.sectionLabel}>Période d'export :</Text>
          <View style={styles.presetRow}>
            {[
              { id: '7d', label: '7 jours' },
              { id: '30d', label: '30 jours' },
              { id: '90d', label: '3 mois' },
              { id: 'all', label: 'Tout' },
            ].map((p) => {
              const isSelected = datePreset === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setDatePreset(p.id as DatePreset)}
                  style={[styles.presetButton, isSelected && styles.presetButtonActive]}>
                  <Text style={[styles.presetButtonText, isSelected && styles.presetButtonTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Données à inclure */}
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Données à inclure :</Text>

          <View style={styles.optionRow}>
            <View style={styles.optionLabelGroup}>
              <Zap size={16} color={colors.anxiety} />
              <Text style={styles.optionLabel}>Anxiété, Boule gorge & Disputes</Text>
            </View>
            <Switch
              value={includeSymptoms}
              onValueChange={setIncludeSymptoms}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionLabelGroup}>
              <Sparkles size={16} color={colors.hair} />
              <Text style={styles.optionLabel}>Santé cheveux, Lavages & Coupes</Text>
            </View>
            <Switch
              value={includeHairCare}
              onValueChange={setIncludeHairCare}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionLabelGroup}>
              <Pill size={16} color={colors.meds} />
              <Text style={styles.optionLabel}>Compléments pris & Dosages</Text>
            </View>
            <Switch
              value={includeMedications}
              onValueChange={setIncludeMedications}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionLabelGroup}>
              <Activity size={16} color={colors.blood} />
              <Text style={styles.optionLabel}>Bilans de prises de sang</Text>
            </View>
            <Switch
              value={includeLabTests}
              onValueChange={setIncludeLabTests}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionLabelGroup}>
              <Settings size={16} color={colors.textSecondary} />
              <Text style={styles.optionLabel}>Normes fonctionnelles de référence</Text>
            </View>
            <Switch
              value={includeLabNorms}
              onValueChange={setIncludeLabNorms}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {/* Bouton d'export */}
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleGenerateExcel}
            disabled={exporting}>
            {exporting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Share2 size={18} color="#FFF" />
                <Text style={styles.exportBtnText}>Générer et Partager le fichier Excel</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* BLOC 2 : SYNCHRONISATION SUPABASE & GOOGLE OAUTH */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Cloud size={22} color={colors.primary} />
            <Text style={styles.cardTitle}>Sauvegarde Cloud Supabase & Google</Text>
          </View>
          <Text style={styles.cardSub}>
            Retrouvez toutes vos données même si vous changez de téléphone grâce à la synchronisation cloud sécurisée.
          </Text>

          {user ? (
            <View style={styles.userBox}>
              <View style={styles.userStatusRow}>
                <CheckCircle2 size={18} color={colors.success} />
                <Text style={styles.userStatusText}>Connecté avec Google</Text>
              </View>
              <Text style={styles.userEmail}>{user.email}</Text>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <LogOut size={16} color={colors.danger} />
                <Text style={styles.logoutBtnText}>Se déconnecter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.authBox}>
              <Text style={styles.offlineNotice}>
                Vos données sont actuellement enregistrées en toute sécurité en local sur votre appareil.
              </Text>
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleLogin}
                disabled={authLoading}>
                {authLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <LogIn size={18} color="#FFF" />
                    <Text style={styles.googleBtnText}>Se connecter avec Google</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Option configuration Supabase custom */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowConfig(!showConfig)}>
            <Settings size={14} color="#64748B" />
            <Text style={styles.configToggleText}>
              {showConfig ? 'Masquer paramètres Supabase' : 'Configurer son projet Supabase'}
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.configForm}>
              <Text style={styles.configHint}>
                Par défaut, l'application utilise les variables de configuration ou le mode local. Vous pouvez coller ici l'URL de votre propre projet Supabase :
              </Text>
              <Text style={styles.inputLabel}>URL Supabase :</Text>
              <TextInput
                style={styles.configInput}
                value={customUrl}
                onChangeText={setCustomUrl}
                placeholder="https://xxxx.supabase.co"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.inputLabel}>Clé Anon publique :</Text>
              <TextInput
                style={styles.configInput}
                value={customKey}
                onChangeText={setCustomKey}
                placeholder="eyJh..."
                placeholderTextColor={colors.textMuted}
              />
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  presetButtonTextActive: {
    color: '#FFFFFF',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  optionLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669', // Emerald
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 18,
    shadowColor: '#059669',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  userBox: {
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 8,
  },
  userStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  userStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  userEmail: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  logoutBtnText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  authBox: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  offlineNotice: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  googleBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  configToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    alignSelf: 'center',
  },
  configToggleText: {
    fontSize: 12,
    color: '#64748B',
  },
  configForm: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  configHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 10,
    lineHeight: 15,
  },
  inputLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 4,
  },
  configInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
    marginBottom: 10,
  },
});
