-- Analyses : fréquence de contrôle, examens médicaux, planification.
-- À exécuter une fois dans l'éditeur SQL Supabase sur une base existante.

-- 1. Fréquence de contrôle par molécule (null = pas de suivi ; 6 ou 12 mois si dans la norme)
alter table public.lab_marker_definitions
  add column if not exists recheck_months int check (recheck_months in (6, 12));

-- Pré-réglage des molécules suivies jusqu'ici en dur sur l'accueil
update public.lab_marker_definitions set recheck_months = 6
  where lower(code) in ('tsh', 'ferritine') and recheck_months is null;
update public.lab_marker_definitions set recheck_months = 12
  where lower(code) = 'vit_d' and recheck_months is null;

-- 2. Examens médicaux (radios, échographies)
create table if not exists public.medical_exams (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('radio', 'echographie')),
  exam_date date not null,
  title text not null default '',
  location text not null default '',
  result text not null default '',
  photo_path text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.medical_exams enable row level security;

drop policy if exists "Gestion des examens médicaux" on public.medical_exams;
create policy "Gestion des examens médicaux"
  on public.medical_exams for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Planification (prise de sang ou examen)
create table if not exists public.planned_checkups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  kind text not null check (kind in ('blood', 'exam')),
  planned_date date not null,
  marker_codes text[] not null default '{}',
  exam_label text not null default '',
  note text not null default '',
  done boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.planned_checkups enable row level security;

drop policy if exists "Gestion des planifications" on public.planned_checkups;
create policy "Gestion des planifications"
  on public.planned_checkups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Bucket privé des photos d'examens : un dossier par utilisateur (<user_id>/<fichier>)
insert into storage.buckets (id, name, public)
  values ('exam-photos', 'exam-photos', false)
  on conflict (id) do nothing;

drop policy if exists "Photos examens : lecture" on storage.objects;
create policy "Photos examens : lecture"
  on storage.objects for select
  using (bucket_id = 'exam-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Photos examens : ajout" on storage.objects;
create policy "Photos examens : ajout"
  on storage.objects for insert
  with check (bucket_id = 'exam-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Photos examens : suppression" on storage.objects;
create policy "Photos examens : suppression"
  on storage.objects for delete
  using (bucket_id = 'exam-photos' and auth.uid()::text = (storage.foldername(name))[1]);
