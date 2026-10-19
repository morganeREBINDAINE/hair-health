-- Suivi menstruel : à exécuter une fois dans l'éditeur SQL Supabase sur une base existante.
alter table public.daily_logs
  add column if not exists menstrual_flow int check (menstrual_flow between 1 and 10),
  add column if not exists menstrual_pain boolean,
  add column if not exists menstrual_note text default '',
  add column if not exists menstrual_ended_at time;
