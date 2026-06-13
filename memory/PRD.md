# Dashboard Barber — PRD

## Vision
PWA SaaS multi-rôles pour barbershops : file d'attente temps réel, gestion coiffeurs, RDV, pourboires, multi-salons. Interface française adaptative light/dark.

## Architecture
- **Frontend** : React 19 + React Router + Tailwind + shadcn/ui + framer-motion + Supabase JS
- **Backend / DB** : Supabase (Postgres, Auth, Realtime) — direct depuis le frontend
- **PWA** : manifest.json + service worker (`/public/sw.js`)
- **White-label** : `salons.logo_url` + `salons.primary_color` injectés en CSS vars

## Personas
- Client (QR/SMS, sans compte)
- Coiffeur (Supabase Auth, page mobile)
- Gérant (Supabase Auth, dashboard salon)
- Franchisé (Supabase Auth, multi-salons) — futur
- Super Admin Léo (Supabase Auth, vue plateforme)

## Roadmap

### ✅ Implémenté (v1.0 — 13/06/2026)
- Landing avec sélection de rôle + bannière setup Supabase
- Login/Signup Supabase Auth (par rôle via URL param)
- Parcours Client 8 étapes (consignes → infos → texture → coupe → finition → coiffeur → paiement → récap)
- Illustrations SVG : 4 textures cheveux + silhouettes coupes 3/4 face sans visage + chaise barbier
- Écran d'attente client avec position calculée, décompte temps estimé, statut realtime
- Dashboard Coiffeur : toggle dispo, prochain client mis en avant, file perso, terminé/absent, modal pourboire (2/5/10/libre), stats
- Dashboard Gérant : 4 KPI, onglets (chaises SVG colorées par charge, file globale filtrable, pourboires/coiffeur, paramètres)
- Feature gating : composant FeatureLock (cadenas + modal mailto upgrade)
- Super Admin : KPI plateforme, répartition plans, modification du plan par salon
- PWA installable (manifest + sw)
- Realtime Supabase sur file_attente, coiffeurs, pourboires
- SQL schema additif + seed démo (`/app/supabase_schema.sql`)

### ⏳ P1 — Phase 2
- Vue Franchisé (multi-salons)
- Onboarding gérant/coiffeur (premier login → form de profil)
- Calendrier RDV (`/app/frontend/src/components/ui/calendar.jsx` existe)
- Intégration Brevo SMS (rappel 1h avant, STOP SMS, avis Google)
- Webhook Render (`/client/enregistrer`, `/coupe/terminer`, `/pourboire`, `/relances/envoyer`)
- Code fidélité (10 coupes = -100%, lecture table fidelite)
- Statut absent automatique selon délai configuré
- Gestion STOP SMS clients
- Upload logo salon (Supabase Storage)

### ⏳ P2 — Polish
- QR code generator pour lien client
- Mode kiosque (tablet salon)
- Push notifications (PWA)
- Stats avancées / charts (recharts déjà installé)
