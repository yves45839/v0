# v0-secure-point-dashboard-design

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_cdXi16FLPkhHJRdgxZsmlARB2lYB)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/Adn225/v0-secure-point-dashboard-design" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>

## Integrer la collection Employees API au projet

### 1) Fichiers Postman inclus

- Collection: `postman/employees-create-person.postman_collection.json`
- Environment local: `postman/employees-local.postman_environment.json`

Importe ces deux fichiers dans Postman puis lance la requete `Auth - Get JWT Token` avant les requetes de creation.

### 2) Activer l'appel API depuis l'interface Employees

Le modal "Ajouter un Employe" peut appeler l'API reelle au lieu du mode mock.

Cree un fichier `.env.local`:

```bash
NEXT_PUBLIC_EMPLOYEE_API_ENABLED=true
NEXT_PUBLIC_EMPLOYEE_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_EMPLOYEE_API_USERNAME=emp-admin
NEXT_PUBLIC_EMPLOYEE_API_PASSWORD=pass
```

Puis relance l'app (`pnpm dev`).

### 3) Fonctionnement actuel dans l'UI

Quand `NEXT_PUBLIC_EMPLOYEE_API_ENABLED=true`:

1. le front recupere un token JWT (`POST /api/auth/token/`)
2. il cree la personne (`POST /api/employees/`)
3. il met a jour la liste locale de l'interface

Si l'API retourne une erreur, un message d'erreur est affiche dans le modal.

## Refonte UX SecurePoint (branche `design/securepoint-refonte-ux`)

Refonte alignée sur le brief Claude Design « SecurePoint Refonte UX ERP RH » (persona manager d'équipe, inspiration BambooHR / Sage People, bilingue FR↔EN).

### Système de design

- **Palette** : vert sauge profond (`oklch(0.46 0.085 165)`) en light, sage clair en dark, neutres légèrement chauds, accents ambre (anomalies) et corail (absences).
- **Polices** : Inter (corps) + Inter Tight (titres, via `--font-display`) + JetBrains Mono (monospace). Déclarées dans [`app/layout.tsx`](app/layout.tsx).
- **Thème** : `defaultTheme="light"` (le toggle dark reste fonctionnel).
- **Toggle FR/EN** : bouton Globe dans le `Header` du dashboard, bascule via `useI18n().toggleLocale`. Toutes les nouvelles vues lisent `useI18n().locale` pour le bilingue.

### Nouvelles routes

| Route | Page / vue | Composants principaux |
|---|---|---|
| `/` | Manager dashboard | [`ManagerHero`](components/dashboard/manager-hero.tsx), [`KPICards`](components/dashboard/kpi-cards.tsx), [`NeedsAttention`](components/dashboard/needs-attention.tsx), [`PresenceWeek`](components/dashboard/presence-week.tsx), [`UpcomingLeave`](components/dashboard/upcoming-leave.tsx) |
| `/timesheet` | Validation pointages (parcours focus) | [`TimesheetValidation`](components/timesheet/timesheet-validation.tsx), [`AiSuggestionBanner`](components/timesheet/ai-suggestion-banner.tsx), [`TimesheetRow`](components/timesheet/timesheet-row.tsx) |
| `/absences` | Demandes de congés | [`AbsencesView`](components/absences/absences-view.tsx), [`AbsenceRequestCard`](components/absences/absence-request-card.tsx), [`TeamAvailability`](components/absences/team-availability.tsx) |
| `/planning/weekly` | Planning hebdomadaire (grille) | [`WeeklyPlanningGrid`](components/planning/weekly-grid.tsx) |
| `/planning` | Wizard de création (existant, intact) | — |
| `/employees` | Liste équipe + colonne Statut | [`EmployeeStatusChip`](components/employees/employee-status-chip.tsx) injectée dans [`EmployeeTable`](components/employees/employee-table.tsx) |

### Liens dans la sidebar

[`AppSidebar`](components/dashboard/app-sidebar.tsx) expose, en plus des entrées existantes :
- **Pointages / Timesheets** (icône `ClipboardCheck`) → `/timesheet`
- **Congés / Time off** (icône `Plane`) → `/absences`

### Statut opérationnel d'employé

`deriveOperationalStatus(employee, options)` ([source](components/employees/employee-status-chip.tsx)) infère un statut depuis les champs existants :

| Statut | Déclencheur |
|---|---|
| `suspended` | option `suspended=true` ou `isActive=false` |
| `leave` | option `onLeave=true` |
| `anomaly` | option `hasAnomaly=true` |
| `probation` | `validityStart > today` ou `validityEnd` à moins de 14 jours |
| `remote` | `workShift` matche `/remote\|teletravail/i` |
| `active` | par défaut |

`<EmployeeStatusChip status={...} />` rend la pill colorée bilingue correspondante.

### Données mockées

Les nouvelles vues (timesheet, absences, presence/leave dashboard, weekly grid) utilisent des fixtures inline pour la démo. Pour brancher l'API réelle :
- `TimesheetValidation` : passer une prop `items` (à ajouter) au lieu de `DEFAULT_ITEMS`.
- `AbsencesView` : passer une prop `requests` (à ajouter) au lieu de `DEFAULT_REQUESTS`.
- `PresenceWeek` / `UpcomingLeave` / `WeeklyPlanningGrid` : props `data` / `leaves` / `team` déjà exposées, fournir les vraies données.

### Historique de la branche

| Phase | Commit | Contenu |
|---|---|---|
| 1 | `4ed11e4` | Tokens sage green, fonts Inter, light theme, FR/EN toggle |
| 2 | `38b7a11` | Manager dashboard (hero + attention + presence + leave) |
| 3 | `f3101f8` | Validation pointages (timeline + IA + bulk) |
| 4 | `6e4ee7d` | Demandes de congés (cartes + conflits + mini calendrier) |
| 5+6 | `9fcc190` | Status chip employees + Weekly schedule grid |

