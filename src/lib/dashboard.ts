// Calculs de l'accueil : fonctions pures, sans affichage, à partir des données déjà chargées.

import { DailyLog, PlannedCheckup, ShampooType } from '../types';
import { hasFlow } from './cycle';
import { dayShort, daysBetween, shiftIso } from './dates';
import type { RecheckReminder } from './labStatus';

/** Horizon des rendez-vous et prises de sang affichés dans « À venir ». */
export const HOME_HORIZON_DAYS = 30;

/** Nombre de saisies de chute affichées dans le graphique. */
export const HAIR_CHART_POINTS = 8;

export const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Journaux compris entre `from` et `to` inclus. */
const between = (logs: DailyLog[], from: string, to: string) => logs.filter((l) => l.date >= from && l.date <= to);

const values = (logs: DailyLog[], pick: (l: DailyLog) => number | null | undefined) =>
  logs.map(pick).filter((v): v is number => v != null);

/**
 * Vrai si la journée a été réellement notée. Un journal créé seulement pour déclarer la fin des
 * règles (bouton « Règles arrêtées » de l'accueil) ne compte pas.
 */
export function isDayLogged(log: DailyLog | undefined): boolean {
  if (!log) return false;
  return !!(
    log.anxietyScore != null ||
    log.hairLossAmount != null ||
    log.sleepHours != null ||
    log.fatigueLevel != null ||
    log.menstrualFlow != null ||
    log.lumpInThroat ||
    log.conflictWithHusband ||
    log.haircutDone ||
    log.hairWashDone ||
    log.hennaDone ||
    log.notes?.trim() ||
    log.medications.length > 0
  );
}

// ─── Chute de cheveux ───────────────────────────────────────────────────────

export type HairLossSummary = {
  /** Moyenne des 7 derniers jours, null si aucune saisie. */
  avg: number | null;
  /** Nombre de jours notés sur les 7 derniers jours. */
  days: number;
  /** Écart arrondi avec la moyenne des 7 jours précédents, null si une des deux semaines est vide. */
  delta: number | null;
};

export function hairLossSummary(logs: DailyLog[], today: string): HairLossSummary {
  const current = values(between(logs, shiftIso(today, -6), today), (l) => l.hairLossAmount);
  const previous = values(between(logs, shiftIso(today, -13), shiftIso(today, -7)), (l) => l.hairLossAmount);
  const avg = average(current);
  const prevAvg = average(previous);
  return {
    avg,
    days: current.length,
    delta: avg !== null && prevAvg !== null ? Math.round(avg - prevAvg) : null,
  };
}

export type HairChartPoint = { value: number; label: string; menstrual: boolean };

/** Dernières estimations de chute (journaux triés par date croissante). */
export function hairChartPoints(logs: DailyLog[], count = HAIR_CHART_POINTS): HairChartPoint[] {
  return logs
    .filter((l) => l.hairLossAmount != null)
    .slice(-count)
    .map((l) => ({
      value: l.hairLossAmount as number,
      label: `${l.date.slice(8)}/${l.date.slice(5, 7)}`,
      menstrual: hasFlow(l),
    }));
}

// ─── Disputes ───────────────────────────────────────────────────────────────

/** Dernière grosse dispute de tout l'historique (journaux triés par date croissante). */
export function findLastConflict(logs: DailyLog[], today: string): DailyLog | undefined {
  return logs.findLast((l) => l.conflictWithHusband && l.date <= today);
}

// ─── Semaine ────────────────────────────────────────────────────────────────

export type WeekDay = { date: string; label: string; score: number | null };

export type WeekSummary = {
  days: WeekDay[];
  /** Jour le plus anxieux (score ≥ 5), null sinon. */
  peak: WeekDay | null;
  avgAnxiety: number | null;
  /** Heures de sommeil moyennes sur les nuits notées. */
  avgSleep: number | null;
  throatDays: number;
  conflictDays: number;
};

/** Les 7 derniers jours, aujourd'hui compris. */
export function weekSummary(logs: DailyLog[], today: string): WeekSummary {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = shiftIso(today, i - 6);
    return { date, label: dayShort(date), score: byDate.get(date)?.anxietyScore ?? null };
  });
  const peak = days.reduce<WeekDay | null>(
    (best, d) => (d.score !== null && d.score >= 5 && (!best || d.score > (best.score ?? 0)) ? d : best),
    null
  );
  const week = between(logs, shiftIso(today, -6), today);
  return {
    days,
    peak,
    avgAnxiety: average(values(week, (l) => l.anxietyScore)),
    avgSleep: average(values(week, (l) => l.sleepHours)),
    throatDays: week.filter((l) => l.lumpInThroat).length,
    conflictDays: week.filter((l) => l.conflictWithHusband).length,
  };
}

// ─── Soins capillaires ──────────────────────────────────────────────────────

export type HairCareHistory = {
  wash: { date: string; shampoo: ShampooType | null } | null;
  henna: string | null;
  haircut: string | null;
};

/** Derniers lavage, henné et coupe notés (journaux triés par date croissante). */
export function lastHairCare(logs: DailyLog[], today: string): HairCareHistory {
  const past = logs.filter((l) => l.date <= today);
  const wash = past.findLast((l) => l.hairWashDone);
  return {
    wash: wash ? { date: wash.date, shampoo: wash.shampooType } : null,
    henna: past.findLast((l) => l.hennaDone)?.date ?? null,
    haircut: past.findLast((l) => l.haircutDone)?.date ?? null,
  };
}

// ─── À venir ────────────────────────────────────────────────────────────────

export type UpcomingAgenda = {
  /** Rendez-vous non faits, en retard ou dans l'horizon, du plus proche au plus lointain. */
  planned: PlannedCheckup[];
  /** Prises de sang à prévoir dans l'horizon, hors molécules déjà couvertes par un rendez-vous. */
  checks: RecheckReminder[];
  /** Date du premier élément au-delà de l'horizon, null s'il n'y en a pas. */
  nextLater: string | null;
};

export function upcomingAgenda(
  checkups: PlannedCheckup[],
  reminders: RecheckReminder[],
  today: string,
  horizon = HOME_HORIZON_DAYS
): UpcomingAgenda {
  const pending = checkups.filter((c) => !c.done).sort((a, b) => a.date.localeCompare(b.date));
  // Une molécule déjà planifiée n'a pas besoin d'un rappel en plus
  const plannedCodes = new Set(pending.filter((c) => c.kind === 'blood').flatMap((c) => c.markerCodes));
  const uncovered = reminders.filter((r) => !plannedCodes.has(r.marker.code));

  const inHorizon = (date: string) => daysBetween(today, date) <= horizon;
  const later = [
    ...pending.filter((c) => !inHorizon(c.date)).map((c) => c.date),
    ...uncovered.filter((r) => r.dueDate && !r.due && !inHorizon(r.dueDate)).map((r) => r.dueDate as string),
  ].sort();

  return {
    planned: pending.filter((c) => inHorizon(c.date)),
    // Sans date (aucun résultat enregistré) ou en retard : toujours affichée
    checks: uncovered.filter((r) => r.due || r.dueDate === null || inHorizon(r.dueDate)),
    nextLater: later[0] ?? null,
  };
}
