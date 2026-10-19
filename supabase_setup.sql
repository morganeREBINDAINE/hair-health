-- ========================================================
-- SCHEMA SUPABASE : SUIVI SANTÉ & CHEVEUX
-- Compatible Row Level Security (RLS) & Google OAuth
-- ========================================================

-- 1. Table des Profils Utilisateurs
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

create policy "Les utilisateurs peuvent voir leur propre profil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Les utilisateurs peuvent mettre à jour leur profil"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. Définitions des Médicaments et Compléments (personnalisables par utilisateur)
create table if not exists public.medication_definitions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  default_dosage text default '',
  is_prechecked boolean default false,
  is_active boolean default true,
  category text default 'supplement', -- 'supplement', 'medication'
  display_order int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.medication_definitions enable row level security;

create policy "Gestion des définitions de médicaments"
  on public.medication_definitions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Table des Journaux Quotidiens (Un enregistrement par jour par utilisateur)
create table if not exists public.daily_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  anxiety_score int check (anxiety_score between 0 and 10),
  lump_in_throat boolean default false,
  conflict_with_husband boolean default false,
  hair_loss_amount int default null, -- nombre estimé de cheveux perdus (ex: 50, 100)
  haircut_done boolean default false,
  haircut_notes text default '',
  hair_wash_done boolean default false,
  shampoo_type text check (shampoo_type in ('bebe', 'sans_sulfate', 'avec_sulfate', 'traitant', null)),
  henna_done boolean default false,
  sleep_hours numeric default null,
  fatigue_level text check (fatigue_level in ('normal', 'légère', 'modérée', 'importante', null)),
  notes text default '',
  menstrual_flow int check (menstrual_flow between 1 and 10), -- null = pas de règles ce jour-là
  menstrual_pain boolean,
  menstrual_note text default '',
  menstrual_ended_at time, -- heure de fin des règles (« Plus de règles »)
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, date)
);

alter table public.daily_logs enable row level security;

create policy "Gestion des journaux quotidiens"
  on public.daily_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Table des Prises Quotidiennes de Médicaments
create table if not exists public.daily_medications (
  id uuid default gen_random_uuid() primary key,
  daily_log_id uuid references public.daily_logs on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  medication_id uuid references public.medication_definitions on delete set null,
  medication_name text not null,
  taken boolean default true,
  dosage text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(daily_log_id, medication_name)
);

alter table public.daily_medications enable row level security;

create policy "Gestion des prises de médicaments"
  on public.daily_medications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Définition des Normes Fonctionnelles Sanguines (spécial santé des cheveux)
create table if not exists public.lab_marker_definitions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  code text not null,
  name text not null,
  min_functional numeric,
  max_functional numeric,
  unit text not null,
  description text default '',
  display_order int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.lab_marker_definitions enable row level security;

create policy "Gestion des normes de laboratoire"
  on public.lab_marker_definitions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Table des Prises de Sang (Bilans)
create table if not exists public.lab_tests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  test_date date not null,
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.lab_tests enable row level security;

create policy "Gestion des bilans de prise de sang"
  on public.lab_tests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. Résultats des Valeurs Mesurées par Bilan
create table if not exists public.lab_test_values (
  id uuid default gen_random_uuid() primary key,
  lab_test_id uuid references public.lab_tests on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  marker_id uuid references public.lab_marker_definitions on delete cascade not null,
  value numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(lab_test_id, marker_id)
);

alter table public.lab_test_values enable row level security;

create policy "Gestion des valeurs de prise de sang"
  on public.lab_test_values for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 8. Plans de traitement (fond / cure)
create table if not exists public.treatment_plans (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('fond', 'cure')),
  name text not null,
  description text default '',
  dosage text not null,
  start_date date not null,
  end_date date,
  planned_blood_test jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.treatment_plans enable row level security;

create policy "Gestion des plans de traitement"
  on public.treatment_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========================================================
-- FONCTION & TRIGGER : Initialisation automatique d'un nouvel utilisateur
-- ========================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- 1. Création du profil
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  -- 2. Initialisation des compléments / médicaments par défaut
  -- Compléments pré-cochés par défaut
  insert into public.medication_definitions (user_id, name, default_dosage, is_prechecked, display_order) values
    (new.id, 'Fer bisglycinate + Vitamine C', '1 gélule le matin', true, 1),
    (new.id, 'Magnésium', '300 mg le soir', true, 2),
    (new.id, 'Vitamine B12', '1000 µg', true, 3),
    -- Autres compléments courants
    (new.id, 'Forcapil', '2 comprimés', false, 4),
    (new.id, 'Iode', '150 µg', false, 5),
    (new.id, 'Sélénium', '100 µg', false, 6),
    (new.id, 'Myo-Inositol', '2 g', false, 7);

  -- 3. Initialisation des normes fonctionnelles idéales pour les cheveux
  insert into public.lab_marker_definitions (user_id, code, name, min_functional, max_functional, unit, description, display_order) values
    (new.id, 'ferritine', 'Ferritine', 70, 120, 'µg/L', 'Optimale > 70 µg/L pour enrayer la chute et soutenir la phase anagène', 1),
    (new.id, 'tsh', 'TSH', 1.0, 2.0, 'mUI/L', 'Équilibre thyroïdien optimal (plus resserré que la norme labo classique)', 2),
    (new.id, 't3', 'T3 Libre', 3.0, 4.2, 'pg/mL', 'Hormone active régulant le métabolisme cellulaire du follicule', 3),
    (new.id, 't4', 'T4 Libre', 1.1, 1.6, 'ng/dL', 'Hormone de réserve thyroïdienne', 4),
    (new.id, 'tpo', 'Anti-TPO', 0, 9, 'UI/mL', 'Anticorps anti-thyroperoxydase (recherche d''auto-immunité)', 5),
    (new.id, 'nfs_hb', 'NFS (Hémoglobine)', 12.5, 15.5, 'g/dL', 'Oxygénation et apport sanguin aux racines', 6),
    (new.id, 'vit_d', 'Vitamine D3', 50, 80, 'ng/mL', 'Facteur clé de différenciation du follicule pileux', 7),
    (new.id, 'zinc', 'Zinc sérique', 90, 130, 'µg/dL', 'Cofacteur de synthèse de la kératine et division cellulaire', 8);

  return new;
end;
$$ language plpgsql security definer;

-- Trigger après création dans auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
