-- =========================================================
-- DASHBOARD BARBER — Supabase Schema (additif)
-- Exécuter dans Supabase → SQL Editor (sécuritaire, IF NOT EXISTS)
-- =========================================================

-- ============ TABLES ============

create table if not exists salons (
  id uuid primary key default gen_random_uuid(),
  nom text not null default 'Mon Salon',
  created_at timestamptz default now()
);

create table if not exists coiffeurs (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid,
  prenom text not null default '',
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid,
  prenom text not null default '',
  telephone text not null default '',
  created_at timestamptz default now()
);

create table if not exists file_attente (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid,
  created_at timestamptz default now()
);

create table if not exists pourboires (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid,
  montant numeric default 0,
  created_at timestamptz default now()
);

create table if not exists abonnements (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid,
  plan text default 'starter',
  created_at timestamptz default now()
);

create table if not exists user_roles (
  user_id uuid primary key,
  role text not null,
  salon_id uuid,
  prenom text,
  created_at timestamptz default now()
);

-- ============ COLONNES (ajoutées si manquantes) ============

alter table salons add column if not exists logo_url text;
alter table salons add column if not exists primary_color text default '#1A1A1A';
alter table salons add column if not exists font text default 'Inter';
alter table salons add column if not exists consignes text default 'Merci de respecter les consignes du salon.';
alter table salons add column if not exists horaire_ouverture text default '09:00';
alter table salons add column if not exists horaire_fermeture text default '19:00';
alter table salons add column if not exists limite_rdv_classique text default '18:00';
alter table salons add column if not exists limite_fs text default '18:30';
alter table salons add column if not exists delai_retard_rdv integer default 8;
alter table salons add column if not exists delai_retard_fs integer default 10;
alter table salons add column if not exists google_business_url text;
alter table salons add column if not exists coupes_actives jsonb default '["degrade_bas","degrade_haut","classique","taper","decrire"]'::jsonb;
alter table salons add column if not exists locks_actif boolean default false;
alter table salons add column if not exists tarifs jsonb default '{"adulte":{"degrade_bas":25,"degrade_haut":25,"classique":20,"taper":25,"locks":35,"decrire":25},"enfant":{"degrade_bas":18,"degrade_haut":18,"classique":15,"taper":18,"locks":25,"decrire":18}}'::jsonb;
alter table salons add column if not exists plan text default 'starter';
alter table salons add column if not exists franchise_id uuid;

alter table coiffeurs add column if not exists email text;
alter table coiffeurs add column if not exists avatar_url text;
alter table coiffeurs add column if not exists actif boolean default true;
alter table coiffeurs add column if not exists disponible boolean default false;
alter table coiffeurs add column if not exists user_id uuid;

alter table clients add column if not exists is_adulte boolean default true;
alter table clients add column if not exists stop_sms boolean default false;
alter table clients add column if not exists visites_count integer default 0;

alter table file_attente add column if not exists coiffeur_id uuid;
alter table file_attente add column if not exists client_id uuid;
alter table file_attente add column if not exists prenom text;
alter table file_attente add column if not exists telephone text;
alter table file_attente add column if not exists is_adulte boolean default true;
alter table file_attente add column if not exists texture text;
alter table file_attente add column if not exists type_coupe text;
alter table file_attente add column if not exists finition text;
alter table file_attente add column if not exists paiement text;
alter table file_attente add column if not exists prix numeric default 0;
alter table file_attente add column if not exists statut text default 'en_attente';
alter table file_attente add column if not exists position integer default 0;
alter table file_attente add column if not exists peu_importe boolean default false;
alter table file_attente add column if not exists termine_at timestamptz;

alter table pourboires add column if not exists coiffeur_id uuid;
alter table pourboires add column if not exists client_id uuid;

-- ============ RLS PERMISSIF (MVP) ============
alter table salons enable row level security;
alter table coiffeurs enable row level security;
alter table clients enable row level security;
alter table file_attente enable row level security;
alter table pourboires enable row level security;
alter table abonnements enable row level security;
alter table user_roles enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array['salons','coiffeurs','clients','file_attente','pourboires','abonnements','user_roles']) loop
    execute format('drop policy if exists "anon_all_%s" on %I;', t, t);
    execute format('create policy "anon_all_%s" on %I for all using (true) with check (true);', t, t);
  end loop;
end$$;

-- ============ REALTIME ============
do $$
begin
  begin alter publication supabase_realtime add table file_attente; exception when others then null; end;
  begin alter publication supabase_realtime add table coiffeurs;    exception when others then null; end;
  begin alter publication supabase_realtime add table pourboires;   exception when others then null; end;
end$$;

-- ============ SEED DEMO ============

insert into salons (id, nom, logo_url, primary_color, consignes, plan, locks_actif)
values (
  '11111111-1111-1111-1111-111111111111',
  'Le Barbier Demo',
  'https://images.unsplash.com/photo-1555274175-75f4056dfd05?w=200',
  '#1A1A1A',
  'Bienvenue au Barbier Demo. Merci de patienter calmement et de respecter votre tour.',
  'pro',
  true
)
on conflict (id) do update set
  nom = excluded.nom,
  logo_url = excluded.logo_url,
  primary_color = excluded.primary_color,
  consignes = excluded.consignes,
  plan = excluded.plan,
  locks_actif = excluded.locks_actif;

insert into coiffeurs (id, salon_id, prenom, email, actif, disponible)
values
  ('22222222-2222-2222-2222-222222222221','11111111-1111-1111-1111-111111111111','Karim','karim@demo.fr',true,true),
  ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Yanis','yanis@demo.fr',true,true),
  ('22222222-2222-2222-2222-222222222223','11111111-1111-1111-1111-111111111111','Sam','sam@demo.fr',true,false)
on conflict (id) do update set
  prenom = excluded.prenom,
  actif = excluded.actif,
  disponible = excluded.disponible;

insert into abonnements (salon_id, plan)
select '11111111-1111-1111-1111-111111111111','pro'
where not exists (select 1 from abonnements where salon_id = '11111111-1111-1111-1111-111111111111');
