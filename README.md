# Hair & Health Tracker (Suivi Santé & Cheveux) 🌿💇‍♀️

Application mobile développée avec **React Native (Expo SDK 57)**, **TypeScript**, **Supabase** et **Expo Router**.

---

## 📱 Fonctionnalités Clés

1. **Saisie Journalière Complète (`/entry`)** :
   - Évaluation chiffrée de la chute de cheveux (ex: 30, 80, 150...).
   - Note d'anxiété sur échelle visuelle de 0 à 10.
   - Suivi des symptômes clés : « Boule dans la gorge » et « Grosse dispute ».
   - Soins capillaires : Coupes (avec notes), Lavages (sélecteur : Bébé, Sans sulfate, Avec sulfate, Traitant) et pose de Henné.
   - Compléments & Médicaments :
     - Pré-cochés par défaut : Fer bisglycinate + Vitamine C, Magnésium, Vitamine B12.
     - Sélecteurs de dosage : Forcapil (1 ou 2 comprimés), Iode, Sélénium, Myo-Inositol.
     - Ajout à la volée de nouveaux compléments personnalisés sauvegardés pour le futur.

2. **Calendrier Interactif (`/calendar`)** :
   - Vue calendrier mensuelle fluide en français.
   - Pastilles / Icônes sous chaque jour :
     - 💊 Médicaments pris
     - 💇‍♀️ Coupes
     - 🧴 Shampoings
     - 🌿 Henné
     - ⚡ Stress / Disputes
     - 🩸 Prises de sang
   - Barre de filtres supérieure pour afficher/masquer chaque catégorie selon vos préférences.
   - Fiche résumé détaillée au clic sur n'importe quel jour avec bouton d'accès rapide pour modifier.

3. **Normes Fonctionnelles & Bilans Sanguins (`/norms`)** :
   - Onglet avec icône seringue (💉) dédié à la santé des cheveux.
   - Définition des seuils optimaux (Ferritine > 70 µg/L, TSH 1.0-2.0, T3, T4, Anti-TPO, NFS, etc.).
   - Possibilité de modifier les intervalles min/max et d'ajouter de nouvelles molécules avec leur unité.
   - Saisie et historique des prises de sang avec alertes colorées automatiques (🟢 Optimal, 🔴 En dehors).

4. **Tableau de Bord & Statistiques (`/index`)** :
   - Cartes KPI : moyenne de chute récente, taux d'observance des compléments, score d'anxiété moyen.
   - Graphique de suivi de la chute de cheveux.
   - Graphique de corrélation anxiété / stress.
   - Bilan de la dernière prise de sang.

5. **Export Excel (.xlsx) & Partage (`/export`)** :
   - Sélection de la durée : 7 jours, 30 jours, 3 mois ou tout l'historique.
   - Sélection des catégories à inclure via cases à cocher.
   - Génération instantanée du fichier `.xlsx` multi-onglets et ouverture de la feuille de partage du smartphone (Email, WhatsApp, Drive, Fichiers...).

6. **Sauvegarde Cloud Supabase & Google OAuth (`/export`)** :
   - Fonctionne à 100% hors-ligne avec persistance locale instantanée (`AsyncStorage`).
   - Synchronisation automatique avec Supabase lors de la connexion Google pour ne jamais perdre vos données lors d'un changement de téléphone.

---

## 🚀 Démarrage Rapide

### 1. Lancer l'application
Dans le dossier du projet :
```bash
npx expo start
```

### 2. Tester sur smartphone avec Expo Go
- Installez l'application **Expo Go** sur votre téléphone (App Store ou Google Play).
- Scannez le QR Code affiché dans le terminal (sur Android avec l'app Expo Go, sur iOS avec l'appareil photo).

---

## 🗄️ Configuration de Supabase (Optionnel pour la synchronisation cloud)

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Rendez-vous dans **SQL Editor** sur Supabase.
3. Copiez-collez l'intégralité du fichier [`supabase_setup.sql`](./supabase_setup.sql) et cliquez sur **Run**.
4. Dans **Authentication > Providers > Google**, activez Google OAuth avec votre Client ID Google.
5. Créez un fichier `.env` à la racine :
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
   ```
   *(Vous pouvez également renseigner ces clés directement dans l'onglet **Export & Compte** de l'application sans recompiler).*
