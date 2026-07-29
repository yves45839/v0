const en = {
  title: "Audit log",
  subtitle: "History of tenant actions",
  restricted: "Restricted access",
  eventCount: (n: number) => `${n} event${n !== 1 ? "s" : ""} recorded`,
  refresh: "Refresh",

  forbiddenTitle: "The audit log is restricted to operators and administrators.",
  forbiddenHint: "Contact a tenant administrator to request access.",

  actorPlaceholder: "Filter by actor (username)…",
  actionPlaceholder: "Action",
  allActions: "All actions",
  dateFromAria: "Start date",
  dateToAria: "End date",
  filter: "Filter",
  reset: "Reset",

  loadError: "Failed to load the audit log.",
  retry: "Retry",

  loading: "Loading…",
  shownCount: (n: number) => `${n} event${n !== 1 ? "s" : ""} shown`,
  loadingEvents: "Loading events…",
  noEvents: "No audit events",
  loadMore: "Load more",

  system: "System",
  detailActor: "Actor",
  detailTarget: "Target",
  detailIp: "IP address",
  detailEvent: "Event",
  noExtraData: "No additional data",

  actionLogin: "Login",
  actionCreate: (model: string) => `Create — ${model}`,
  actionUpdate: (model: string) => `Update — ${model}`,
  actionDelete: (model: string) => `Delete — ${model}`,

  models: {
    employee: "Employee",
    department: "Department",
    planning: "Schedule",
    workshift: "Shift",
    accessgroup: "Access group",
    leaverequest: "Leave request",
    device: "Device",
  } as Record<string, string>,
}

const fr: typeof en = {
  title: "Journal d'audit",
  subtitle: "Historique des actions du tenant",
  restricted: "Accès restreint",
  eventCount: (n: number) => `${n} événement${n !== 1 ? "s" : ""} enregistré${n !== 1 ? "s" : ""}`,
  refresh: "Actualiser",

  forbiddenTitle: "Journal d'audit réservé aux opérateurs et administrateurs.",
  forbiddenHint: "Contactez un administrateur du tenant pour obtenir l'accès.",

  actorPlaceholder: "Filtrer par acteur (nom d'utilisateur)…",
  actionPlaceholder: "Action",
  allActions: "Toutes les actions",
  dateFromAria: "Date de début",
  dateToAria: "Date de fin",
  filter: "Filtrer",
  reset: "Réinitialiser",

  loadError: "Erreur lors du chargement du journal d'audit.",
  retry: "Réessayer",

  loading: "Chargement…",
  shownCount: (n: number) => `${n} événement${n !== 1 ? "s" : ""} affiché${n !== 1 ? "s" : ""}`,
  loadingEvents: "Chargement des événements…",
  noEvents: "Aucun événement d'audit",
  loadMore: "Charger plus",

  system: "Système",
  detailActor: "Acteur",
  detailTarget: "Cible",
  detailIp: "Adresse IP",
  detailEvent: "Événement",
  noExtraData: "Aucune donnée supplémentaire",

  actionLogin: "Connexion",
  actionCreate: (model: string) => `Création — ${model}`,
  actionUpdate: (model: string) => `Modification — ${model}`,
  actionDelete: (model: string) => `Suppression — ${model}`,

  models: {
    employee: "Employé",
    department: "Département",
    planning: "Planning",
    workshift: "Horaire",
    accessgroup: "Groupe d'accès",
    leaverequest: "Demande de congé",
    device: "Appareil",
  } as Record<string, string>,
}

export const auditDict = { en, fr }
