# Design system — « Organic Vitality »

Référence visuelle de l'application **Santé Hijra** (suivi santé & cheveux). Ce document décrit le design **tel qu'il est implémenté** : la source de vérité reste le code.

| Quoi | Où |
|------|----|
| Couleurs, rayons, espacements, ombres, typographie | `src/constants/theme.ts` |
| Composants d'interface réutilisables | `src/components/ui.tsx` |
| Graphiques SVG (barres, courbes) | `src/components/charts.tsx` |
| Dock de navigation flottant | `src/app/_layout.tsx` (`FloatingDock`) |

Règle d'or : **aucune couleur, taille de police ou ombre en dur dans un écran**. On passe par `Palette`, `Type`, `Spacing`, `Radius`, `Elevation` et les composants de `ui.tsx`. Si un besoin n'existe pas, on ajoute le token dans `theme.ts` plutôt qu'une valeur locale.

---

## Identité

Application personnelle de bien-être, utilisée chaque jour en une minute. Le ton est **doux, organique et rassurant** : canvas vert très pâle, cartes blanches flottantes, formes en pilule, un vert vitalité pour l'action et le positif, un corail pour l'alerte. Le contraste fort vient de l'« obsidienne » (presque noir) réservée aux éléments les plus importants.

- Thème **clair uniquement** (`Colors.light` et `Colors.dark` pointent sur la même palette).
- Langue : français, tutoiement (« Comment te sens-tu »), phrases courtes.
- Icônes : **Lucide** (`lucide-react-native`) exclusivement. Pas d'emoji comme icône.

---

## Couleurs (`Palette`)

### Surfaces

| Token | Valeur | Usage |
|-------|--------|-------|
| `canvas` | `#F3F6F2` | Fond de tous les écrans et de l'en-tête |
| `card` | `#FFFFFF` | Cartes, chips au repos, onglets illustrés |
| `containerLow` | `#F1F4F0` | Champs de saisie, lignes à bascule, pastilles d'information, badge neutre |
| `container` | `#ECEFEB` | Fond d'icône par défaut, piste des barres, contrôle segmenté |
| `containerHighest` | `#E0E3DF` | Squelettes de chargement, interrupteur désactivé |
| `obsidian` | `#191D1A` | Carte sombre (« héros »), onglet actif du dock, boutons principaux, élément sélectionné |

### Texte

| Token | Valeur | Usage |
|-------|--------|-------|
| `text` | `#121614` | Titres et texte principal |
| `textVariant` | `#414A37` | Texte secondaire contrasté, libellés de jours |
| `textMuted` | `#7E8680` | Sous-titres, métadonnées, icônes inactives |
| `obsidianText` / `obsidianMuted` | `#EEF2EE` / 65 % | Texte sur carte obsidienne |

### Sémantique

| Famille | Tokens | Sens |
|---------|--------|------|
| **Vert vitalité** | `lime` `#8EE341`, `limeSoft` (22 %), `primary` `#386B00`, `onLime` | Action principale (bouton central du dock), succès, valeur normale, lien texte (`primary`) |
| **Corail** | `coral` `#FA6855`, `coralDeep` `#AD3124`, `coralSoft`, `coralContainer`, `onCoral` | Alerte, pic, valeur hors norme, prise de sang |
| **Ambre** | `amber` `#F39A38`, `amberSoft` | Avertissement léger (« bientôt », « à surveiller ») |
| **Framboise** | `raspberry` `#B83568`, `raspberrySoft` | Cycle menstruel (cartes, icônes) |
| **Règles** | `menstrual` `#D32F2F`, `menstrualDeep` | Jours de règles dans les graphiques |
| `error` | `#BA1A1A` | Erreurs de formulaire (`FieldError`) |

`primary` sert au texte et aux icônes vertes (lisible) ; `lime` sert aux fonds (jamais de texte `lime` sur fond blanc).

### Catégories d'événements (`CategoryColors`)

Utilisées par le calendrier et les pastilles : `blood` (corail foncé), `henna` `#C98A1A`, `wash` `#3E8E7E`, `stress` (corail), `meds` (vert), `haircut` `#5B5F5B`, `sleep` `#5C6BC0`, `cycle` (framboise). Toute nouvelle vue qui représente ces catégories réutilise ces couleurs.

---

## Typographie (`Type`)

Deux familles : **Plus Jakarta Sans** (titres, libellés, chiffres) et **Inter** (texte courant). Toujours via `<AppText variant="…">`.

| Variante | Police | Taille / interligne | Usage |
|----------|--------|---------------------|-------|
| `displayLg` | Jakarta Bold | 36 / 42 | Chiffre clé d'une carte KPI |
| `metric` | Jakarta Bold | 32 / 38 | Valeur chiffrée secondaire |
| `headlineLg` | Jakarta SemiBold | 28 / 34 | Titre d'accroche d'un écran |
| `headlineMd` | Jakarta SemiBold | 22 / 28 | Titre de feuille (bottom sheet) |
| `headlineSm` | Jakarta SemiBold | 18 / 24 | Titre de section, titre de l'en-tête |
| `bodyLg` / `bodyMd` / `bodySm` | Inter | 16 / 14 / 12 | Texte courant, sous-titres |
| `labelMd` | Jakarta SemiBold | 13 / 18 | Titre de ligne, bouton compact, chip |
| `labelSm` | Jakarta SemiBold | 11 / 14 | Badge, surtitre, axe de graphique |

