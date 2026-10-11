export type ShampooType = 'bebe' | 'sans_sulfate' | 'avec_sulfate' | 'traitant';

export interface DailyMedicationItem {
  id?: string;
  name: string;
  taken: boolean;
  dosage: string;
}

export interface MedicationDefinition {
  id: string;
  name: string;
  defaultDosage: string;
  isPrechecked: boolean;
  isActive: boolean;
  category: 'supplement' | 'medication';
  displayOrder: number;
}

export type FatigueLevel = 'normal' | 'légère' | 'modérée' | 'importante';

export interface DailyLog {
  id?: string;
  date: string; // YYYY-MM-DD
  anxietyScore: number | null; // 0 to 10
  lumpInThroat: boolean; // Boule dans la gorge
  conflictWithHusband: boolean; // Grosses disputes avec mon mari
  hairLossAmount: number | null; // Chute de cheveux en nombre estimé
  haircutDone: boolean;
  haircutNotes: string;
  hairWashDone: boolean;
  shampooType: ShampooType | null;
  hennaDone: boolean;
  sleepHours: number | null;
  fatigueLevel: FatigueLevel | null;
  notes?: string;
  medications: DailyMedicationItem[];
  updatedAt?: string;
}

export interface LabMarkerDefinition {
  id: string;
  code: string;
  name: string;
  minFunctional: number;
  maxFunctional: number;
  unit: string;
  description: string;
  displayOrder: number;
  hidden?: boolean;
}

export interface LabTestValue {
  markerId: string;
  markerCode: string;
  markerName: string;
  value: number;
  unit: string;
}

export interface LabTest {
  id: string;
  date: string; // YYYY-MM-DD
  notes: string;
  values: Record<string, number>; // markerId -> value
  createdAt?: string;
}

export interface CalendarDaySummary {
  date: string;
  hasLog: boolean;
  anxietyScore: number | null;
  hasLumpInThroat: boolean;
  hasConflict: boolean;
  hairLossAmount: number | null;
  haircutDone: boolean;
  hairWashDone: boolean;
  shampooType: ShampooType | null;
  hennaDone: boolean;
  medsTakenCount: number;
  hasBloodTest: boolean;
}

export type TreatmentType = 'fond' | 'cure';

export interface PlannedBloodTest {
  date: string;
  markerCodes: string[];
}

export interface TreatmentPlan {
  id: string;
  type: TreatmentType;
  name: string;
  description?: string;
  dosage: string;
  startDate: string;
  endDate?: string;
  plannedBloodTest?: PlannedBloodTest;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type CalendarFilterType =
  | 'all'
  | 'haircut'
  | 'wash'
  | 'henna'
  | 'meds'
  | 'anxiety'
  | 'conflict'
  | 'hairLoss'
  | 'bloodTest';
