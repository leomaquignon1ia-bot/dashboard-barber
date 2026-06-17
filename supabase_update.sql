-- =========================================================
-- DASHBOARD BARBER — Supabase Update (additif sécurisé)
-- À exécuter dans Supabase → SQL Editor APRÈS supabase_schema.sql
-- Idempotent : safe à ré-exécuter
-- =========================================================

-- ============ NOUVELLES COLONNES — SALONS ============
alter table salons add column if not exists adresse text;
alter table salons add column if not exists ville text;
alter table salons add column if not exists code_postal text;
alter table salons add column if not exists telephone_fixe text;
alter table salons add column if not exists telephone_mobile text;
alter table salons add column if not exists franchise_id uuid;

-- Tarifs par défaut + grille Pro/Studio (jsonb {adulte:{coupe:prix}, enfant:{coupe:prix}})
alter table salons add column if not exists tarifs jsonb default
  '{"adulte":{"degrade_bas":25,"degrade_haut":25,"classique":20,"taper":25,"locks":35,"decrire":25},"enfant":{"degrade_bas":18,"degrade_haut":18,"classique":15,"taper":18,"locks":25,"decrire":18}}'::jsonb;

-- ============ NOUVELLES COLONNES — COIFFEURS ============
alter table coiffeurs add column if not exists qr_token text unique;
alter table coiffeurs add column if not exists pointage_at timestamptz;
alter table coiffeurs add column if not exists pause_at timestamptz;
alter table coiffeurs add column if not exists fin_journee_at timestamptz;
alter table coiffeurs add column if not exists en_pause boolean default false;

-- Génère un token unique pour chaque coiffeur existant qui n'en a pas
update coiffeurs set qr_token = replace(gen_random_uuid()::text, '-', '') where qr_token is null;

-- ============ NOUVELLES COLONNES — POURBOIRES (force refresh) ============
alter table pourboires add column if not exists salon_id uuid;
alter table pourboires add column if not exists coiffeur_id uuid;
alter table pourboires add column if not exists client_id uuid;

-- ============ FRANCHISES ============
create table if not exists franchises (
  id uuid primary key default gen_random_uuid(),
  nom text not null default 'Ma Franchise',
  proprietaire_user_id uuid,
  created_at timestamptz default now()
);

alter table franchises enable row level security;
do $$
begin
  drop policy if exists "anon_all_franchises" on franchises;
  create policy "anon_all_franchises" on franchises for all using (true) with check (true);
end$$;

-- ============ RDV (Rendez-vous chronologiques) ============
create table if not exists rdv (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid,
  coiffeur_id uuid,
  client_id uuid,
  prenom text,
  telephone text,
  type_coupe text,
  texture text,
  finition text,
  is_adulte boolean default true,
  paiement text,
  prix numeric default 0,
  date_rdv timestamptz not null,
  statut text default 'planifie',
  created_at timestamptz default now()
);

alter table rdv enable row level security;
do $$
begin
  drop policy if exists "anon_all_rdv" on rdv;
  create policy "anon_all_rdv" on rdv for all using (true) with check (true);
end$$;

-- ============ REFRESH POSTGREST CACHE ============
notify pgrst, 'reload schema';
