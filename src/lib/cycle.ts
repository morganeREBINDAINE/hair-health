// Logique du suivi menstruel : reconstitution des périodes et prédiction des prochaines règles.
// Fonctions pures, sans dépendance UI ni stockage.
import { CyclePrediction, CycleStatus, DailyLog, Period } from '../types';
import { daysBetween, shiftIso } from './dates';

/** Durée de cycle utilisée tant qu'aucun cycle complet n'est enregistré. */
export const DEFAULT_CYCLE_LENGTH = 30;
/** Cycles hors de cet intervalle ignorés (souvent un mois non saisi). */
const MIN_CYCLE = 15;
const MAX_CYCLE = 60;
const CYCLES_FOR_AVERAGE = 6;
/** Au-delà, une période sans fin déclarée est considérée terminée (oubli de « Plus de règles »). */
const STALE_PERIOD_DAYS = 10;
export const NOTE_MAX_LENGTH = 140;

export const hasFlow = (log: DailyLog | undefined) => log?.menstrualFlow != null;
export const hasMenstrualData = (log: DailyLog | undefined) => hasFlow(log) || log?.menstrualEndedAt != null;

export function flowLabel(flow: number): string {
  if (flow <= 2) return 'Très léger';
  if (flow <= 4) return 'Léger';
  if (flow <= 6) return 'Modéré';
  if (flow <= 8) return 'Abondant';
  return 'Très abondant';
}

/** Périodes triées par date de début, reconstituées à partir des cases « Règles aujourd'hui » / « Plus de règles ». */
export function getPeriods(logs: Record<string, DailyLog>): Period[] {
  const periods: Period[] = [];
  let current: Period | null = null;

  const dates = Object.keys(logs)
    .filter((d) => hasMenstrualData(logs[d]))
    .sort();

  for (const date of dates) {
    const log = logs[date];
    // Fin oubliée : un flux très éloigné du précédent ouvre une nouvelle période
    if (current && hasFlow(log) && daysBetween(current.lastFlowDay, date) > STALE_PERIOD_DAYS) {
      periods.push(current);
      current = null;
    }
    if (hasFlow(log)) {
      if (!current) current = { start: date, lastFlowDay: date, end: null };
      else current.lastFlowDay = date;
    }
    // Une fin sans période ouverte (début non saisi) est ignorée
    if (log.menstrualEndedAt != null && current) {
      current.end = date;
      periods.push(current);
      current = null;
    }
  }
  if (current) periods.push(current);
  return periods;
}

export function predictNextPeriod(periods: Period[]): CyclePrediction | null {
  if (periods.length === 0) return null;

  const cycles: number[] = [];
  for (let i = 1; i < periods.length; i++) {
    const len = daysBetween(periods[i - 1].start, periods[i].start);
    if (len >= MIN_CYCLE && len <= MAX_CYCLE) cycles.push(len);
  }
  const recent = cycles.slice(-CYCLES_FOR_AVERAGE);

  let avg = DEFAULT_CYCLE_LENGTH;
  let margin = 1;
  if (recent.length > 0) {
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const std = Math.sqrt(recent.reduce((a, b) => a + (b - mean) ** 2, 0) / recent.length);
    avg = Math.round(mean);
    margin = Math.min(3, Math.max(1, Math.round(std)));
  }

  const nextStart = shiftIso(periods[periods.length - 1].start, avg);
  return {
    nextStart,
    windowStart: shiftIso(nextStart, -margin),
    windowEnd: shiftIso(nextStart, margin),
    avgCycleLength: avg,
    isEstimate: recent.length < 2,
  };
}

/**
 * Situation du cycle à une date donnée.
 * - Journal (`includeDate` faux) : seules les règles commencées avant la date comptent, pour savoir
 *   s'il faut proposer la saisie ce jour-là indépendamment de ce qui y est déjà noté.
 * - Accueil (`includeDate` vrai) : la saisie du jour est prise en compte (règles commencées ou finies aujourd'hui).
 */
export function getCycleStatus(
  logs: Record<string, DailyLog>,
  date: string,
  { includeDate = false }: { includeDate?: boolean } = {}
): CycleStatus {
  const periods = getPeriods(logs).filter((p) => (includeDate ? p.start <= date : p.start < date));
  if (periods.length === 0) return { kind: 'none' };

  const last = periods[periods.length - 1];
  const open = last.end === null || (includeDate ? last.end > date : last.end >= date);
  if (open && daysBetween(last.lastFlowDay, date) <= STALE_PERIOD_DAYS) {
    return { kind: 'ongoing', period: last, day: daysBetween(last.start, date) + 1 };
  }

  const prediction = predictNextPeriod(periods)!;
  if (date < prediction.windowStart) {
    return { kind: 'upcoming', prediction, daysUntil: daysBetween(date, prediction.nextStart) };
  }
  if (date <= prediction.windowEnd) return { kind: 'window', prediction };
  return { kind: 'late', prediction, daysLate: daysBetween(prediction.nextStart, date) };
}

/** La carte « Cycle menstruel » du journal n'est proposée qu'au bon moment. */
export function shouldShowCycleCard(logs: Record<string, DailyLog>, date: string): boolean {
  if (hasMenstrualData(logs[date])) return true;
  const status = getCycleStatus(logs, date);
  return status.kind === 'ongoing' || status.kind === 'window' || status.kind === 'late';
}

/** Valide une heure « H:MM » ou « HH:MM » et la renvoie normalisée, sinon null. */
export function normalizeTime(value: string): string | null {
  const m = /^([01]?\d|2[0-3])[:hH]([0-5]\d)$/.exec(value.trim());
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}
