import { ShampooType } from '../types';

/** Types de shampoing proposés dans le journal, dans l'ordre d'affichage. */
export const SHAMPOO_OPTIONS: { id: ShampooType; label: string }[] = [
  { id: 'bebe', label: 'Shampoing bébé' },
  { id: 'sans_sulfate', label: 'Sans sulfate' },
  { id: 'avec_sulfate', label: 'Avec sulfate' },
  { id: 'traitant', label: 'Traitant' },
];

export const shampooLabel = (type: ShampooType | null) => SHAMPOO_OPTIONS.find((o) => o.id === type)?.label ?? null;
