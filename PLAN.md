# Plan — Suivi menstruel & prédiction des prochaines règles

> Statut : **en attente de validation**. Aucun code n'est modifié avant ton feu vert.

## 1. Objectif

- Pendant chaque jour de règles, noter :
  - le **flux** sur une échelle de **1 à 10** ;
  - une **petite note** libre ;
  - la **douleur** : présente / absente.
- Déduire automatiquement les périodes de règles et **prédire la date des prochaines règles**.
- Afficher ces informations dans le journal, le calendrier, l'accueil et l'export Excel.

## 2. État actuel du code (audit)

| Élément | Constat |
|---|---|
| Saisie | `src/components/DailyEntryForm.tsx` : formulaire en cartes (`Card` + `SectionHeader`), un seul bouton « Enregistrer la journée » avec loader (`saving`). L'échelle 0–10 de l'anxiété (boutons ronds) est réutilisable pour le flux. |
| Persistance | `src/services/storageService.ts` : cloud-first conforme à `docs/STORAGE.md` (Supabase d'abord, puis cache AsyncStorage). `saveDailyLog` fait un `upsert` sur `daily_logs` (`unique(user_id, date)`), `syncFromCloud` reconstruit le cache. |
| Schéma | `supabase_setup.sql` : table `daily_logs` avec RLS par `user_id`. |
| Calendrier | `src/app/calendar.tsx` : pastilles par catégorie (`dayCategories`) + filtres (`CATEGORIES`), couleurs dans `CategoryColors` (`src/constants/theme.ts`). |
| Accueil | `src/app/index.tsx` : cartes « bento » et rappels (bilans, traitements). |
| Export | `src/services/excelService.ts` : une ligne par `DailyLog`. |
| Dates | `src/lib/dates.ts` : helpers UTC (`shiftIso`, `daysBetween`, `frDate`…), à réutiliser pour les calculs de cycle. |
| Erreurs | Toast global `src/lib/toast.ts` (3 s), erreurs de formulaire affichées dans l'écran. |

## 3. Choix architecturaux à valider

### Choix A — Modèle de données

**Option A1 (recommandée) : 3 colonnes dans `daily_logs`**

```sql
alter table public.daily_logs
  add column if not exists menstrual_flow int check (menstrual_flow between 1 and 10),
  add column if not exists menstrual_pain boolean,
  add column if not exists menstrual_note text default '';
```

- `menstrual_flow = null` → pas de règles ce jour-là ; `1..10` → jour de règles.
- ✅ Une seule requête `upsert` atomique avec le reste de la journée (pas d'état partiel si le réseau coupe).
- ✅ Réutilise tel quel la synchro, le cache, le calendrier et l'export.
- ⚠️ Saisir uniquement les règles un jour crée une entrée de journal (compte dans la série de jours consécutifs) — comportement plutôt cohérent.

**Option A2 : table dédiée `menstrual_days`** (`user_id, date, flow, pain, note`, `unique(user_id, date)`, RLS)

- ✅ Domaine isolé, extensible (symptômes, contraception, ovulation…).
- ❌ Nouvelle clé de cache, nouvelle synchro, nouvelle méthode d'écriture ; si la saisie reste dans le journal du jour, il faut 2 requêtes (journal + règles) → risque d'état partiel, ou un 2ᵉ bouton d'enregistrement.

### Choix B — Emplacement de la saisie

**Option B1 (recommandée) : nouvelle carte « Cycle menstruel » dans le journal du jour** (`DailyEntryForm`)

- Interrupteur « Règles aujourd'hui ». Activé → affiche l'échelle de flux 1–10, le choix douleur (Présente / Absente) et la note.
- Enregistrée avec le bouton existant « Enregistrer la journée » (même loader, même blocage).

**Option B2 : écran/onglet dédié « Cycle »** avec son propre calendrier et formulaire. La barre d'onglets compte déjà 5 entrées (dont le « + » central) : un 6ᵉ onglet la surchargerait ; il faudrait plutôt un accès depuis l'accueil.

### Choix C — Données insuffisantes pour prédire

- **C1 (recommandée)** : tant qu'il n'y a pas au moins **2 débuts de règles** enregistrés, utiliser une durée de cycle par défaut de **28 jours** et afficher « Estimation (données insuffisantes) ».
- **C2** : ne rien prédire avant 2 cycles et afficher « Enregistre au moins deux cycles pour obtenir une prédiction ».

### Choix D — Activation de la fonctionnalité

- **D1 (recommandée)** : interrupteur « Suivi menstruel » dans Réglages (stocké en local, activé par défaut) pour masquer la carte et la prédiction si besoin.
- **D2** : toujours visible, sans réglage.

## 4. Règles métier (logique de cycle)

Fichier pur, sans dépendance UI : `src/lib/cycle.ts` (testable isolément).

1. **Jours de règles** : journées où `menstrualFlow` est renseigné (1–10).
2. **Regroupement en périodes** : des jours de règles séparés par **2 jours ou moins** sans flux appartiennent à la même période (tolère un oubli de saisie). Une période = `{ start, end, days, maxFlow, painDays }`.
3. **Longueur d'un cycle** = nombre de jours entre deux débuts de période consécutifs. Les valeurs aberrantes (< 15 j ou > 60 j, souvent dues à un mois non saisi) sont ignorées.
4. **Durée de cycle prédite** = moyenne des **6 derniers cycles** valides (arrondie), sinon 28 j (cf. choix C).
5. **Prochain début prédit** = début de la dernière période + durée prédite. Si cette date est déjà passée sans règles saisies → afficher « En retard de X jours ».
6. **Fenêtre d'incertitude** = ± écart-type des cycles (min 1 j, max 5 j), affichée « entre le JJ/MM et le JJ/MM ».
7. **Durée des règles prédite** = moyenne des durées des dernières périodes (défaut 5 j) → sert à griser les jours prévus dans le calendrier.

Fonctions exposées :

```ts
getPeriods(logs: Record<string, DailyLog>): Period[]
predictNextPeriod(periods: Period[], today: string): CyclePrediction | null
// CyclePrediction = { nextStart, windowStart, windowEnd, avgCycleLength, avgPeriodLength,
//                     daysUntil, isLate, isEstimate, cycleDay }
```

## 5. Étapes d'implémentation (avec option A1 + B1 + C1 + D1)

### Étape 1 — Schéma Supabase
- Ajouter les 3 colonnes dans `supabase_setup.sql` (section `daily_logs`).
- Créer `supabase/migrations/2026xxxx_menstrual_tracking.sql` avec l'`alter table` ci-dessus.
- ⚠️ **Action manuelle de ta part** : exécuter ce script dans l'éditeur SQL Supabase avant de tester.

### Étape 2 — Types
- `src/types/index.ts` : ajouter à `DailyLog`
  `menstrualFlow?: number | null; menstrualPain?: boolean | null; menstrualNote?: string;`
  (optionnels pour rester compatibles avec le cache existant).
- Ajouter les types `Period` et `CyclePrediction`.

### Étape 3 — Persistance (`storageService.ts`)
- `saveDailyLog` : envoyer `menstrual_flow`, `menstrual_pain`, `menstrual_note` (null / false / '' quand l'interrupteur est désactivé).
- `syncFromCloud` : mapper les 3 colonnes vers le cache.
- Aucune nouvelle clé AsyncStorage, aucune file d'attente locale (conforme `docs/STORAGE.md`).

### Étape 4 — Logique de cycle
- Créer `src/lib/cycle.ts` (règles de la section 4), en s'appuyant sur `shiftIso` / `daysBetween`.

### Étape 5 — Saisie dans le journal (`DailyEntryForm.tsx`)
- Nouvelle carte « Cycle menstruel » (icône `Droplet` de lucide, couleur dédiée).
- Interrupteur « Règles aujourd'hui » ; pré-activé si la veille avait du flux (suggestion, modifiable).
- Échelle de flux **1 à 10** (même composant visuel que l'anxiété) + badge (Très léger / Léger / Modéré / Abondant / Très abondant).
- Douleur : `Segmented` « Absente / Présente ».
- Note : champ texte multiligne, **140 caractères max** avec compteur.
- Validation affichée sous les champs :
  - règles activées sans flux → « Indique l'intensité du flux (1 à 10). » ;
  - note > 140 caractères → « La note ne doit pas dépasser 140 caractères. »
  - bouton d'enregistrement bloqué tant que le formulaire est invalide.
- Enregistrement : loader et blocage du bouton existants ; erreurs réseau → toast global 3 s, état précédent conservé.

### Étape 6 — Calendrier (`calendar.tsx`)
- Nouvelle catégorie de filtre « Cycle » + couleur `CategoryColors.cycle` dans `theme.ts`.
- Pastille pleine les jours de règles ; jours prédits marqués en pointillé / teinte légère.
- Détail du jour sélectionné : flux X/10, douleur, note.

### Étape 7 — Accueil (`index.tsx`)
- Carte « Prochaines règles » : « dans X jours · vers le JJ/MM » (ou « en cours — jour N », ou « en retard de X jours »), durée moyenne du cycle, mention « Estimation » si données insuffisantes. Tap → journal du jour.

### Étape 8 — Export Excel (`excelService.ts`)
- Colonnes : « Règles (flux /10) », « Douleur règles », « Note règles ».

### Étape 9 — Réglage d'activation (`settings.tsx`)
- Interrupteur « Suivi menstruel » (préférence locale AsyncStorage, par appareil) qui masque la carte, la catégorie calendrier et la carte d'accueil.

### Étape 10 — Vérifications
- `npx expo lint` et `npx tsc --noEmit`.
- Vérification visuelle (preview web) : carte du journal, états de validation, calendrier, carte d'accueil.
- Commit via le skill `commit-feature`.

## 6. Tests manuels (nécessitent internet — à faire par toi)

**Pré-requis** : migration SQL de l'étape 1 exécutée dans Supabase.

### T1 — Saisie d'un jour de règles
1. Ouvrir « Journal du jour ».
2. Activer « Règles aujourd'hui », choisir flux 6, douleur « Présente », note « crampes le matin ».
3. Appuyer sur « Enregistrer la journée ».

**Attendu** : loader sur le bouton, bouton non cliquable pendant l'envoi, puis confirmation ; après redémarrage de l'app, les valeurs sont toujours là.
**Cas d'erreur** : couper le réseau (mode avion) avant d'appuyer → loader puis toast d'erreur pendant 3 s ; en rouvrant la journée, l'ancien état est conservé (rien n'a été enregistré).

### T2 — Validation du formulaire
1. Activer « Règles aujourd'hui » sans choisir de flux.
2. Saisir une note de plus de 140 caractères.

**Attendu** : messages d'erreur sous les champs, bouton d'enregistrement désactivé. Aucune requête envoyée.

### T3 — Prédiction
1. Saisir des règles sur 3–5 jours à partir d'une date il y a ~2 mois, puis idem ~1 mois plus tard, puis ce mois-ci.
2. Ouvrir l'accueil.

**Attendu** : carte « Prochaines règles » avec une date ≈ dernier début + moyenne des cycles, sans la mention « Estimation ». Avec une seule période saisie : mention « Estimation » et cycle de 28 jours.
**Cas d'erreur** : laisser passer la date prédite sans saisie (ou saisir une période plus ancienne) → la carte indique « En retard de X jours ».

### T4 — Synchronisation multi-appareils
1. Saisir un jour de règles sur l'appareil A.
2. Se connecter avec le même compte sur l'appareil B (ou se déconnecter/reconnecter).

**Attendu** : le jour de règles, la note et la douleur apparaissent sur B (journal, calendrier, prédiction identique).
**Cas d'erreur** : couper le réseau pendant la connexion → loader de synchro puis toast d'erreur ; les données en cache restent consultables mais l'enregistrement est refusé avec un message.

### T5 — Désactivation d'un jour de règles
1. Rouvrir un jour de règles enregistré, désactiver l'interrupteur, enregistrer.

**Attendu** : flux/douleur/note effacés dans Supabase, la pastille disparaît du calendrier, la prédiction est recalculée.
**Cas d'erreur** : réseau coupé pendant l'enregistrement → toast d'erreur, le jour reste marqué comme jour de règles.

### T6 — Export
1. Exporter en Excel une plage contenant des jours de règles.

**Attendu** : colonnes « Règles (flux /10) », « Douleur règles », « Note règles » remplies sur les bons jours.

## 7. Questions ouvertes

1. Choix A : colonnes dans `daily_logs` (A1) ou table dédiée (A2) ?
2. Choix B : carte dans le journal (B1) ou écran dédié (B2) ?
3. Choix C : estimation à 28 j (C1) ou pas de prédiction avant 2 cycles (C2) ?
4. Choix D : interrupteur dans Réglages (D1) ou toujours visible (D2) ?
5. Échelle de flux : **1–10** (null = pas de règles) te convient-elle, ou veux-tu **0–10** avec 0 = spotting ?
6. Souhaites-tu une notification locale quelques jours avant les règles prévues ? (hors périmètre actuel, nécessiterait `expo-notifications`.)
