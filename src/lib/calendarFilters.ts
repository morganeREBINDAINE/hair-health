// Filtres du calendrier : catégories, sous-filtres et éléments présents un jour donné.
// Fonctions pures, sans dépendance UI ni stockage.
import { DailyLog, MedicationDefinition } from '../types';
import { CategoryColors, HairItemColors, SubItemColors } from '../constants/theme';
import { SHAMPOO_OPTIONS } from '../constants/hairCare';
import { hasMenstrualData } from './cycle';
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
  sleep: { chip: 'Sommeil', legend: 'Sommeil' },
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
  /**
   * Élément discret (ex. « Pas lavés ») : ignoré en vue « Tout » (ni pastille, ni compte, ni carte),
   * affiché seulement quand sa catégorie est choisie.
   */
  passive?: boolean;
}

export const PREDICTED_KEY = 'predicted';
export const PERIOD_KEY = 'period';
export const WASH_KEY = 'wash';
export const UNWASHED_KEY = 'unwashed';

/** Clé de comparaison d'un traitement : les journaux ne stockent que le nom. */
export const medKey = (name: string) => normalizeSearch(name);
export const medItemKey = (name: string) => `med:${medKey(name)}`;

/** Tranche de sommeil : jusqu'à 6 h, plus de 6 h jusqu'à 8 h inclus, plus de 8 h. */
export const sleepKey = (hours: number) => (hours <= 6 ? 'sleep_short' : hours <= 8 ? 'sleep_mid' : 'sleep_long');

const SHAMPOO_COLORS = ['#FFB224', '#30A46C', '#E5484D', '#8E4EC6'];

/** Sous-filtres proposés sous chaque catégorie (le cycle n'en a pas). */
const STATIC_SUB_FILTERS: Record<Exclude<CalendarCategory, 'meds'>, SubFilter[]> = {
  cycle: [],
  hair: [
    { key: UNWASHED_KEY, label: 'Pas lavés', color: HairItemColors.unwashed },
    ...SHAMPOO_OPTIONS.map((o, i) => ({
      key: `shampoo:${o.id}`,
      label: o.label,
      color: SHAMPOO_COLORS[i % SHAMPOO_COLORS.length],
    })),
    { key: 'haircut', label: 'Coupe', color: HairItemColors.haircut },
    { key: 'henna', label: 'Henné', color: HairItemColors.henna },
  ],
  emotion: [
    { key: 'anxiety', label: 'Anxiété ≥ 5', color: '#F76B15' },
    { key: 'lump', label: 'Boule dans la gorge', color: '#8E4EC6' },
    { key: 'conflict', label: 'Dispute', color: '#E5484D' },
  ],
  sleep: [
    { key: 'sleep_short', label: '6 h et −', color: '#E5484D' },
    { key: 'sleep_mid', label: '7 à 8 h', color: '#3E63DD' },
    { key: 'sleep_long', label: '8 h et +', color: '#30A46C' },
  ],
  blood: [{ key: 'labtest', label: 'Prise de sang', color: CategoryColors.blood }],
};

/** Légende du cycle quand il est choisi : sans sous-filtre, juste les règles et leur prévision. */
const CYCLE_LEGEND: SubFilter[] = [
  { key: PERIOD_KEY, label: 'Règles', color: CategoryColors.cycle },
  { key: PREDICTED_KEY, label: 'Règles prévues', color: CategoryColors.cycle, swatch: 'band' },
];

/** Couleurs des éléments sans sous-filtre (lavage sans type de shampoing précisé). */
const EXTRA_COLORS: Record<string, string> = {
  [PERIOD_KEY]: CategoryColors.cycle,
  [WASH_KEY]: HairItemColors.wash,
};

export interface CalendarFilters {
  /** Sous-filtres sélectionnables (vide = pas de deuxième rangée). */
  subFilters: Record<CalendarCategory, SubFilter[]>;
  /** Légende affichée quand la catégorie est choisie. */
  legend: Record<CalendarCategory, SubFilter[]>;
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
  const subFilters = { ...STATIC_SUB_FILTERS, meds: [...meds.values()] };
  return { subFilters, legend: { ...subFilters, cycle: CYCLE_LEGEND }, hiddenMeds };
}

/** Éléments présents un jour donné, dans l'ordre des catégories. Les règles prévues sont gérées à part. */
export function dayItems(log: DailyLog | undefined, hasBlood: boolean, filters: CalendarFilters): DayItem[] {
  const colorOf = (category: CalendarCategory, key: string) =>
    filters.subFilters[category].find((s) => s.key === key)?.color ?? EXTRA_COLORS[key] ?? CategoryColors[category];
  const items: DayItem[] = [];
  const add = (category: CalendarCategory, key: string, passive?: boolean) =>
    items.push({ category, key, color: colorOf(category, key), ...(passive && { passive }) });

  if (log) {
    if (hasMenstrualData(log)) add('cycle', PERIOD_KEY);

    const seenMeds = new Set<string>();
    for (const m of log.medications ?? []) {
      const k = medKey(m.name);
      if (!m.taken || filters.hiddenMeds.has(k) || seenMeds.has(k)) continue;
      seenMeds.add(k);
      add('meds', medItemKey(m.name));
    }

    // La chute de cheveux n'est pas une pastille : elle reste visible dans le détail du jour
    if (log.hairWashDone) add('hair', log.shampooType ? `shampoo:${log.shampooType}` : WASH_KEY);
    else add('hair', UNWASHED_KEY, true);
    if (log.haircutDone) add('hair', 'haircut');
    if (log.hennaDone) add('hair', 'henna');

    if ((log.anxietyScore ?? 0) >= 5) add('emotion', 'anxiety');
    if (log.lumpInThroat) add('emotion', 'lump');
    if (log.conflictWithHusband) add('emotion', 'conflict');

    // La fatigue n'est pas une pastille : elle reste visible dans le détail du jour
    if (log.sleepHours != null) add('sleep', sleepKey(log.sleepHours));
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

/** Vrai si l'élément est affiché pour la sélection (les éléments discrets sont ignorés en vue « Tout »). */
export function isItemShown(sel: FilterSelection, item: DayItem): boolean {
  if (item.passive && sel.category === 'all') return false;
  return isShown(sel, item.category, item.key);
}

/** Catégories distinctes présentes (hors éléments discrets), dans l'ordre d'affichage. */
export function categoriesOf(items: DayItem[]): CalendarCategory[] {
  return CATEGORY_ORDER.filter((c) => items.some((i) => i.category === c && !i.passive));
}

/**
 * Pastilles d'un jour : une par catégorie en vue « Tout »,
 * une par sous-élément affiché quand une catégorie est choisie.
 */
export function dayDots(items: DayItem[], sel: FilterSelection): { key: string; color: string }[] {
  if (sel.category === 'all') return categoriesOf(items).map((c) => ({ key: c, color: CategoryColors[c] }));
  return items.filter((i) => isItemShown(sel, i)).map((i) => ({ key: i.key, color: i.color }));
}

/** Dernier jour de lavage strictement avant `iso`, null si aucun. */
export function lastWashBefore(logs: Record<string, DailyLog>, iso: string): string | null {
  let last: string | null = null;
  for (const [date, log] of Object.entries(logs)) {
    if (log.hairWashDone && date < iso && (!last || date > last)) last = date;
  }
  return last;
}
