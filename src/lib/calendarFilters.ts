// Filtres du calendrier : catégories, sous-filtres et éléments présents un jour donné.
// Fonctions pures, sans dépendance UI ni stockage.
import { DailyLog, MedicationDefinition } from '../types';
import { CategoryColors, HairItemColors, SubItemColors } from '../constants/theme';
import { SHAMPOO_OPTIONS } from '../constants/hairCare';
import { hasFlow } from './cycle';
import { normalizeSearch } from './labStatus';

export type CalendarCategory = 'cycle' | 'meds' | 'hair' | 'emotion' | 'sleep' | 'blood';
export type CategoryFilter = 'all' | CalendarCategory;

/** Ordre d'affichage des catégories (filtres et légende). */
export const CATEGORY_ORDER: CalendarCategory[] = ['cycle', 'meds', 'hair', 'emotion', 'sleep', 'blood'];

export const CATEGORY_LABELS: Record<CalendarCategory, { chip: string; legend: string }> = {
  cycle: { chip: 'Cycle', legend: 'Règles' },
  meds: { chip: 'Traitements', legend: 'Traitements' },
  hair: { chip: 'Cheveux', legend: 'Cheveux' },
  emotion: { chip: 'Émotionnel', legend: 'Émotionnel' },
  sleep: { chip: 'Fatigue', legend: 'Sommeil & fatigue' },
  blood: { chip: 'Bilan', legend: 'Bilan sanguin' },
};

export interface SubFilter {
  key: string;
  label: string;
  color: string;
  /** « band » : affiché en fond de jour (règles prévues), pas en pastille. */
  swatch?: 'dot' | 'band';
}

/** Élément présent un jour donné (une pastille potentielle). */
export interface DayItem {
  category: CalendarCategory;
  key: string;
  color: string;
}

export const PREDICTED_KEY = 'predicted';

/** Clé de comparaison d'un traitement : les journaux ne stockent que le nom. */
export const medKey = (name: string) => normalizeSearch(name);
export const medItemKey = (name: string) => `med:${medKey(name)}`;

const STATIC_SUB_FILTERS: Record<Exclude<CalendarCategory, 'meds'>, SubFilter[]> = {
  cycle: [
    { key: 'flow', label: 'Règles', color: CategoryColors.cycle },
    { key: 'pain', label: 'Douleur', color: '#8E4EC6' },
    { key: 'end', label: 'Fin des règles', color: '#F76B15' },
    { key: PREDICTED_KEY, label: 'Règles prévues', color: CategoryColors.cycle, swatch: 'band' },
  ],
  hair: [
    { key: 'wash', label: 'Cheveux lavés', color: HairItemColors.wash },
    ...SHAMPOO_OPTIONS.map((o, i) => ({
      key: `shampoo:${o.id}`,
      label: o.label,
      color: ['#FFB224', '#30A46C', '#E5484D', '#8E4EC6'][i % 4],
    })),
    { key: 'loss', label: 'Chute', color: HairItemColors.loss },
    { key: 'haircut', label: 'Coupe', color: HairItemColors.haircut },
    { key: 'henna', label: 'Henné', color: HairItemColors.henna },
  ],
  emotion: [
    { key: 'anxiety', label: 'Anxiété ≥ 5', color: '#F76B15' },
    { key: 'lump', label: 'Boule dans la gorge', color: '#8E4EC6' },
    { key: 'conflict', label: 'Dispute', color: '#E5484D' },
  ],
  sleep: [
    { key: 'sleep', label: 'Sommeil renseigné', color: '#3E63DD' },
    { key: 'fatigue_moderate', label: 'Fatigue modérée', color: '#FFB224' },
    { key: 'fatigue_high', label: 'Fatigue importante', color: '#E5484D' },
  ],
  blood: [{ key: 'labtest', label: 'Prise de sang', color: CategoryColors.blood }],
};

export interface CalendarFilters {
  subFilters: Record<CalendarCategory, SubFilter[]>;
  /** Traitements masqués du calendrier (clé `medKey`). */
  hiddenMeds: Set<string>;
}

