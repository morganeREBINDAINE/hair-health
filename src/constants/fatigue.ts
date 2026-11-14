import { FatigueLevel } from '../types';

/** Niveaux de fatigue proposés dans le journal, du moins au plus fatigué. */
export const FATIGUE_OPTIONS: { id: FatigueLevel; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'légère', label: 'Légère' },
  { id: 'modérée', label: 'Modérée' },
  { id: 'importante', label: 'Importante' },
];

/** Libellé d'un niveau de fatigue pris isolément (ex. état moyen de la semaine). */
export const FATIGUE_SUMMARY: Record<FatigueLevel, string> = {
  normal: 'Pas de fatigue',
  légère: 'Fatigue légère',
  modérée: 'Fatigue modérée',
  importante: 'Fatigue importante',
};
