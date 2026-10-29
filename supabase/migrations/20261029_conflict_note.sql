-- Description des disputes : à exécuter une fois dans l'éditeur SQL Supabase sur une base existante.
alter table public.daily_logs
  add column if not exists conflict_note text default '';
