const en = {
  // Header
  title: "Visitors",
  onSiteSubtitle: (n: number) => `${n} visitor${n !== 1 ? "s" : ""} currently on site`,
  refresh: "Refresh",
  newVisitor: "New visitor",

  // Statuses
  statusExpected: "Expected",
  statusOnSite: "On site",
  statusCheckedOut: "Checked out",
  statusExpired: "Expired",

  // KPIs
  kpiExpected: "Expected",
  kpiOnSite: "On site",
  kpiCheckedOut: "Checked out",
  kpiExpired: "Expired",

  // Loading / error states
  loadingVisitors: "Loading visitors…",
  loadErrorTitle: "Loading error",
  retry: "Retry",
  loadFailed: "Could not load visitors.",

  // On-site strip
  currentlyOnSite: "Currently on site",

  // Tabs
  tabAll: "All",
  tabOnSite: "On site",
  tabBadges: "Active badges",

  // Search / filters
  searchPlaceholder: "Search visitors…",
  statusPlaceholder: "Status",
  allStatuses: "All statuses",

  // Empty states
  emptyTitle: "No visitors yet",
  emptyDescription: "Create a visitor to assign them a badge and a validity window.",
  noResults: "No results",
  noOnSite: "No visitors currently on site",
  noMatchFilters: "No visitors match the filters",
  noBadgesTitle: "No active badges",
  noBadgesDescription: "No badged visitors currently on site",

  // Row / cards
  endVisit: "End visit",
  end: "End",
  editVisitorAria: "Edit visitor",
  deleteVisitorAria: "Delete visitor",
  accessGroupsCount: (n: number) => `${n} access group${n !== 1 ? "s" : ""}`,
  validity: (from: string, to: string) => `Validity: ${from} → ${to}`,

  // Form dialog
  createTitle: "New visitor",
  createDescription: "Enter the visitor's details and validity window",
  createSubmit: "Create visitor",
  editTitle: "Edit visitor",
  editDescription: (name: string) => `Badge and validity for ${name}`,
  editSubmit: "Save",
  firstName: "First name",
  lastName: "Last name",
  firstNamePlaceholder: "First name",
  lastNamePlaceholder: "Last name",
  email: "Email",
  emailPlaceholder: "email@example.com",
  phone: "Phone",
  phonePlaceholder: "+33 6 …",
  cardNo: "Badge / card no.",
  cardNoPlaceholder: "Card number (optional)",
  validFrom: "Valid from",
  validTo: "Valid until",
  accessGroup: "Access group",
  none: "None",
  cancel: "Cancel",

  // Toasts / confirmations
  createdWithWarning: (detail: string) => `Visitor created, partial reader sync: ${detail}`,
  created: (name: string) => `Visitor "${name}" created.`,
  createFailed: "Could not create the visitor.",
  updatedWithWarning: (detail: string) => `Visitor updated, partial reader sync: ${detail}`,
  updated: "Visitor updated.",
  updateFailed: "Could not update the visitor.",
  visitEndedWithWarning: (detail: string) => `Visit ended, partial reader sync: ${detail}`,
  visitEnded: (name: string) => `${name}'s visit has ended.`,
  endVisitFailed: "Could not end the visit.",
  deleteConfirm: (name: string) => `Delete visitor "${name}"? This action is permanent.`,
  deleted: (name: string) => `Visitor "${name}" deleted.`,
  deleteFailed: "Could not delete the visitor.",

  // Gateway / API mapped messages
  gatewayNoDetail: "some readers were not updated.",
  tenantUnresolved: "Unable to determine the active tenant.",
}

