import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LAB_MARKERS, DEFAULT_MEDICATIONS } from '../constants/initialData';
import { DailyLog, LabMarkerDefinition, LabTest, MedicationDefinition } from '../types';
import { supabase } from '../lib/supabase';

const KEYS = {
  DAILY_LOGS: '@hair_tracker_daily_logs',
  MEDICATIONS: '@hair_tracker_medications',
  LAB_MARKERS: '@hair_tracker_lab_markers',
  LAB_TESTS: '@hair_tracker_lab_tests',
};

export const StorageService = {
  // Initialisation des données au premier lancement
  async initializeDefaults(): Promise<void> {
    const meds = await AsyncStorage.getItem(KEYS.MEDICATIONS);
    if (!meds) {
      await AsyncStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(DEFAULT_MEDICATIONS));
    }

    const markers = await AsyncStorage.getItem(KEYS.LAB_MARKERS);
    if (!markers) {
      await AsyncStorage.setItem(KEYS.LAB_MARKERS, JSON.stringify(DEFAULT_LAB_MARKERS));
    }
  },

  // --- Gestion des Médicaments & Compléments ---
  async getMedications(): Promise<MedicationDefinition[]> {
    const raw = await AsyncStorage.getItem(KEYS.MEDICATIONS);
    if (!raw) {
      await this.initializeDefaults();
      return DEFAULT_MEDICATIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_MEDICATIONS;
    }
  },

  async addMedication(name: string, defaultDosage: string = '', isPrechecked: boolean = false): Promise<MedicationDefinition[]> {
    const meds = await this.getMedications();
    const newMed: MedicationDefinition = {
      id: `med-${Date.now()}`,
      name: name.trim(),
      defaultDosage: defaultDosage.trim(),
      isPrechecked,
      isActive: true,
      category: 'supplement',
      displayOrder: meds.length + 1,
    };
    const updated = [...meds, newMed];
    await AsyncStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(updated));
    return updated;
  },

  async updateMedication(updatedMed: MedicationDefinition): Promise<MedicationDefinition[]> {
    const meds = await this.getMedications();
    const index = meds.findIndex((m) => m.id === updatedMed.id);
    let updated: MedicationDefinition[];
    if (index >= 0) {
      updated = [...meds];
      updated[index] = updatedMed;
    } else {
      updated = [...meds, updatedMed];
    }
    await AsyncStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(updated));
    return updated;
  },

  async toggleMedicationPrechecked(id: string): Promise<MedicationDefinition[]> {
    const meds = await this.getMedications();
    const updated = meds.map((m) =>
      m.id === id ? { ...m, isPrechecked: !m.isPrechecked } : m
    );
    await AsyncStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(updated));
    return updated;
  },

  async deleteMedication(id: string): Promise<MedicationDefinition[]> {
    const meds = await this.getMedications();
    const updated = meds.filter((m) => m.id !== id);
    await AsyncStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(updated));
    return updated;
  },

  async saveMedications(meds: MedicationDefinition[]): Promise<MedicationDefinition[]> {
    await AsyncStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(meds));
    return meds;
  },

  // --- Gestion des Journaux Quotidiens ---
  async getAllDailyLogs(): Promise<Record<string, DailyLog>> {
    const raw = await AsyncStorage.getItem(KEYS.DAILY_LOGS);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  async getDailyLog(dateStr: string): Promise<DailyLog | null> {
    const all = await this.getAllDailyLogs();
    return all[dateStr] || null;
  },

  async saveDailyLog(log: DailyLog): Promise<void> {
    const all = await this.getAllDailyLogs();
    all[log.date] = {
      ...log,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(KEYS.DAILY_LOGS, JSON.stringify(all));

    // Si l'utilisateur est connecté à Supabase, synchronisation dans le cloud
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (user) {
        await supabase.from('daily_logs').upsert({
          user_id: user.id,
          date: log.date,
          anxiety_score: log.anxietyScore,
          lump_in_throat: log.lumpInThroat,
          conflict_with_husband: log.conflictWithHusband,
          hair_loss_amount: log.hairLossAmount,
          haircut_done: log.haircutDone,
          haircut_notes: log.haircutNotes,
          hair_wash_done: log.hairWashDone,
          shampoo_type: log.shampooType,
          henna_done: log.hennaDone,
          sleep_hours: log.sleepHours ?? null,
          fatigue_level: log.fatigueLevel ?? null,
          notes: log.notes || '',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,date' });

        // Enregistrement des médicaments pris
        const { data: existingLog } = await supabase
          .from('daily_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', log.date)
          .single();

        if (existingLog?.id) {
          // Supprimer et réinsérer les prises du jour
          await supabase.from('daily_medications').delete().eq('daily_log_id', existingLog.id);
          const medsToInsert = log.medications.map((m) => ({
            daily_log_id: existingLog.id,
            user_id: user.id,
            medication_name: m.name,
            taken: m.taken,
            dosage: m.dosage,
          }));
          if (medsToInsert.length > 0) {
            await supabase.from('daily_medications').insert(medsToInsert);
          }
        }
      }
    } catch (e) {
      console.warn('Sync Supabase en arrière plan :', e);
    }
  },

  // --- Gestion des Normes Fonctionnelles (Analyses) ---
  async getLabMarkers(): Promise<LabMarkerDefinition[]> {
    const raw = await AsyncStorage.getItem(KEYS.LAB_MARKERS);
    if (!raw) {
      await this.initializeDefaults();
      return DEFAULT_LAB_MARKERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_LAB_MARKERS;
    }
  },

  async saveLabMarker(marker: LabMarkerDefinition): Promise<LabMarkerDefinition[]> {
    const markers = await this.getLabMarkers();
    const index = markers.findIndex((m) => m.id === marker.id);
    let updated: LabMarkerDefinition[];
    if (index >= 0) {
      updated = [...markers];
      updated[index] = marker;
    } else {
      updated = [...markers, marker];
    }
    await AsyncStorage.setItem(KEYS.LAB_MARKERS, JSON.stringify(updated));
    return updated;
  },

  // --- Gestion des Bilans Sanguins ---
  async getLabTests(): Promise<LabTest[]> {
    const raw = await AsyncStorage.getItem(KEYS.LAB_TESTS);
    if (!raw) return [];
    try {
      const tests: LabTest[] = JSON.parse(raw);
      return tests.sort((a, b) => b.date.localeCompare(a.date));
    } catch {
      return [];
    }
  },

  async saveLabTest(test: LabTest): Promise<LabTest[]> {
    const tests = await this.getLabTests();
    const index = tests.findIndex((t) => t.id === test.id);
    let updated: LabTest[];
    if (index >= 0) {
      updated = [...tests];
      updated[index] = test;
    } else {
      updated = [test, ...tests];
    }
    await AsyncStorage.setItem(KEYS.LAB_TESTS, JSON.stringify(updated));
    return updated;
  },

  async deleteLabTest(id: string): Promise<LabTest[]> {
    const tests = await this.getLabTests();
    const updated = tests.filter((t) => t.id !== id);
    await AsyncStorage.setItem(KEYS.LAB_TESTS, JSON.stringify(updated));
    return updated;
  },
};
