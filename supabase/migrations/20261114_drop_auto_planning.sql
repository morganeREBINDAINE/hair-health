-- Fin de la planification automatique des prises de sang : l'application ne crée plus de rendez-vous seule.
-- À exécuter une fois dans l'éditeur SQL Supabase sur une base existante.
-- Les rendez-vous déjà créés automatiquement sont conservés comme des rendez-vous ordinaires.
alter table public.planned_checkups
  drop column if exists is_auto;

alter table public.lab_marker_definitions
  drop column if exists auto_planned_key;
