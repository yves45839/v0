# SecurePoint — Audit UI/UX

Audit complet du dashboard `v0-secure-point-dashboard-design` réalisé le 2026-05-05.
Couvre : polish visuel, ergonomie (UX), responsive, accessibilité (a11y).

Le rapport est conçu pour servir de **brief direct** : chaque section "Recommandation" est rédigée pour être copiée-collée dans Claude Design ou utilisée comme ticket d'implémentation.

---

## 1. Résumé exécutif

**Verdict général** : la base technique est très solide (Next.js 15, shadcn/Radix, i18n, theme provider, sidebar 2-niveaux avec sections + sub-tabs). L'architecture est saine. Les problèmes sont concentrés sur **trois axes** :

1. **Pas d'identité de marque** dans les tokens CSS — la palette est celle de shadcn par défaut (gris neutres), les bleus visibles à l'écran sont injectés ad-hoc et incohérents d'une page à l'autre.
2. **États vides systématiquement non designés** — les pages Devices, Employees, Access Logs, Planning affichent toutes la même chose quand elles sont vides : trois cards à zéro et un message texte. Aucune piste pour démarrer. Critique pour l'onboarding.
3. **Densité incohérente entre pages** — Dashboard home très dense (table 14 colonnes), Devices/Employees très clairsemées. Aucun standard de spacing ni de hiérarchie visuelle.

Quatre quick wins (Tier 1) règlent ~60% des problèmes pour ~2 jours d'effort. Voir §6.

---

## 2. Forces du design actuel

À conserver et capitaliser dessus :

- **Architecture de navigation 2-niveaux** (5 sections sidebar + sub-tabs contextuels) — bonne idée, à pousser plus loin.
- **Componentisation propre** — fichiers séparés par domaine (`components/dashboard/`, `components/employees/`...).
- **i18n en place** (FR/EN via `useI18n()`).
- **Theme provider** avec dark/light, default light. Sidebar a un look dark assumé (gradient vers primary, shadow profondes).
- **Animations subtiles** (`animate-fade-up` avec delays staggered).
- **Iconographie cohérente** (Lucide partout).
- **Sidebar responsive** — desktop expand/collapse + mobile sheet.

---

## 3. Findings par axe

### 3.1 Polish visuel

| # | Finding | Fichier(s) | Sévérité |
|---|---------|-----------|----------|
| V1 | **Aucune couleur de marque** dans les CSS variables. `--primary` = `oklch(0.205 0 0)` (noir/blanc). Les bleus à l'écran (`Action rapide`, `Live`, badges) viennent de classes Tailwind inline (`bg-blue-500`, `text-blue-400`...) → impossible à thémer, incohérent d'une page à l'autre. | `styles/globals.css` | **Haute** |
| V2 | **Pas de tokens sémantiques `success` / `warning` / `info`**. Seul `--destructive` existe. Toutes les couleurs de statut (vert API connectée, orange hors-ligne, rouge alerte) sont des classes Tailwind brutes. | `styles/globals.css` | Haute |
| V3 | **Inconsistance fonts**. `globals.css` déclare `--font-sans: 'Geist'` mais `layout.tsx` charge Inter + Inter Tight. Le résultat dépend du CSS qui gagne. | `styles/globals.css:78`, `app/layout.tsx:11` | Moyenne |
| V4 | **Hiérarchie plate des KPI cards**. Sur la home, 4 cards strictement identiques en taille/style. Aucune ne ressort comme "le chiffre du jour". | screenshot 01 | Moyenne |
| V5 | **Iconographie décorative redondante**. Chaque card a une icône en haut à droite (Cpu, Wifi, AlertTriangle…) qui n'ajoute aucune info — fragmente le regard. | screenshots 02, 04 | Faible |
| V6 | **Header surchargé** : recherche globale + chip API + chip Webhook + tenant + timezone + datetime + bouton Action rapide + cloche + avatar. 8 éléments concurrents. | `components/dashboard/header.tsx` | Moyenne |
| V7 | **Status badges incohérents**. "API connectée", "Webhook actif", "Live", "Temps réel", "En direct", "Gateway connectee" = 6 façons différentes d'indiquer "ça fonctionne". | partout | Moyenne |
| V8 | **Loading text en plain text**. "Chargement des timetables…" sans skeleton ni spinner stylé. `Skeleton` existe (`components/ui/skeleton.tsx`) mais utilisé seulement dans 2 fichiers. | `app/planning/page.tsx`, autres | Moyenne |

