# Dashboard Barber

PWA SaaS de gestion pour barbershops, connectée directement à Supabase.

## ⚙️ Setup Supabase (à faire 1x)

1. Ouvre [Supabase Dashboard](https://supabase.com/dashboard/project/ustalpdtmlovuioghnyl/sql/new)
2. Copie/colle le contenu de `/app/supabase_schema.sql`
3. Clique **Run** → crée les tables/colonnes manquantes, RLS permissif, et insère le salon de démo

## Comptes démo

Crée-les depuis l'app via `/login?role=...` en mode "Créer un compte" :
- **Gérant** : `gerant@demo.fr` / `demo123`
- **Coiffeur Karim** : `karim@demo.fr` / `demo123` (prénom "Karim")
- **Super Admin** : `leo@dashboard-barber.fr` / `LeoDemo2026!`

## Architecture
- Frontend : React + Tailwind + shadcn/ui + Supabase JS
- DB/Auth/Realtime : Supabase (direct depuis le frontend)
- PWA : manifest + service worker
