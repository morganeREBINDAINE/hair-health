-- Rendez-vous de prise de sang créés automatiquement à l'échéance d'un contrôle.
-- À exécuter une fois dans l'éditeur SQL Supabase, après 20261022_analyses_exams_planning.sql.

-- Échéance pour laquelle un rendez-vous automatique a déjà été créé (évite de le recréer après suppression)
alter table public.lab_marker_definitions
  add column if not exists auto_planned_key text;

-- Rendez-vous créé automatiquement : les molécules suivantes arrivées à échéance y sont regroupées
alter table public.planned_checkups
  add column if not exists is_auto boolean not null default false;
