-- Affichage d'un traitement comme sous-filtre du calendrier : à exécuter une fois dans l'éditeur SQL Supabase sur une base existante.
alter table public.medication_definitions
  add column if not exists show_in_calendar boolean not null default true;
