import { LabMarkerDefinition, LabTest } from '../types';
import { daysBetween, shiftMonthsIso } from './dates';

export type LabStatus = 'low' | 'high' | 'ok' | 'none';

/** Délai de contrôle quand la dernière valeur est hors norme. */
export const OUT_OF_RANGE_RECHECK_MONTHS = 3;

export function statusOf(value: number | undefined, m: LabMarkerDefinition): LabStatus {
  if (value === undefined) return 'none';
  if (value < m.minFunctional) return 'low';
  if (value > m.maxFunctional) return 'high';
  return 'ok';
}

/** Dernière valeur connue pour chaque molécule (clé = id de la molécule). */
export function latestValues(tests: LabTest[]): Map<string, { value: number; date: string }> {
  const latest = new Map<string, { value: number; date: string }>();
  [...tests]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((t) => {
      Object.entries(t.values).forEach(([id, v]) => {
        if (!latest.has(id) && typeof v === 'number') latest.set(id, { value: v, date: t.date });
      });
    });
  return latest;
}

export type RecheckReminder = {
  marker: LabMarkerDefinition;
  last: { date: string; value: number } | null;
  status: LabStatus;
  /** Intervalle appliqué : 3 mois si hors norme, sinon la fréquence choisie. */
  months: number | null;
  dueDate: string | null;
  daysLeft: number | null;
  due: boolean;
};

/** Rappels de contrôle pour les molécules dont une fréquence de suivi est définie. */
export function computeRecheckReminders(
  tests: LabTest[],
  markers: LabMarkerDefinition[],
  today: string,
): RecheckReminder[] {
  const latest = latestValues(tests);
  return markers
    .filter((m) => m.recheckMonths)
    .map((marker) => {
      const last = latest.get(marker.id) ?? null;
      const status = statusOf(last?.value, marker);
      if (!last) {
        return { marker, last, status, months: null, dueDate: null, daysLeft: null, due: true };
      }
      const months = status === 'ok' ? marker.recheckMonths! : OUT_OF_RANGE_RECHECK_MONTHS;
      const dueDate = shiftMonthsIso(last.date, months);
      const daysLeft = daysBetween(today, dueDate);
      return { marker, last, status, months, dueDate, daysLeft, due: daysLeft <= 0 };
    })
    .sort((a, b) => (a.daysLeft ?? -Infinity) - (b.daysLeft ?? -Infinity));
}

/** Recherche insensible à la casse et aux accents. */
export function normalizeSearch(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