### 3.2 UX / ergonomie

| # | Finding | Sévérité |
|---|---------|----------|
| U1 | **Empty states catastrophiques**. Devices vides = `0 Appareils suivis · 0 Hors ligne · 0 À surveiller · Aucun appareil trouvé avec les filtres actuels.` — l'utilisateur ne sait **ni quoi faire ni par où commencer**. Idem Employees, Access Logs, Planning. Pas de composant `EmptyState` réutilisable dans `components/ui/`. | **Haute** |
| U2 | **Page header répétitif**. Chaque page = titre 24px + description 14px + 3 chips de stats. Sur Devices vide, ça représente 30% de l'écran pour zéro info utile. | Haute |
| U3 | **Densité incohérente**. Home = 1 table de 14 colonnes en realtime (saturé). Devices/Employees = océan vide. Pas de standard. | Moyenne |
| U4 | **Form de Reports brutaliste**. Heure d'arrivée = 2 selects étroits (HH / MM) avec dropdowns vides illisibles. Pas de placeholder, pas de validation visible. Pause optionnelle avec selects également vides. | Haute |
| U5 | **CTA Action rapide énigmatique**. Bouton bleu en haut à droite, jamais explicité. Quoi se passe-t-il quand on clique ? | Moyenne |
| U6 | **"Plage personnalisée" en toggle switch peu lisible**. Mélangé avec un date picker + un select de personne + 2 boutons d'export. Hiérarchie d'actions floue. | Moyenne |
| U7 | **"Synchroniser" et "+ Ajouter un appareil"** sont sur la page Devices, mais sur Employees on a `Exporter / Importer / Nouveau quart / + Ajouter un employé` (4 boutons). Patterns d'actions de page non standardisés. | Moyenne |
| U8 | **Search globale = placeholder "Recherche globale: employé, badge"** — l'utilisateur ne sait pas si ça cherche aussi dans devices, logs, etc. Pas de raccourci clavier indiqué. | Faible |
| U9 | **Tenant code `TENANT` affiché en clair en bas de sidebar**. Pour un client multi-tenant, c'est probablement plus pertinent en haut, lisible, avec switcher si plusieurs tenants. | Faible |

### 3.3 Responsive / mobile

| # | Finding | Sévérité |
|---|---------|----------|
| R1 | **Tableau Flux d'accès = 14 colonnes**. Sur mobile, totalement inutilisable (scroll horizontal infini). Doit devenir un stack de cards en < md. | **Haute** |
| R2 | **Header 8 éléments**. Au-delà de tablette, ça va wrapper salement ou disparaître hors-écran. Aucun pattern responsive visible dans `header.tsx` (à confirmer code). | Haute |
| R3 | **Sidebar collapse à 3 breakpoints** (`mobile sheet` < md, `w-21` md, `w-64` lg). OK, mais le breakpoint md (icons-only) est un peu serré : icônes centrées sans labels, trop de place pour un usage tablette landscape. | Faible |
| R4 | **Dashboard grid `lg:grid-cols-[1.4fr_1fr]`**. En md (768-1024), tout passe en une colonne brutalement. Pas de palier intermédiaire 50/50. | Moyenne |
| R5 | **Modaux et dialogs** (`AddDeviceByIp`, `AddEmployee`, `FaceEnroll`, etc.) : à audit en mobile, beaucoup de form fields probablement non optimisés (selects natifs ?). | Moyenne |
| R6 | **Form de correction de pointage** (Reports) : grille de selects horizontale qui va exploser en < lg. | Haute |

