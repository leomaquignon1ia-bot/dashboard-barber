# Dashboard Barber — PRD

## Vision
PWA SaaS multi-rôles pour barbershops : file d'attente temps réel, gestion coiffeurs, RDV, pourboires, multi-salons. Interface française adaptative light/dark.

## Architecture
- **Frontend** : React 19 + React Router + Tailwind + shadcn/ui + framer-motion + Supabase JS
- **Backend / DB** : Supabase (Postgres, Auth, Realtime) — direct depuis le frontend
- **PWA** : manifest.json + service worker (`/public/sw.js`)
- **White-label** : `salons.logo_url` + `salons.primary_color` + placeholder neutre (ScissorsLogo)

## Personas
- Client (QR/SMS, sans compte) — parcours isolé /client/:salonId
- Coiffeur (Supabase Auth, page mobile, QR pointage)
- Gérant (Supabase Auth, dashboard salon)
- Franchisé (Supabase Auth, multi-salons)
- Super Admin Léo (Supabase Auth, vue plateforme)

## Design tokens
- Light : bg `#FFFFFF`, text `#1A1A1A`
- Dark  : bg `#111111`, text `#F5F5F5`
- Accent gradient primaire : `#6C63FF → #4F46E5`
- Placeholder logo : bg `#E5E7EB`, ciseaux `#374151`

## Roadmap

### ✅ Implémenté v1.1 — 17/06/2026 (Session actuelle)
- **P0 — Bugs critiques résolus** :
  - Isolation routing client : ClientFlow et ClientWaiting ne renvoient plus vers `/` (toujours `/client/:salonId`)
  - Pourboires DB : `salon_id`, `coiffeur_id`, `client_id` forcés via supabase_update.sql + `notify pgrst reload schema`
  - Validation pourboire libre : min 1€, bouton OK désactivé en dessous, bouton "Passer / 0€" visible
  - Design system : palette light/dark stricte, gradient accent uniforme, ScissorsLogo placeholder neutre (gris) partout où `logo_url` absent
- **P1 — Features** :
  - `supabase_update.sql` créé (ALTER TABLE idempotent + tables `franchises` + `rdv`)
  - QR Pointage coiffeur : route publique `/coiffeur/pointage/:token`, QR généré dans CoiffeurDashboard, boutons Pointer / Pause / Fin journée
  - Lien d'invitation coiffeur sécurisé via `qr_token` : `/login?role=coiffeur&prenom=...&token=...` (bannière dans Login)
  - Grille tarifaire (Pro/Studio) configurable dans Gérant > Paramètres, affichée auto dans Step 8 ClientFlow
  - Vue Franchisé : multi-salons, stats consolidées, carte par salon
- **P2 — Améliorations dashboards** :
  - Gérant : statut Actif/Inactif/En pause + heure pointage sous chaises, bouton "+ Ajouter coiffeur" génère lien d'invitation à copier, coordonnées (adresse/ville/CP/téléphones) dans paramètres
  - Coiffeur : section "RDV du jour" chronologique, modal QR pointage personnel, boutons Pause / Fin journée
  - Client : compteur d'attente par coiffeur à l'étape 6, message "Vous êtes le prochain, {prénom} !", écran "Votre coiffeur vous attend !" en `en_cours`, post-coupe avec lien Google Review (si `google_business_url` configuré), traductions FR (paiement, types coupes)
  - Super Admin : logo placeholder, adresse, téléphones, badge "Franchise" multi-salon, dropdown plan immédiat
- ClientFlow : scroll-to-accept (auto si court), capitalisation prénom à la saisie

### ✅ Implémenté v1.0 — 13/06/2026
- Landing avec sélection de rôle + bannière setup Supabase
- Login/Signup Supabase Auth (par rôle via URL param)
- Parcours Client 8 étapes
- Illustrations SVG (textures + silhouettes + chaise barbier)
- Écran d'attente client avec realtime
- Dashboards Coiffeur / Gérant / SuperAdmin
- Feature gating (FeatureLock + modal mailto upgrade)
- PWA installable, Realtime Supabase
- SQL schema additif + seed démo

### ⏳ P1 — Phase 2 (à venir)
- Calendrier RDV interactif (`calendar.jsx` shadcn déjà dispo)
- Intégration Brevo SMS (rappel 1h avant, STOP SMS)
- Webhook Render
- Code fidélité automatique (10 coupes = -100%)
- Statut absent automatique selon délai
- Upload logo salon (Supabase Storage)

### ⏳ P2 — Polish
- Mode kiosque (tablet salon)
- Push notifications (PWA)
- Stats avancées / charts (recharts installé)
- Génération PDF des stats mensuelles

## DB Schema clé
- `salons` : nom, logo_url, primary_color, consignes, horaires, plan, franchise_id, tarifs (jsonb adulte/enfant), adresse, ville, code_postal, telephone_fixe, telephone_mobile
- `coiffeurs` : prenom, email, actif, disponible, en_pause, user_id, qr_token (unique), pointage_at, pause_at, fin_journee_at
- `clients` : prenom, telephone, salon_id, is_adulte, stop_sms, visites_count
- `file_attente` : salon_id, coiffeur_id, client_id, statut, position, prix, type_coupe, texture, finition, paiement, peu_importe, termine_at
- `pourboires` : salon_id, coiffeur_id, client_id, montant
- `rdv` : salon_id, coiffeur_id, client_id, date_rdv, type_coupe, prix, statut
- `franchises` : nom, proprietaire_user_id
- `user_roles` : user_id, role (client/coiffeur/gerant/franchise/super_admin), salon_id, prenom

## Files clés
- `/app/supabase_schema.sql` — Schema initial
- `/app/supabase_update.sql` — Migrations additives idempotentes
- `/app/frontend/src/App.js` — Routing principal
- `/app/frontend/src/pages/ClientFlow.jsx` — Parcours client 8 étapes
- `/app/frontend/src/pages/CoiffeurPointage.jsx` — QR pointage public
- `/app/frontend/src/pages/FranchiseDashboard.jsx` — Vue multi-salons
- `/app/frontend/src/components/Illustrations.jsx` — SVG (ScissorsLogo, BarberChair, textures, silhouettes)
- `/app/frontend/src/components/FeatureLock.jsx` — Cadenas + modal mailto upgrade
