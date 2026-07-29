const en = {
  // Header
  title: "Access groups",
  loadingShort: "Loading…",
  summary: (groups: number, readers: number, schedules: number) =>
    `${groups} group${groups !== 1 ? "s" : ""} · ${readers} reader${readers !== 1 ? "s" : ""} · ${schedules} schedule${schedules !== 1 ? "s" : ""}`,
  newGroup: "New group",

  // Loading / error states
  loadingGroups: "Loading access groups…",
  loadFailed: "Could not load access groups.",
  retry: "Retry",
  refreshFailed: "Could not refresh groups.",
  dismiss: "Dismiss",

  // KPIs
  kpiGroups: "Access groups",
  kpiReaders: "Readers",
  kpiSchedules: "Schedules",
  kpiEmployees: "Employees covered",

  // Tabs
  tabGroups: "Groups",
  tabReaders: "Readers",
  tabSchedules: "Schedules",

  // Search
  searchPlaceholder: "Search…",

  // Device status chips
  statusOnline: "Online",
  statusOffline: "Offline",
  statusUnknown: "Unknown status",

  // Group card
  readersLabel: (n: number) => `Reader${n !== 1 ? "s" : ""}`,
  employeesLabel: (n: number) => `Employee${n !== 1 ? "s" : ""}`,
  noLinkedSchedule: "No linked schedule",
  edit: "Edit",
  deleteGroupAria: (name: string) => `Delete ${name}`,

  // Groups tab
  emptyGroups: "No access groups — create the first one",
  noGroupMatch: "No groups match your search.",
  deleteConfirm: (name: string) => `Delete access group "${name}"?`,
  deleteFailed: "Could not delete the group.",

  // Readers tab
  emptyReaders: "No readers registered for this tenant.",
  noReaderMatch: "No readers match your search.",
  readerIndex: (index: string | number) => `index ${index}`,
  linkedGroups: "Linked access groups",
  noGroupUsesReader: "No group uses this reader.",

  // Schedules tab
  schedulesReadOnlyPrefix: "Read-only: schedules are created and edited on the ",
  schedulesReadOnlyLink: "Planning",
  schedulesReadOnlySuffix: " page.",
  emptySchedules: "No schedules defined for this tenant.",
  noScheduleMatch: "No schedules match your search.",

  // Create / edit dialog
  editGroupTitle: "Edit access group",
  newGroupTitle: "New access group",
  editGroupDescription: "Update the name, schedule and authorized readers.",
  newGroupDescription: "Set a name, a schedule and the readers the group can access.",
  nameLabel: "Name",
  namePlaceholder: "e.g. Production team",
  nameRequired: "The group name is required.",
  descriptionLabel: "Description",
  descriptionPlaceholder: "Optional group description",
  scheduleLabel: "Schedule",
  schedulePlaceholder: "Select a schedule",
  noScheduleOption: "No schedule",
  authorizedReaders: "Authorized readers",
  noDevicesAvailable: "No readers available for this tenant.",
  readersSelected: (n: number) => `${n} reader${n !== 1 ? "s" : ""} selected`,
  tenantUnresolved: "Unable to determine the active tenant. Sign in again and retry.",
  saveFailed: "Could not save the access group.",
  cancel: "Cancel",
  save: "Save",
  createGroup: "Create group",
}

const fr: typeof en = {
  // Header
  title: "Groupes d'accès",
  loadingShort: "Chargement…",
  summary: (groups: number, readers: number, schedules: number) =>
    `${groups} groupe${groups !== 1 ? "s" : ""} · ${readers} lecteur${readers !== 1 ? "s" : ""} · ${schedules} planning${schedules !== 1 ? "s" : ""}`,
  newGroup: "Nouveau groupe",

  // Loading / error states
  loadingGroups: "Chargement des groupes d'accès…",
  loadFailed: "Chargement des groupes d'accès impossible.",
  retry: "Réessayer",
  refreshFailed: "Actualisation des groupes impossible.",
  dismiss: "Fermer",

  // KPIs
  kpiGroups: "Groupes d'accès",
  kpiReaders: "Lecteurs",
  kpiSchedules: "Plannings",
  kpiEmployees: "Employés couverts",

  // Tabs
  tabGroups: "Groupes",
  tabReaders: "Lecteurs",
  tabSchedules: "Horaires",

  // Search
  searchPlaceholder: "Rechercher…",

  // Device status chips
  statusOnline: "En ligne",
  statusOffline: "Hors ligne",
  statusUnknown: "Statut inconnu",

  // Group card
  readersLabel: (n: number) => `Lecteur${n !== 1 ? "s" : ""}`,
  employeesLabel: (n: number) => `Employé${n !== 1 ? "s" : ""}`,
  noLinkedSchedule: "Aucun planning associé",
  edit: "Modifier",
  deleteGroupAria: (name: string) => `Supprimer ${name}`,

  // Groups tab
  emptyGroups: "Aucun groupe d'accès — créez le premier",
  noGroupMatch: "Aucun groupe ne correspond à la recherche.",
  deleteConfirm: (name: string) => `Supprimer le groupe d'accès « ${name} » ?`,
  deleteFailed: "Suppression du groupe impossible.",

  // Readers tab
  emptyReaders: "Aucun lecteur enregistré pour ce tenant.",
  noReaderMatch: "Aucun lecteur ne correspond à la recherche.",
  readerIndex: (index: string | number) => `index ${index}`,
  linkedGroups: "Groupes d'accès associés",
  noGroupUsesReader: "Aucun groupe n'utilise ce lecteur.",

  // Schedules tab
  schedulesReadOnlyPrefix: "Consultation seule : la création et la modification des plannings se font dans la page ",
  schedulesReadOnlyLink: "Planning",
  schedulesReadOnlySuffix: ".",
  emptySchedules: "Aucun planning défini pour ce tenant.",
  noScheduleMatch: "Aucun planning ne correspond à la recherche.",

  // Create / edit dialog
  editGroupTitle: "Modifier le groupe d'accès",
  newGroupTitle: "Nouveau groupe d'accès",
  editGroupDescription: "Mettez à jour le nom, le planning et les lecteurs autorisés.",
  newGroupDescription: "Définissez un nom, un planning et les lecteurs accessibles au groupe.",
  nameLabel: "Nom",
  namePlaceholder: "Ex : Équipe production",
  nameRequired: "Le nom du groupe est obligatoire.",
  descriptionLabel: "Description",
  descriptionPlaceholder: "Description facultative du groupe",
  scheduleLabel: "Planning",
  schedulePlaceholder: "Sélectionner un planning",
  noScheduleOption: "Aucun planning",
  authorizedReaders: "Lecteurs autorisés",
  noDevicesAvailable: "Aucun lecteur disponible pour ce tenant.",
  readersSelected: (n: number) => `${n} lecteur${n !== 1 ? "s" : ""} sélectionné${n !== 1 ? "s" : ""}`,
  tenantUnresolved: "Impossible de déterminer le tenant actif. Reconnectez-vous puis réessayez.",
  saveFailed: "Enregistrement du groupe d'accès impossible.",
  cancel: "Annuler",
  save: "Enregistrer",
  createGroup: "Créer le groupe",
}

export const zonesDict = { en, fr }