### 3.4 Accessibilité

| # | Finding | Sévérité |
|---|---------|----------|
| A1 | **Touch targets**. Les rows de la table d'accès = 28-32px de haut. Standard tactile = 44px. À vérifier sur tous les tableaux. | Moyenne |
| A2 | **Contraste micro-labels**. Labels en uppercase 10-11px (`PILOTAGE`, `RESSOURCES RH`, `CONTROL CENTER`) en `text-muted-foreground` = `oklch(0.708)` sur sidebar `oklch(0.205)` → ratio à mesurer mais à 10px c'est limite. | Moyenne |
| A3 | **Focus visible**. Le sidebar nav utilise `focus-visible:ring-2 focus-visible:ring-primary/45` ✅. À auditer sur tous les autres interactifs (cards cliquables, rows de table, chips). | Moyenne |
| A4 | **Status uniquement par couleur**. Les chips "En ligne / Hors ligne / À surveiller" se distinguent par couleur seule. Daltoniens : aucune redondance d'information (icône + texte est OK, mais à uniformiser). | Moyenne |
| A5 | **`aria-label` sur sidebar items** ✅ déjà présent. Bon point. | — |
| A6 | **`SheetTitle sr-only`** ✅ présent dans le mobile sidebar. Bon. | — |
| A7 | **Heading hierarchy** : à vérifier que chaque page a un `<h1>` unique et que les sections suivent h2 → h3. Probablement plusieurs h2 sans h1 dans les sous-composants. | Moyenne |
| A8 | **Live region** pour le flux d'accès en temps réel ? Si oui, doit être `aria-live="polite"` pour annoncer les nouveaux événements aux lecteurs d'écran. À vérifier. | Faible |

---

## 4. Système de design — refonte recommandée

Travail prérequis qui débloque tout le reste.

### 4.1 Tokens à ajouter dans `styles/globals.css`

```css
:root {
  /* Brand — à choisir : SecurePoint suggère bleu acier ou vert sécurité */
  --brand: oklch(0.55 0.18 240);          /* exemple bleu */
  --brand-foreground: oklch(0.99 0 0);
  --brand-soft: oklch(0.55 0.18 240 / 0.12);

  /* Semantic */
  --success: oklch(0.65 0.16 155);
  --success-foreground: oklch(0.99 0 0);
  --success-soft: oklch(0.65 0.16 155 / 0.14);

  --warning: oklch(0.75 0.16 75);
  --warning-foreground: oklch(0.15 0 0);
  --warning-soft: oklch(0.75 0.16 75 / 0.16);

  --info: oklch(0.65 0.13 230);
  --info-foreground: oklch(0.99 0 0);
  --info-soft: oklch(0.65 0.13 230 / 0.14);

  /* destructive existe déjà */
  --destructive-soft: oklch(0.577 0.245 27.325 / 0.14);
}
```

Et leurs équivalents `.dark { … }` ajustés en luminosité.

### 4.2 Décision : `--primary` doit-il devenir la brand ?

Actuellement `--primary` = noir/blanc (utilisé pour boutons primaires, sidebar gradient). C'est le pattern shadcn par défaut et c'est volontaire. **Recommandation** : créer un token `--brand` séparé, garder `--primary` pour le contraste neutre, et utiliser `--brand` pour les CTA principaux et l'accent visuel. Ça permet de changer la marque sans casser les boutons "secondaires".

### 4.3 Font

Choisir : soit Geist (déclaré dans CSS), soit Inter (chargé dans layout). **Recommandation** : Inter est plus large, plus testé. Supprimer la mention Geist du CSS et harmoniser.

---

## 5. Composants partagés à créer

Ces 4 composants éliminent ~50% des problèmes de cohérence :

### 5.1 `<EmptyState />` — **priorité 1**