Les titres ont un espacement négatif (déjà intégré aux tokens). Le surtitre de l'en-tête est en `labelSm` majuscules, espacement 1.

---

## Espacements, rayons, élévation

**`Spacing`** (rythme de 4/8) : `xs 4`, `sm 8`, `md 16`, `lg 24`, `xl 32`, `gutter 12` (entre deux cartes côte à côte), `margin 20` (marge latérale des écrans).

- Écrans : `paddingHorizontal: Spacing.margin`, sections séparées de `Spacing.lg`, largeur max `MaxContentWidth` (640) centrée.
- Bas de défilement : `paddingBottom: DockClearance` (112) pour ne rien cacher sous le dock.

**`Radius`** : `sm 8`, `md 16`, `lg 24` (lignes, cartes compactes), `xl 28` (cartes), `xxl 32` (haut des bottom sheets), `full` (boutons, chips, badges, champs).

**`Elevation`** (ombres teintées obsidienne, jamais grises) :

| Niveau | Usage |
|--------|-------|
| `card` | Cartes blanches, chips au repos |
| `dark` | Carte obsidienne, bouton `PillButton` sombre, onglet actif |
| `floating` | Dock de navigation |

---

## Composants (`ui.tsx`)

| Composant | Rôle et règles |
|-----------|----------------|
| `ScreenHeader` | En-tête de chaque onglet : logo rond blanc, surtitre « Santé Hijra », titre. Emplacement `right` optionnel pour une action (ex. bouton retour). |
| `Card` | Surface blanche `Radius.xl`, padding 20. `dark` = carte obsidienne. Avec `onPress`, réduction à 98,5 % à l'appui. |
| `IconCircle` | Icône Lucide dans un cercle teinté. Le fond reprend la teinte douce de la catégorie (`limeSoft`, `coralSoft`, `raspberrySoft`…). |
| `Badge` | Pilule d'état courte (≤ 3 mots). Tons : `lime`, `limeSoft`, `coral`, `coralSoft`, `amber`, `neutral`, `light`, `dark`. |
| `PillButton` | Bouton pilule 54 px (40 px en `compact`). Variantes `dark` (action principale), `lime`, `ghost`, `coral`. Prop `loading` : spinner + bouton bloqué. |
| `Chip` | Filtre sélectionnable : blanc au repos, obsidienne sélectionné, compteur optionnel. |
| `Segmented` | Choix exclusif court (Oui / Non, 6 / 12 mois). |
| `Toggle` / `ToggleRow` | Interrupteur pilule vert ; ligne icône + titre + interrupteur sur `containerLow`. |
| `SectionHeader` | Titre de section avec icône, sous-titre et action à droite. |
| `ShowMoreToggle` | « Voir plus (n) » / « Voir moins » sous une liste tronquée. |
| `ImageTabBar` | Onglets illustrés (vignette ronde + libellé), actif en obsidienne. |
| `Skeleton` / `SkeletonCard` | Blocs pulsants qui reprennent la structure de l'écran pendant le chargement. |
| `inputStyle` | Champ texte pilule 52 px sur `containerLow`. |

### Motifs récurrents

- **Carte KPI (« bento »)** : deux cartes côte à côte (`gap: Spacing.gutter`), la plus importante en obsidienne. Icône en haut, libellé `labelSm`, chiffre `displayLg`, ligne de contexte `bodySm` avec petite icône.
- **Ligne d'élément** (`homeStyles.itemRow`, `src/components/home/shared.tsx`) : carte `Radius.lg`, padding 14, `IconCircle` 48 px + titre `labelMd` 15 px + sous-titre `bodySm` + badge ou chevron à droite.
- **Carrousel horizontal** : déborde jusqu'aux bords de l'écran (`marginHorizontal: -Spacing.margin`) en gardant l'alignement sur la marge.
- **Pastille d'information** : pilule `containerLow` avec icône + phrase courte, pour un constat (pic, dispute…).
- **Bottom sheet** : coins supérieurs `Radius.xxl`, titre `headlineMd`.
- **Dock flottant** : pilule blanche centrée en bas, bouton central `lime` (Journal), onglet actif obsidienne avec libellé.

---

## États et retours

- **Chargement initial** : squelettes (`Skeleton`) reprenant la forme de l'écran, pas de spinner plein écran.
- **Action asynchrone** : `PillButton loading` (ou spinner local) et déclencheur désactivé jusqu'à la réponse.
- **Erreur de requête** : `Toast.error("…")`, message court et actionnable.
- **Erreur de formulaire** : `FieldError` sous le champ concerné, en `error`.
- **Vide** : phrase d'aide centrée en `textMuted` qui dit quoi faire (« Renseigne au moins 2 estimations… »).
- **Appui** : toute zone tappable a un retour visuel (réduction d'échelle ou opacité).

---

## Accessibilité

- Zones tactiles ≥ 44 × 44 px ; sinon `hitSlop`.
- Tout bouton icône seul porte un `accessibilityLabel` ; les titres de section portent `accessibilityRole="header"`.
- La couleur n'est jamais le seul indicateur : un état coloré est toujours accompagné d'un texte (badge, valeur, légende).
- Texte courant jamais sous 12 px ; pas de texte `textMuted` sur fond `container` ou plus sombre.
