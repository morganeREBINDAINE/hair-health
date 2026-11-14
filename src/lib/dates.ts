// Les dates de l'app sont des chaînes « AAAA-MM-JJ » issues de toISOString() (UTC).
// Ces helpers restent en UTC pour ne jamais décaler d'un jour.

export const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
export const DAY_LONG = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export const todayIso = () => new Date().toISOString().slice(0, 10);

/** Heure locale actuelle « HH:MM ». */
export const currentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const parse = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function shiftIso(iso: string, delta: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Ajoute `months` mois (le jour est ramené au dernier jour du mois si besoin : 31/01 + 1 → 28/02). */
export function shiftMonthsIso(iso: string, months: number): string {
  const d = parse(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

export const weekdayIndex = (iso: string) => parse(iso).getUTCDay();
export const dayShort = (iso: string) => DAY_SHORT[weekdayIndex(iso)];
export const dayNum = (iso: string) => iso.slice(8, 10);
export const monthTitle = (iso: string) => `${MONTHS[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`;

/** « Vendredi 02 Octobre » */
export const longDay = (iso: string) =>
  `${DAY_LONG[weekdayIndex(iso)]} ${dayNum(iso)} ${MONTHS[parseInt(iso.slice(5, 7), 10) - 1]}`;

/** « 02/10/2026 » */
export const frDate = (iso: string) => iso.split('-').reverse().join('/');

/** « 02/10/26 » */
export const frDateShort = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;

export const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((parse(toIso).getTime() - parse(fromIso).getTime()) / 86400000);

/** Ancienneté lisible d'un nombre de jours écoulés : « Aujourd'hui », « Hier », « Il y a 5 jours », « Il y a 3 mois ». */
export function relativeDays(days: number): string {
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 45) return `Il y a ${days} jours`;
  if (days < 365) return `Il y a ${Math.round(days / 30.44)} mois`;
  const years = Math.floor(days / 365);
  return `Il y a ${years} an${years > 1 ? 's' : ''}`;
}

/** Lundi de la semaine contenant `iso`. */
export function weekStart(iso: string): string {
  const wd = weekdayIndex(iso);
  return shiftIso(iso, wd === 0 ? -6 : 1 - wd);
}