```tsx
// components/ui/empty-state.tsx
type Props = {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void; icon?: LucideIcon }
  secondaryAction?: { label: string; href?: string; onClick?: () => void }
}
```

Une illustration légère (icône 48px en cercle teinté brand-soft), titre, description courte, 1-2 CTA. À utiliser dans les 8+ pages qui affichent du vide actuellement.

### 5.2 `<StatusChip />` — **priorité 1**

Unifie tous les "API connectée / Webhook actif / Live / En direct / Hors ligne / À surveiller…" :

```tsx
type Props = {
  variant: "success" | "warning" | "danger" | "info" | "neutral"
  label: string
  icon?: LucideIcon
  pulse?: boolean // pour les "live"
}
```

### 5.3 `<PageHeader />` — **priorité 2**

Standardise tous les page heroes. Variantes :
- `compact` : breadcrumb + titre + actions (pour pages denses comme Devices)
- `default` : titre + description + chips + actions (pour landing pages)
- Skip les chips quand toutes les valeurs sont zéro (state vide)

### 5.4 `<DataTable />` responsive — **priorité 3**

Wrapper de `Table` qui passe en mode "stack of cards" sur mobile. Réutilisable pour Access Logs, Devices, Employees, Audit, Visitors.

---

## 6. Plan d'action priorisé

### Tier 1 — Quick wins (≈ 1-2 jours)

1. **Ajouter les tokens sémantiques** (success/warning/info/brand) dans `globals.css` light + dark.
2. **Créer `<EmptyState />`** et le câbler dans Devices, Employees, Access Logs, Visitors, Audit.
3. **Créer `<StatusChip />`** et remplacer toutes les implémentations ad-hoc.
4. **Corriger l'inconsistance Geist/Inter** (1 ligne dans `globals.css`).
5. **Skeletonner les chargements** ("Chargement des timetables…" → `<Skeleton />`).

### Tier 2 — Refonte structurelle (≈ 3-5 jours)

6. **`<PageHeader />`** unifié + déclinaisons par variante.
7. **Refonte du Header** (top bar) : grouper les 3 status (API, Webhook, Gateway) dans un seul popover "System status" avec détail au clic. Retirer les détails timezone/datetime du badge principal.
8. **Hiérarchie KPI** : sur la home, élever 1 card "lead" (la plus actionable ce jour) + 3 secondaires plus petites.
9. **Form Reports correction** : remplacer les 4 paires HH:MM par un `<TimeInput />` propre, ajouter validation, mobile-friendly.
10. **Tableau d'accès realtime mobile** : variant "card stack" en < md.

### Tier 3 — Polish & a11y (≈ 2-3 jours)

11. **Audit a11y complet** (axe-core), corriger heading hierarchy, ajouter `aria-live` sur le flux realtime.
12. **Touch targets** ≥ 44px sur toutes les rows et chips.
13. **Animations** : harmoniser les durées (`animate-fade-up` actuel = bien, l'étendre à plus d'endroits).
14. **States hover/active** plus expressifs sur les cards interactives (lift + shadow).

---

## 7. Pages prioritaires à retravailler dans Claude Design

Suggestion d'ordre pour itérer dans `claude.ai/design`. Pour chaque page, j'inclus un **prompt de départ** que tu peux copier directement.

### 7.1 Empty state Devices (la pire actuellement)

> Design a clean, dark-mode empty state for an access control device inventory page. Context: a security/access platform called SecurePoint that manages Hikvision card readers and turnstiles. The user has not added any device yet. Show: a soft glowing icon (Cpu/Server, 48px) in a translucent brand-blue circle, headline "Aucun appareil connecté", description "Ajoutez votre premier lecteur Hikvision pour commencer à recevoir les évènements d'accès en temps réel.", primary CTA "+ Ajouter un appareil par IP", secondary link "Importer depuis HikCentral". Width 720px. Style: Tailwind/shadcn, oklch dark theme, rounded-xl card, subtle gradient border.

### 7.2 KPI hero du Dashboard