/** Sous-filtres de chaque catégorie ; ceux des traitements dépendent des réglages de chaque traitement. */
export function buildCalendarFilters(medications: MedicationDefinition[]): CalendarFilters {
  const hiddenMeds = new Set(medications.filter((m) => m.showInCalendar === false).map((m) => medKey(m.name)));
  const meds = new Map<string, SubFilter>();
  [...medications]
    .filter((m) => m.showInCalendar !== false)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .forEach((m) => {
      const key = medItemKey(m.name);
      if (!meds.has(key)) meds.set(key, { key, label: m.name, color: SubItemColors[meds.size % SubItemColors.length] });
    });
  return { subFilters: { ...STATIC_SUB_FILTERS, meds: [...meds.values()] }, hiddenMeds };
}

/** Éléments présents un jour donné, dans l'ordre des catégories. Les règles prévues sont gérées à part. */
export function dayItems(log: DailyLog | undefined, hasBlood: boolean, filters: CalendarFilters): DayItem[] {
  const colorOf = (category: CalendarCategory, key: string) =>
    filters.subFilters[category].find((s) => s.key === key)?.color ?? CategoryColors[category];
  const items: DayItem[] = [];
  const add = (category: CalendarCategory, key: string) => items.push({ category, key, color: colorOf(category, key) });

  if (log) {
    if (hasFlow(log)) add('cycle', 'flow');
    if (hasFlow(log) && log.menstrualPain) add('cycle', 'pain');
    if (log.menstrualEndedAt != null) add('cycle', 'end');

    const seenMeds = new Set<string>();
    for (const m of log.medications ?? []) {
      const k = medKey(m.name);
      if (!m.taken || filters.hiddenMeds.has(k) || seenMeds.has(k)) continue;
      seenMeds.add(k);
      add('meds', medItemKey(m.name));
    }

    if (log.hairWashDone) {
      add('hair', 'wash');
      if (log.shampooType) add('hair', `shampoo:${log.shampooType}`);
    }
    if (log.hairLossAmount != null) add('hair', 'loss');
    if (log.haircutDone) add('hair', 'haircut');
    if (log.hennaDone) add('hair', 'henna');

    if ((log.anxietyScore ?? 0) >= 5) add('emotion', 'anxiety');
    if (log.lumpInThroat) add('emotion', 'lump');
    if (log.conflictWithHusband) add('emotion', 'conflict');

    if (log.sleepHours != null) add('sleep', 'sleep');
    if (log.fatigueLevel === 'modérée') add('sleep', 'fatigue_moderate');
    if (log.fatigueLevel === 'importante') add('sleep', 'fatigue_high');
  }
  if (hasBlood) add('blood', 'labtest');
  return items;
}

/** Sélection courante : une catégorie et, à l'intérieur, zéro (= tous) ou plusieurs sous-filtres. */
export interface FilterSelection {
  category: CategoryFilter;
  subKeys: string[];
}

export function isShown(sel: FilterSelection, category: CalendarCategory, key: string): boolean {
  if (sel.category === 'all') return true;
  if (sel.category !== category) return false;
  return sel.subKeys.length === 0 || sel.subKeys.includes(key);
}

/** Catégories distinctes présentes, dans l'ordre d'affichage. */
export function categoriesOf(items: DayItem[]): CalendarCategory[] {
  return CATEGORY_ORDER.filter((c) => items.some((i) => i.category === c));
}

/**
 * Pastilles d'un jour : une par catégorie en vue « Tout »,
 * une par sous-élément affiché quand une catégorie est choisie.
 */
export function dayDots(items: DayItem[], sel: FilterSelection): { key: string; color: string }[] {
  if (sel.category === 'all') return categoriesOf(items).map((c) => ({ key: c, color: CategoryColors[c] }));
  return items.filter((i) => isShown(sel, i.category, i.key)).map((i) => ({ key: i.key, color: i.color }));
}
