import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyLog, DailyMedicationItem, FatigueLevel, LabMarkerDefinition, LabTest, MedicalExam, MedicationDefinition, PlannedCheckup, ShampooType, TreatmentPlan } from '../types';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { computeRecheckReminders } from '../lib/labStatus';

const KEYS = {
  DAILY_LOGS: '@hair_tracker_daily_logs',
  MEDICATIONS: '@hair_tracker_medications',
  LAB_MARKERS: '@hair_tracker_lab_markers',
  LAB_TESTS: '@hair_tracker_lab_tests',
  TREATMENT_PLANS: '@hair_tracker_treatment_plans',
  MEDICAL_EXAMS: '@hair_tracker_medical_exams',
  PLANNED_CHECKUPS: '@hair_tracker_planned_checkups',
};

const EXAM_PHOTOS_BUCKET = 'exam-photos';

function toRecheckMonths(raw: unknown): 6 | 12 | null {
  return raw === 6 || raw === 12 ? raw : null;
}

function mapExamRow(row: any): MedicalExam {
  return {
    id: row.id,
    type: row.type,
    date: row.exam_date,
    title: row.title ?? '',
    location: row.location ?? '',
    result: row.result ?? '',
    photoPath: row.photo_path ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCheckupRow(row: any): PlannedCheckup {
  return {
    id: row.id,
    kind: row.kind,
    date: row.planned_date,
    markerCodes: row.marker_codes ?? [],
    examLabel: row.exam_label ?? '',
    note: row.note ?? '',
    done: row.done ?? false,
    isAuto: row.is_auto ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function readCachedList<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

function migratePlannedBloodTest(
  raw: any,
  markers: LabMarkerDefinition[],
): TreatmentPlan['plannedBloodTest'] {
  if (!raw || !raw.date) return undefined;
  if (raw.markerCodes) return { date: raw.date, markerCodes: raw.markerCodes };
  if (raw.markerIds) {
    const idToCode = new Map(markers.map((m) => [m.id, m.code]));
    const codes = (raw.markerIds as string[])
      .map((id) => idToCode.get(id) ?? id.replace('marker-', ''))
      .filter(Boolean);
    return { date: raw.date, markerCodes: codes };
  }
  return { date: raw.date, markerCodes: [] };
}

export const StorageService = {
  // --- Lecture (depuis le cache AsyncStorage) ---

  async getMedications(): Promise<MedicationDefinition[]> {
    const raw = await AsyncStorage.getItem(KEYS.MEDICATIONS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

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

  async getLabMarkers(): Promise<LabMarkerDefinition[]> {
    const raw = await AsyncStorage.getItem(KEYS.LAB_MARKERS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

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

  async getTreatmentPlans(): Promise<TreatmentPlan[]> {
    const raw = await AsyncStorage.getItem(KEYS.TREATMENT_PLANS);
    if (!raw) return [];
    try {
      const plans: TreatmentPlan[] = JSON.parse(raw);
      const markers = await this.getLabMarkers();
      let migrated = false;
      for (const p of plans) {
        const fixed = migratePlannedBloodTest(p.plannedBloodTest, markers);
        if (p.plannedBloodTest && (p.plannedBloodTest as any).markerIds) {
          p.plannedBloodTest = fixed;
          migrated = true;
        }
      }
      if (migrated) {
        await AsyncStorage.setItem(KEYS.TREATMENT_PLANS, JSON.stringify(plans));
      }
      return plans;
    } catch {
      return [];
    }
  },

  async getMedicalExams(): Promise<MedicalExam[]> {
    const exams = await readCachedList<MedicalExam>(KEYS.MEDICAL_EXAMS);
    return exams.sort((a, b) => b.date.localeCompare(a.date));
  },

  async getPlannedCheckups(): Promise<PlannedCheckup[]> {
    const items = await readCachedList<PlannedCheckup>(KEYS.PLANNED_CHECKUPS);
    return items.sort((a, b) => a.date.localeCompare(b.date));
  },

  /** URL temporaire (1 h) pour afficher une photo du bucket privé. */
  async getExamPhotoUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from(EXAM_PHOTOS_BUCKET).createSignedUrl(path, 3600);
    if (error || !data) throw error ?? new Error('URL de photo indisponible');
    return data.signedUrl;
  },

  getActivePlansForDate(plans: TreatmentPlan[], date: string): TreatmentPlan[] {
    return plans.filter((p) => {
      if (!p.isActive) return false;
      if (p.startDate > date) return false;
      if (p.type === 'cure' && p.endDate && p.endDate < date) return false;
      return true;
    });
  },

  // --- Ecritures (cloud-first : Supabase d'abord, cache ensuite) ---

  async addMedication(name: string, defaultDosage: string = '', isPrechecked: boolean = false): Promise<MedicationDefinition[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

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

    const { data: inserted, error } = await supabase.from('medication_definitions').insert({
      user_id: userId,
      name: newMed.name,
      default_dosage: newMed.defaultDosage,
      is_prechecked: newMed.isPrechecked,
      is_active: newMed.isActive,
      category: newMed.category,
      display_order: newMed.displayOrder,
    }).select('id').single();

    if (error) throw error;
    if (inserted) newMed.id = inserted.id;

    const updated = [...meds, newMed];
    await AsyncStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(updated));
    return updated;
  },

  async updateMedication(updatedMed: MedicationDefinition): Promise<MedicationDefinition[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const { error } = await supabase.from('medication_definitions').update({
      name: updatedMed.name,
      default_dosage: updatedMed.defaultDosage,
      is_prechecked: updatedMed.isPrechecked,
      is_active: updatedMed.isActive,
      category: updatedMed.category,
      display_order: updatedMed.displayOrder,
    }).eq('id', updatedMed.id).eq('user_id', userId);

    if (error) throw error;

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
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const meds = await this.getMedications();
    const med = meds.find((m) => m.id === id);
    if (!med) throw new Error('Médicament introuvable');

    const newValue = !med.isPrechecked;
    const { error } = await supabase.from('medication_definitions')
      .update({ is_prechecked: newValue })
      .eq('id', id).eq('user_id', userId);

    if (error) throw error;

    const updated = meds.map((m) => m.id === id ? { ...m, isPrechecked: newValue } : m);
    await AsyncStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(updated));
    return updated;
  },

  async deleteMedication(id: string): Promise<MedicationDefinition[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const { error } = await supabase.from('medication_definitions')
      .delete()
      .eq('id', id).eq('user_id', userId);

    if (error) throw error;

    const meds = await this.getMedications();
    const updated = meds.filter((m) => m.id !== id);
    await AsyncStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(updated));
    return updated;
  },

  async saveMedications(meds: MedicationDefinition[]): Promise<MedicationDefinition[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    // Full push to cloud
    const { data: existingCloud } = await supabase
      .from('medication_definitions')
      .select('id, name')
      .eq('user_id', userId);

    const cloudByName = new Map<string, string>();
    for (const cm of existingCloud ?? []) {
      cloudByName.set((cm.name as string).toLowerCase(), cm.id);
    }

    const localNames = new Set(meds.map((m) => m.name.toLowerCase()));
    const toDelete = (existingCloud ?? []).filter(
      (cm) => !localNames.has((cm.name as string).toLowerCase())
    );
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('medication_definitions')
        .delete()
        .in('id', toDelete.map((cm) => cm.id));
      if (error) throw error;
    }

    for (const m of meds) {
      const existingId = cloudByName.get(m.name.toLowerCase());
      const payload = {
        default_dosage: m.defaultDosage,
        is_prechecked: m.isPrechecked,
        is_active: m.isActive,
        category: m.category,
        display_order: m.displayOrder,
      };
      if (existingId) {
        const { error } = await supabase.from('medication_definitions').update(payload).eq('id', existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('medication_definitions').insert({
          user_id: userId,
          name: m.name,
          ...payload,
        });
        if (error) throw error;
      }
    }

    await AsyncStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(meds));
    return meds;
  },

  async saveDailyLog(log: DailyLog): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const now = new Date().toISOString();

    const { error: logError } = await supabase.from('daily_logs').upsert({
      user_id: userId,
      date: log.date,
      anxiety_score: log.anxietyScore,
      lump_in_throat: log.lumpInThroat,
      conflict_with_husband: log.conflictWithHusband,
      conflict_note: log.conflictNote ?? '',
      hair_loss_amount: log.hairLossAmount,
      haircut_done: log.haircutDone,
      haircut_notes: log.haircutNotes,
      hair_wash_done: log.hairWashDone,
      shampoo_type: log.shampooType,
      henna_done: log.hennaDone,
      sleep_hours: log.sleepHours ?? null,
      fatigue_level: log.fatigueLevel ?? null,
      notes: log.notes || '',
      menstrual_flow: log.menstrualFlow ?? null,
      menstrual_pain: log.menstrualPain ?? null,
      menstrual_note: log.menstrualNote ?? '',
      menstrual_ended_at: log.menstrualEndedAt ?? null,
      updated_at: now,
    }, { onConflict: 'user_id,date' });

    if (logError) throw logError;

    const { data: existingLog } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('date', log.date)
      .single();

    if (existingLog?.id) {
      await supabase.from('daily_medications').delete().eq('daily_log_id', existingLog.id);
      const medsToInsert = log.medications.map((m) => ({
        daily_log_id: existingLog.id,
        user_id: userId,
        medication_name: m.name,
        taken: m.taken,
        dosage: m.dosage,
      }));
      if (medsToInsert.length > 0) {
        const { error: medsError } = await supabase.from('daily_medications').insert(medsToInsert);
        if (medsError) throw medsError;
      }
    }

    // Cloud succeeded — update cache
    const all = await this.getAllDailyLogs();
    all[log.date] = { ...log, updatedAt: now };
    await AsyncStorage.setItem(KEYS.DAILY_LOGS, JSON.stringify(all));
  },

  async saveLabMarker(marker: LabMarkerDefinition): Promise<LabMarkerDefinition[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const markers = await this.getLabMarkers();
    const existing = markers.find((m) => m.id === marker.id);

    const payload = {
      name: marker.name,
      min_functional: marker.minFunctional,
      max_functional: marker.maxFunctional,
      unit: marker.unit,
      description: marker.description,
      display_order: marker.displayOrder,
      recheck_months: marker.recheckMonths ?? null,
      auto_planned_key: marker.autoPlannedKey ?? null,
    };

    if (existing) {
      const { error } = await supabase.from('lab_marker_definitions')
        .update(payload)
        .eq('id', marker.id).eq('user_id', userId);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await supabase.from('lab_marker_definitions')
        .insert({ user_id: userId, code: marker.code, ...payload })
        .select('id').single();
      if (error) throw error;
      if (inserted) marker = { ...marker, id: inserted.id };
    }

    const index = markers.findIndex((m) => m.id === marker.id || m.code === marker.code);
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

  async deleteLabMarker(id: string): Promise<LabMarkerDefinition[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const { error } = await supabase.from('lab_marker_definitions')
      .delete()
      .eq('id', id).eq('user_id', userId);

    if (error) throw error;

    const markers = await this.getLabMarkers();
    const updated = markers.filter((m) => m.id !== id);
    await AsyncStorage.setItem(KEYS.LAB_MARKERS, JSON.stringify(updated));
    return updated;
  },

  async saveLabTest(test: LabTest): Promise<LabTest[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const markers = await this.getLabMarkers();

    // Upsert the test in cloud
    const { data: existingRows } = await supabase
      .from('lab_tests')
      .select('id')
      .eq('user_id', userId)
      .eq('test_date', test.date)
      .limit(1);

    const existingRow = existingRows?.[0] ?? null;
    let testId: string;

    if (existingRow) {
      testId = existingRow.id;
      const { error } = await supabase.from('lab_tests').update({ notes: test.notes ?? '' }).eq('id', testId);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await supabase
        .from('lab_tests')
        .insert({ user_id: userId, test_date: test.date, notes: test.notes ?? '' })
        .select('id')
        .single();
      if (error || !inserted) throw error ?? new Error('Impossible de créer le bilan');
      testId = inserted.id;
    }

    await supabase.from('lab_test_values').delete().eq('lab_test_id', testId);

    const { data: cloudMarkers } = await supabase
      .from('lab_marker_definitions')
      .select('id, code')
      .eq('user_id', userId);

    const codeToUuid = new Map<string, string>();
    for (const cm of cloudMarkers ?? []) {
      codeToUuid.set(cm.code.toLowerCase(), cm.id);
    }

    const rows: { lab_test_id: string; user_id: string; marker_id: string; value: number }[] = [];
    for (const [key, value] of Object.entries(test.values)) {
      if (typeof value !== 'number') continue;
      const marker = markers.find((m) => m.id === key);
      const code = marker?.code?.toLowerCase() ?? key.replace('marker-', '').toLowerCase();
      const markerUuid = codeToUuid.get(code);
      if (markerUuid) {
        rows.push({ lab_test_id: testId, user_id: userId, marker_id: markerUuid, value });
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('lab_test_values').insert(rows);
      if (error) throw error;
    }

    // Cloud succeeded — update cache
    const tests = await this.getLabTests();
    const index = tests.findIndex((t) => t.id === test.id || t.date === test.date);
    const savedTest = { ...test, id: testId };
    let updated: LabTest[];
    if (index >= 0) {
      updated = [...tests];
      updated[index] = savedTest;
    } else {
      updated = [savedTest, ...tests];
    }
    updated.sort((a, b) => b.date.localeCompare(a.date));
    await AsyncStorage.setItem(KEYS.LAB_TESTS, JSON.stringify(updated));
    return updated;
  },

  async deleteLabTest(id: string): Promise<LabTest[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const tests = await this.getLabTests();
    const toDelete = tests.find((t) => t.id === id);

    if (toDelete) {
      const { error } = await supabase.from('lab_tests')
        .delete()
        .eq('user_id', userId)
        .eq('test_date', toDelete.date);
      if (error) throw error;
    }

    const updated = tests.filter((t) => t.id !== id);
    await AsyncStorage.setItem(KEYS.LAB_TESTS, JSON.stringify(updated));
    return updated;
  },

  async saveTreatmentPlan(plan: TreatmentPlan): Promise<TreatmentPlan[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const stamped = { ...plan, updatedAt: new Date().toISOString() };

    const { error } = await supabase.from('treatment_plans').upsert({
      id: stamped.id,
      user_id: userId,
      type: stamped.type,
      name: stamped.name,
      description: stamped.description ?? '',
      dosage: stamped.dosage,
      start_date: stamped.startDate,
      end_date: stamped.endDate ?? null,
      planned_blood_test: stamped.plannedBloodTest ?? null,
      is_active: stamped.isActive,
      created_at: stamped.createdAt,
      updated_at: stamped.updatedAt,
    }, { onConflict: 'id' });

    if (error) throw error;

    const plans = await this.getTreatmentPlans();
    const index = plans.findIndex((p) => p.id === plan.id);
    let updated: TreatmentPlan[];
    if (index >= 0) {
      updated = [...plans];
      updated[index] = stamped;
    } else {
      updated = [...plans, stamped];
    }
    await AsyncStorage.setItem(KEYS.TREATMENT_PLANS, JSON.stringify(updated));
    return updated;
  },

  async deleteTreatmentPlan(id: string): Promise<TreatmentPlan[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const { error } = await supabase.from('treatment_plans')
      .delete()
      .eq('id', id).eq('user_id', userId);

    if (error) throw error;

    const plans = await this.getTreatmentPlans();
    const updated = plans.filter((p) => p.id !== id);
    await AsyncStorage.setItem(KEYS.TREATMENT_PLANS, JSON.stringify(updated));
    return updated;
  },

  /**
   * Enregistre un examen. `localPhotoUri` : nouvelle photo à envoyer ;
   * `removePhoto` : supprime la photo existante.
   */
  async saveMedicalExam(
    exam: MedicalExam,
    options: { localPhotoUri?: string | null; removePhoto?: boolean } = {},
  ): Promise<MedicalExam[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const exams = await this.getMedicalExams();
    const previousPath = exams.find((e) => e.id === exam.id)?.photoPath ?? null;
    let photoPath = options.removePhoto ? null : exam.photoPath;
    let uploadedPath: string | null = null;

    if (options.localPhotoUri) {
      const response = await fetch(options.localPhotoUri);
      const body = await response.arrayBuffer();
      uploadedPath = `${userId}/${exam.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(EXAM_PHOTOS_BUCKET)
        .upload(uploadedPath, body, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      photoPath = uploadedPath;
    }

    const { data, error } = await supabase.from('medical_exams').upsert({
      id: exam.id,
      user_id: userId,
      type: exam.type,
      exam_date: exam.date,
      title: exam.title,
      location: exam.location,
      result: exam.result,
      photo_path: photoPath,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }).select('*').single();

    if (error || !data) {
      // L'examen n'est pas enregistré : on retire la photo orpheline
      if (uploadedPath) await supabase.storage.from(EXAM_PHOTOS_BUCKET).remove([uploadedPath]);
      throw error ?? new Error('Examen non enregistré');
    }

    if (previousPath && previousPath !== photoPath) {
      const { error: removeError } = await supabase.storage.from(EXAM_PHOTOS_BUCKET).remove([previousPath]);
      if (removeError) console.warn('[storage] ancienne photo non supprimée', removeError);
    }

    const saved = mapExamRow(data);
    const updated = [...exams.filter((e) => e.id !== saved.id), saved].sort((a, b) => b.date.localeCompare(a.date));
    await AsyncStorage.setItem(KEYS.MEDICAL_EXAMS, JSON.stringify(updated));
    return updated;
  },

  async deleteMedicalExam(id: string): Promise<MedicalExam[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const exams = await this.getMedicalExams();
    const photoPath = exams.find((e) => e.id === id)?.photoPath;

    const { error } = await supabase.from('medical_exams').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;

    if (photoPath) {
      const { error: removeError } = await supabase.storage.from(EXAM_PHOTOS_BUCKET).remove([photoPath]);
      if (removeError) console.warn('[storage] photo non supprimée', removeError);
    }

    const updated = exams.filter((e) => e.id !== id);
    await AsyncStorage.setItem(KEYS.MEDICAL_EXAMS, JSON.stringify(updated));
    return updated;
  },

  async savePlannedCheckup(item: PlannedCheckup): Promise<PlannedCheckup[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const { data, error } = await supabase.from('planned_checkups').upsert({
      id: item.id,
      user_id: userId,
      kind: item.kind,
      planned_date: item.date,
      marker_codes: item.markerCodes,
      exam_label: item.examLabel,
      note: item.note,
      done: item.done,
      is_auto: item.isAuto ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }).select('*').single();

    if (error || !data) throw error ?? new Error('Planification non enregistrée');

    const saved = mapCheckupRow(data);
    const items = await this.getPlannedCheckups();
    const updated = [...items.filter((p) => p.id !== saved.id), saved].sort((a, b) => a.date.localeCompare(b.date));
    await AsyncStorage.setItem(KEYS.PLANNED_CHECKUPS, JSON.stringify(updated));
    return updated;
  },

  async deletePlannedCheckup(id: string): Promise<PlannedCheckup[]> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Non authentifié');

    const { error } = await supabase.from('planned_checkups').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;

    const items = await this.getPlannedCheckups();
    const updated = items.filter((p) => p.id !== id);
    await AsyncStorage.setItem(KEYS.PLANNED_CHECKUPS, JSON.stringify(updated));
    return updated;
  },

  /**
   * Crée (ou complète) le rendez-vous automatique de prise de sang pour les molécules
   * dont le contrôle est arrivé à échéance. Chaque échéance n'est planifiée qu'une fois,
   * même si le rendez-vous est ensuite supprimé. Retourne vrai si quelque chose a changé.
   */
  async ensureAutoCheckups(today: string): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const [markers, tests, checkups] = await Promise.all([
      this.getLabMarkers(),
      this.getLabTests(),
      this.getPlannedCheckups(),
    ]);
    const toPlan = computeRecheckReminders(tests, markers, today)
      .filter((r) => r.due)
      .map((r) => ({ marker: r.marker, key: r.dueDate ?? 'initial' }))
      .filter(({ marker, key }) => marker.autoPlannedKey !== key);
    if (toPlan.length === 0) return false;

    const pending = checkups.find((c) => c.isAuto && c.kind === 'blood' && !c.done);
    const codes = new Set(pending?.markerCodes ?? []);
    toPlan.forEach(({ marker }) => codes.add(marker.code));

    await this.savePlannedCheckup({
      id: pending?.id ?? Crypto.randomUUID(),
      kind: 'blood',
      date: pending?.date ?? today,
      markerCodes: [...codes],
      examLabel: '',
      note: pending?.note ?? 'Contrôle de suivi',
      done: false,
      isAuto: true,
    });

    // Mémorise l'échéance traitée pour ne pas recréer le rendez-vous s'il est supprimé
    const updatedMarkers = [...markers];
    for (const { marker, key } of toPlan) {
      const { error } = await supabase.from('lab_marker_definitions')
        .update({ auto_planned_key: key })
        .eq('id', marker.id).eq('user_id', userId);
      if (error) throw error;
      const i = updatedMarkers.findIndex((m) => m.id === marker.id);
      if (i >= 0) updatedMarkers[i] = { ...updatedMarkers[i], autoPlannedKey: key };
    }
    await AsyncStorage.setItem(KEYS.LAB_MARKERS, JSON.stringify(updatedMarkers));
    return true;
  },

  // --- Synchronisation complète depuis le cloud (appelée à la connexion) ---
  async syncFromCloud(userId: string): Promise<{ synced: number }> {
    let synced = 0;

    // ── 1. Daily logs ──
    const { data: cloudLogs } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId);

    if (cloudLogs) {
      const merged: Record<string, DailyLog> = {};
      for (const row of cloudLogs) {
        const date: string = row.date;
        const { data: cloudMeds } = await supabase
          .from('daily_medications')
          .select('*')
          .eq('daily_log_id', row.id);

        const medications: DailyMedicationItem[] = (cloudMeds ?? []).map((m: any) => ({
          name: m.medication_name,
          taken: m.taken,
          dosage: m.dosage ?? '',
        }));

        merged[date] = {
          date,
          anxietyScore: row.anxiety_score,
          lumpInThroat: row.lump_in_throat ?? false,
          conflictWithHusband: row.conflict_with_husband ?? false,
          conflictNote: row.conflict_note ?? '',
          hairLossAmount: row.hair_loss_amount,
          haircutDone: row.haircut_done ?? false,
          haircutNotes: row.haircut_notes ?? '',
          hairWashDone: row.hair_wash_done ?? false,
          shampooType: (row.shampoo_type as ShampooType) ?? null,
          hennaDone: row.henna_done ?? false,
          sleepHours: row.sleep_hours ?? null,
          fatigueLevel: (row.fatigue_level as FatigueLevel) ?? null,
          notes: row.notes ?? '',
          menstrualFlow: row.menstrual_flow ?? null,
          menstrualPain: row.menstrual_pain ?? null,
          menstrualNote: row.menstrual_note ?? '',
          // Postgres renvoie « HH:MM:SS »
          menstrualEndedAt: row.menstrual_ended_at ? String(row.menstrual_ended_at).slice(0, 5) : null,
          medications,
          updatedAt: row.updated_at,
        };
        synced++;
      }
      await AsyncStorage.setItem(KEYS.DAILY_LOGS, JSON.stringify(merged));
    }

    // ── 2. Médicaments / compléments ──
    const { data: cloudMedDefs } = await supabase
      .from('medication_definitions')
      .select('*')
      .eq('user_id', userId)
      .order('display_order');

    const medications: MedicationDefinition[] = (cloudMedDefs ?? []).map((m: any) => ({
      id: m.id,
      name: m.name,
      defaultDosage: m.default_dosage ?? '',
      isPrechecked: m.is_prechecked ?? false,
      isActive: m.is_active ?? true,
      category: m.category ?? 'supplement',
      displayOrder: m.display_order ?? 0,
    }));
    await AsyncStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(medications));
    synced += medications.length;

    // ── 3. Normes biologiques ──
    const { data: cloudMarkers } = await supabase
      .from('lab_marker_definitions')
      .select('*')
      .eq('user_id', userId)
      .order('display_order');

    const markers: LabMarkerDefinition[] = (cloudMarkers ?? []).map((m: any) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      minFunctional: m.min_functional,
      maxFunctional: m.max_functional,
      unit: m.unit,
      description: m.description ?? '',
      displayOrder: m.display_order ?? 0,
      recheckMonths: toRecheckMonths(m.recheck_months),
      autoPlannedKey: m.auto_planned_key ?? null,
    }));
    await AsyncStorage.setItem(KEYS.LAB_MARKERS, JSON.stringify(markers));
    synced += markers.length;

    // ── 4. Bilans sanguins ──
    const { data: cloudTests } = await supabase
      .from('lab_tests')
      .select('*')
      .eq('user_id', userId)
      .order('test_date', { ascending: false });

    if (cloudTests) {
      const uuidToCode = new Map<string, string>();
      for (const m of cloudMarkers ?? []) {
        uuidToCode.set(m.id, (m.code as string).toLowerCase());
      }
      const codeToLocalId = new Map<string, string>();
      for (const m of markers) {
        codeToLocalId.set(m.code.toLowerCase(), m.id);
      }

      const labTests: LabTest[] = [];
      for (const ct of cloudTests) {
        const { data: cloudValues } = await supabase
          .from('lab_test_values')
          .select('*')
          .eq('lab_test_id', ct.id);

        const values: Record<string, number> = {};
        for (const v of cloudValues ?? []) {
          const code = uuidToCode.get(v.marker_id);
          const localId = code ? codeToLocalId.get(code) : undefined;
          values[localId ?? v.marker_id] = v.value;
        }

        labTests.push({
          id: ct.id,
          date: ct.test_date,
          notes: ct.notes ?? '',
          values,
          createdAt: ct.created_at,
        });
        synced++;
      }
      labTests.sort((a, b) => b.date.localeCompare(a.date));
      await AsyncStorage.setItem(KEYS.LAB_TESTS, JSON.stringify(labTests));
    }

    // ── 5. Plans de traitement ──
    const { data: cloudPlans } = await supabase
      .from('treatment_plans')
      .select('*')
      .eq('user_id', userId);

    const plans: TreatmentPlan[] = (cloudPlans ?? []).map((cp: any) => ({
      id: cp.id,
      type: cp.type,
      name: cp.name,
      description: cp.description ?? '',
      dosage: cp.dosage,
      startDate: cp.start_date,
      endDate: cp.end_date ?? undefined,
      plannedBloodTest: migratePlannedBloodTest(cp.planned_blood_test, markers),
      isActive: cp.is_active ?? true,
      createdAt: cp.created_at,
      updatedAt: cp.updated_at,
    }));
    await AsyncStorage.setItem(KEYS.TREATMENT_PLANS, JSON.stringify(plans));
    synced += plans.length;

    // ── 6. Examens médicaux ──
    const { data: cloudExams, error: examsError } = await supabase
      .from('medical_exams')
      .select('*')
      .eq('user_id', userId);
    if (examsError) throw examsError;
    const exams = (cloudExams ?? []).map(mapExamRow).sort((a, b) => b.date.localeCompare(a.date));
    await AsyncStorage.setItem(KEYS.MEDICAL_EXAMS, JSON.stringify(exams));
    synced += exams.length;

    // ── 7. Planifications ──
    const { data: cloudCheckups, error: checkupsError } = await supabase
      .from('planned_checkups')
      .select('*')
      .eq('user_id', userId);
    if (checkupsError) throw checkupsError;
    const checkups = (cloudCheckups ?? []).map(mapCheckupRow).sort((a, b) => a.date.localeCompare(b.date));
    await AsyncStorage.setItem(KEYS.PLANNED_CHECKUPS, JSON.stringify(checkups));
    synced += checkups.length;

    return { synced };
  },

  async clearCache(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};