> Redesign the top-of-dashboard KPI section for a workforce + access control SaaS. Currently it's 4 identical cards (Présents, Absences, Retards, Appareils actifs). Make it a "lead + 3 secondary" hierarchy: one large card showing "Présents aujourd'hui — 142/150" with progress ring, micro-trend sparkline, and a subtle "since yesterday +3" delta. Three smaller cards next to it, half height, for Absences/Retards/Appareils. Use brand-blue accents for the lead card only. French labels.

### 7.3 Header / top bar épuré

> Redesign the top bar of an access control SaaS dashboard. Current state has 8 elements competing: search input, "API connectée" chip, "Webhook actif" chip, tenant code "HQ-CASA", timezone "Africa/Abidjan", datetime, "+ Action rapide" button, notification bell, avatar. Goal: reduce to 4 visible elements: search (with keyboard hint ⌘K), system-status pill (single, expands to popover with API/Webhook/Gateway details on click), notifications, avatar+menu. Tenant + timezone go into the avatar menu. The "+ Action rapide" button becomes an obvious primary CTA on the right. Dark mode, French.

### 7.4 Form de correction de pointage (Reports)

> Design a single-employee timesheet correction form for a French HR + access control product. Fields: date picker, employee select, arrivée (HH:MM), départ (HH:MM), pause début (HH:MM), pause fin (HH:MM), heures sup (decimal, optional), commentaire (textarea). Constraints: must work on mobile, time inputs should be quick to type (no nested HH/MM dropdowns), validation should be visible inline. Provide a calm dark-mode shadcn-style layout with logical grouping (date+person, then times, then optional). Two CTAs: "Enregistrer la correction" (primary) and "Recharger".

---

## 8. Métriques de succès

Comment savoir si la refonte a marché :

- **Onboarding** : un nouveau tenant peut ajouter son premier device en < 60 s à partir de l'empty state (vs. friction actuelle).
- **Cohérence visuelle** : 100% des status indicators passent par `<StatusChip />`.
- **Mobile usable** : les 5 pages prioritaires (Dashboard, Devices, Employees, Access Logs, Reports) passent un test Lighthouse Mobile > 90 et un test "tâche réelle au pouce".
- **A11y** : axe-core sur les pages prioritaires = 0 erreur, < 5 warnings.
- **Bundle** : pas de régression > 5%.

---

## 9. Annexes

### 9.1 Fichiers clés audités

- `styles/globals.css` (126 lignes — tokens shadcn par défaut)
- `app/layout.tsx` (72 lignes)
- `components/dashboard/app-sidebar.tsx` (218 lignes — sidebar à 5 sections)
- `components/dashboard/section-tabs.tsx` (5 sections, 17 sub-tabs)
- `components/dashboard/header.tsx`
- `components/dashboard/dashboard-overview.tsx` + sous-composants (KPICards, ManagerHero, NeedsAttention, PresenceWeek, UpcomingLeave)
- `components/employees/employee-table.tsx` (669 lignes)
- `app/devices/page.tsx` (1706 lignes — gros, mérite probablement un split)

### 9.2 Note sur les screenshots

Les 7 screenshots dans `screenshots-uiux/` datent du 3 avril 2026. Ils représentent une **version antérieure** : sidebar plate avec libellés de section visibles (PILOTAGE / RESSOURCES RH / INFRASTRUCTURE / ADMINISTRATION), tous les liens de page exposés au même niveau. Le code actuel a évolué vers une nav 2-niveaux plus propre. Recommandation : refaire les screenshots après les Tier 1 pour avoir un avant/après réel.

### 9.3 Stack confirmée

Next.js 15 (Turbopack), React 19, Tailwind 4, shadcn/ui, Radix UI complet, Stripe, Sonner, Lucide, Recharts (probable), date-fns, embla-carousel, react-hook-form + Zod, next-themes.

---

*Audit produit le 2026-05-05. Ce document est un point de départ — les priorités peuvent bouger en fonction des contraintes business.*