const fr: typeof en = {
  // Header
  title: "Visiteurs",
  onSiteSubtitle: (n: number) => `${n} visiteur${n !== 1 ? "s" : ""} actuellement sur site`,
  refresh: "Actualiser",
  newVisitor: "Nouveau visiteur",

  // Statuses
  statusExpected: "Attendu",
  statusOnSite: "Sur site",
  statusCheckedOut: "Parti",
  statusExpired: "Expiré",

  // KPIs
  kpiExpected: "Attendus",
  kpiOnSite: "Sur site",
  kpiCheckedOut: "Repartis",
  kpiExpired: "Expirés",

  // Loading / error states
  loadingVisitors: "Chargement des visiteurs…",
  loadErrorTitle: "Erreur de chargement",
  retry: "Réessayer",
  loadFailed: "Impossible de charger les visiteurs.",

  // On-site strip
  currentlyOnSite: "Actuellement sur site",

  // Tabs
  tabAll: "Tous",
  tabOnSite: "Sur site",
  tabBadges: "Badges actifs",

  // Search / filters
  searchPlaceholder: "Rechercher un visiteur…",
  statusPlaceholder: "Statut",
  allStatuses: "Tous statuts",

  // Empty states
  emptyTitle: "Aucun visiteur enregistré",
  emptyDescription: "Créez un visiteur pour lui attribuer un badge et une fenêtre de validité.",
  noResults: "Aucun résultat",
  noOnSite: "Aucun visiteur actuellement sur site",
  noMatchFilters: "Aucun visiteur ne correspond aux filtres",
  noBadgesTitle: "Aucun badge actif",
  noBadgesDescription: "Aucun visiteur avec badge actuellement sur site",

  // Row / cards
  endVisit: "Terminer la visite",
  end: "Terminer",
  editVisitorAria: "Modifier le visiteur",
  deleteVisitorAria: "Supprimer le visiteur",
  accessGroupsCount: (n: number) => `${n} groupe${n !== 1 ? "s" : ""} d'accès`,
  validity: (from: string, to: string) => `Validité : ${from} → ${to}`,

  // Form dialog
  createTitle: "Nouveau visiteur",
  createDescription: "Renseignez les informations du visiteur et sa fenêtre de validité",
  createSubmit: "Créer le visiteur",
  editTitle: "Modifier le visiteur",
  editDescription: (name: string) => `Badge et validité de ${name}`,
  editSubmit: "Enregistrer",
  firstName: "Prénom",
  lastName: "Nom",
  firstNamePlaceholder: "Prénom",
  lastNamePlaceholder: "Nom",
  email: "Email",
  emailPlaceholder: "email@exemple.com",
  phone: "Téléphone",
  phonePlaceholder: "+33 6 …",
  cardNo: "N° de badge / carte",
  cardNoPlaceholder: "Numéro de carte (optionnel)",
  validFrom: "Valide du",
  validTo: "Valide jusqu'au",
  accessGroup: "Groupe d'accès",
  none: "Aucun",
  cancel: "Annuler",

  // Toasts / confirmations
  createdWithWarning: (detail: string) => `Visiteur créé, synchronisation lecteur partielle : ${detail}`,
  created: (name: string) => `Visiteur « ${name} » créé.`,
  createFailed: "Échec de la création du visiteur.",
  updatedWithWarning: (detail: string) => `Visiteur mis à jour, synchronisation lecteur partielle : ${detail}`,
  updated: "Visiteur mis à jour.",
  updateFailed: "Échec de la mise à jour du visiteur.",
  visitEndedWithWarning: (detail: string) => `Visite terminée, synchronisation lecteur partielle : ${detail}`,
  visitEnded: (name: string) => `Visite de ${name} terminée.`,
  endVisitFailed: "Impossible de terminer la visite.",
  deleteConfirm: (name: string) => `Supprimer le visiteur « ${name} » ? Cette action est définitive.`,
  deleted: (name: string) => `Visiteur « ${name} » supprimé.`,
  deleteFailed: "Échec de la suppression du visiteur.",

  // Gateway / API mapped messages
  gatewayNoDetail: "certains lecteurs n'ont pas été mis à jour.",
  tenantUnresolved: "Impossible de déterminer le tenant actif.",
}

export const visitorsDict = { en, fr }
