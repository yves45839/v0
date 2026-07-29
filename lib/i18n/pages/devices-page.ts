const en = {
  // Hero
  heroKicker: "Hikvision infrastructure",
  heroTitle: "Devices",
  heroSubtitle: "Inventory, health and maintenance actions for the fleet's controllers and readers.",
  syncAction: "Sync",
  manualOnboarding: "Manual onboarding",
  addAction: "Add",

  // Metric cards
  metricOnline: "Online",
  metricOnlineNote: (total: number) => `of ${total} devices`,
  metricAlerts: "Alerts",
  metricAlertsNote: "To monitor",
  metricOffline: "Offline",
  metricOfflineNote: "Disconnected",
  metricTotal: "Total fleet",
  metricTotalTenants: (n: number) => `${n} tenant(s)`,
  metricTotalInventory: "Inventory",

  // Error banner
  errorKicker: "Error",

  // Filters
  filtersKicker: "Filters",
  filtersTitle: "Search & refine",
  resultsCount: (n: number) => `${n} result${n !== 1 ? "s" : ""}`,
  resetFilters: "Reset",
  searchPlaceholder: "Name, location or IP...",
  statusFilterAll: "All",
  statusFilterAttention: "To monitor",
  typePlaceholder: "Type",
  allTypes: "All types",
  tenantPlaceholder: "Tenant",
  allTenants: "All tenants",
  linkPlaceholder: "Connectivity",
  allLinks: "All links",
  linkedToCore: "Linked to core",
  notLinkedToCore: "Not linked",

  // Device types & statuses
  deviceTypes: {
    door_controller: "Door controller",
    reader: "Card reader",
    turnstile: "Turnstile",
    fingerprint: "Biometric reader",
    face_reader: "Face reader",
    camera: "IP camera",
  },
  statusLabels: {
    online: "Online",
    warning: "Alert",
    offline: "Offline",
  },
  statusInline: {
    online: "online",
    warning: "in alert",
    offline: "offline",
  },

  // Gateway device mapping
  defaultDeviceName: "Hikvision device",
  tenantLocation: (code: string) => `Tenant ${code}`,
  unassigned: "Unassigned",
  lastSeenActive: "Active",
  lastSeenCheck: "To check",

  // Diagnostics
  diagUnreachable: "Terminal unreachable, network check required.",
  diagUnstable: "Unstable connectivity detected.",
  diagNominal: "Nominal connectivity.",
  uptimeDays: (n: number) => `${n}d`,

  // Load / fetch errors
  gatewayUnreachable: "Hikvision gateway unreachable.",
  unexpectedError: "Unexpected error.",
  loadErrorTitle: "Unable to load devices",

  // Sync all
  adminOnly: "Restricted to platform administrators",
  syncAllFailed: "Gateway sync failed",

  // Add device (API dialog)
  tenantRequired: "The tenant_code field is required.",
  serialRequired: "The serial_number/sn field is required.",
  ehomeKeyRequired: "The ehome_key field is required.",
  passwordRequired: "The device_password field is required.",
  createdMessage: "Device added successfully via /api/devices/onboard/ (201).",
  createdToast: "Device added successfully",
  alreadyOnboardedMessage: "Device already onboarded on this tenant (200).",
  alreadyOnboardedToast: "Device already registered on this tenant",
  conflictMessage: "Conflict: this serial number is already assigned to another tenant.",
  conflictToast: "Serial number conflict",

  // Delete
  deleteMissingCoreId: "Cannot delete: local id not found. Run a sync then try again.",
  deleteSuccess: (name: string) => `Device "${name}" deleted`,
  deleteErrorFallback: "Device deletion error",
  deleteErrorToast: "Error while deleting the device",

  // Restart
  restartMissingCoreId: "Cannot restart: local id not found. Run a sync then try again.",
  restartSuccess: (name: string) => `Restart of "${name}" started`,
  restartErrorFallback: "Device restart error",
  restartErrorToast: "Error while restarting the device",

  // Per-device sync / verify / diagnostics
  syncDeviceNotFound: (name: string) => `Device "${name}" was not found after sync.`,
  syncDeviceDone: (name: string) => `Sync of "${name}" complete`,
  verifyNotFound: "Verification complete, device not found in the gateway feed.",
  verifyResult: (name: string, status: string) => `Verification complete: ${name} is ${status}.`,
  diagnosticToast: (name: string, message: string) => `Diagnostics ${name}: ${message}`,

  // Update
  updateMissingCoreId: "Cannot edit: local id not found. Run a sync then try again.",
  nameRequired: "Name is required.",
  updateSuccess: "Device updated successfully",
  updateErrorFallback: "Device update error",
  updateErrorToast: "Error while updating the device",

  // Card
  actionsAria: "Actions",
  edit: "Edit",
  restart: "Restart",
  restarting: "Restarting...",
  verify: "Verify",
  verifying: "Verifying...",
  diagnose: "Diagnose",
  diagnosing: "Diagnosing...",
  deleteAction: "Delete",
  deleting: "Deleting...",
  syncDevice: "Sync",
  syncingDevice: "Syncing...",
  linkedBadge: "Linked",
  unlinkedBadge: "Unlinked",
  statEvents: "Events",
  statUsers: "Users",
  statFirmware: "Firmware",

  // Empty states
  emptyNoDevices: "No devices connected",
  emptyNoMatch: "No devices match the filters",
  emptyNoDevicesHint: "Add your first Hikvision reader to get started.",
  emptyNoMatchHint: "Broaden the search or reset the filters.",
  addDevice: "Add a device",

  // Add device dialog
  addDialogTitle: "Add a device",
  addDialogDesc: "Required fields: tenant, SN, ehome_key, password.",
  tenantLabel: "Tenant",
  loadingPlaceholder: "Loading...",
  selectTenantPlaceholder: "Select a tenant",
  serialLabel: "Serial number",
  ehomeKeyLabel: "eHome key",
  passwordLabel: "Password",
  passwordPlaceholder: "required",
  submitting: "Adding...",
  submitViaApi: "Add via API",

  // Edit dialog
  editDialogTitle: "Edit device",
  editDialogDesc: "Name and fields allowed by the backend.",
  nameLabel: "Name",
  namePlaceholder: "Device name",
  saving: "Saving...",
  save: "Save",

  // Details dialog
  tabInfo: "Information",
  tabNetwork: "Network",
  tabActivity: "Activity",
  detailModel: "Model",
  detailSerial: "Serial",
  detailLocation: "Location",
  detailFirmware: "Firmware",
  statusOnlineTitle: "Online",
  statusUnstableTitle: "Unstable connection",
  statusOfflineTitle: "Offline",
  lastActivity: (value: string) => `Last activity: ${value}`,
  ipLabel: "IP",
  macLabel: "MAC",
  diagnosticsTitle: "Diagnostics",
  latency: "Latency",
  packetLoss: "Packet loss",
  uptime: "Uptime",
  activityEvents: "Events",
  activityUsers: "Users",

  // Confirmations
  deleteConfirmTitle: "Delete device",
  deleteConfirmDesc: (name: string | null) =>
    `This action will remove ${name ? `"${name}"` : "the device"} from the inventory.`,
  restartConfirmTitle: "Restart device",
  restartConfirmDesc: (name: string | null) =>
    `Restarting ${name ? `"${name}"` : "this device"} may temporarily interrupt passages.`,

  // Manual onboarding dialog (add-device-by-ip)
  manualDialogDesc: "Manually enter the device information (gateway onboarding).",
  manualWarning: "Manual entry — Check the information before saving.",
  registrationInfo: "Registration information",
  deviceNamePlaceholder: "E.g. Hall A entrance reader",
  ehomeKeyPlaceholder: "32 hex characters",
  adminPasswordPlaceholder: "Admin password",
}

const fr: typeof en = {
  // Hero
  heroKicker: "Infrastructure Hikvision",
  heroTitle: "Appareils",
  heroSubtitle: "Inventaire, santé et actions de maintenance sur les contrôleurs et lecteurs du parc.",
  syncAction: "Synchroniser",
  manualOnboarding: "Onboarding manuel",
  addAction: "Ajouter",

  // Metric cards
  metricOnline: "En ligne",
  metricOnlineNote: (total: number) => `sur ${total} appareils`,
  metricAlerts: "Alertes",
  metricAlertsNote: "À surveiller",
  metricOffline: "Hors ligne",
  metricOfflineNote: "Déconnectés",
  metricTotal: "Total parc",
  metricTotalTenants: (n: number) => `${n} tenant(s)`,
  metricTotalInventory: "Inventaire",

  // Error banner
  errorKicker: "Erreur",

  // Filters
  filtersKicker: "Filtres",
  filtersTitle: "Recherche & affinage",
  resultsCount: (n: number) => `${n} résultat${n !== 1 ? "s" : ""}`,
  resetFilters: "Réinitialiser",
  searchPlaceholder: "Nom, localisation ou IP...",
  statusFilterAll: "Tous",
  statusFilterAttention: "À surveiller",
  typePlaceholder: "Type",
  allTypes: "Tous les types",
  tenantPlaceholder: "Tenant",
  allTenants: "Tous les tenants",
  linkPlaceholder: "Connectivité",
  allLinks: "Toutes les liaisons",
  linkedToCore: "Lié au cœur",
  notLinkedToCore: "Non lié",

  // Device types & statuses
  deviceTypes: {
    door_controller: "Contrôleur de porte",
    reader: "Lecteur de carte",
    turnstile: "Tourniquet",
    fingerprint: "Lecteur biométrique",
    face_reader: "Lecteur facial",
    camera: "Caméra IP",
  },
  statusLabels: {
    online: "En ligne",
    warning: "Alerte",
    offline: "Hors ligne",
  },
  statusInline: {
    online: "en ligne",
    warning: "en alerte",
    offline: "hors ligne",
  },

  // Gateway device mapping
  defaultDeviceName: "Appareil Hikvision",
  tenantLocation: (code: string) => `Tenant ${code}`,
  unassigned: "Non assigné",
  lastSeenActive: "Actif",
  lastSeenCheck: "À vérifier",

  // Diagnostics
  diagUnreachable: "Terminal injoignable, vérification réseau requise.",
  diagUnstable: "Connectivité instable détectée.",
  diagNominal: "Connectivité nominale.",
  uptimeDays: (n: number) => `${n}j`,

  // Load / fetch errors
  gatewayUnreachable: "Passerelle Hikvision injoignable.",
  unexpectedError: "Erreur inattendue.",
  loadErrorTitle: "Impossible de charger les appareils",

  // Sync all
  adminOnly: "Réservé aux administrateurs de la plateforme",
  syncAllFailed: "Échec de la synchronisation passerelle",

  // Add device (API dialog)
  tenantRequired: "Le champ tenant_code est obligatoire.",
  serialRequired: "Le champ serial_number/sn est obligatoire.",
  ehomeKeyRequired: "Le champ ehome_key est obligatoire.",
  passwordRequired: "Le champ device_password est obligatoire.",
  createdMessage: "Appareil ajouté avec succès via /api/devices/onboard/ (201).",
  createdToast: "Appareil ajouté avec succès",
  alreadyOnboardedMessage: "Appareil déjà onboardé sur ce tenant (200).",
  alreadyOnboardedToast: "Appareil déjà enregistré sur ce tenant",
  conflictMessage: "Conflit : ce numéro de série est déjà affecté à un autre tenant.",
  conflictToast: "Conflit de numéro de série",

  // Delete
  deleteMissingCoreId: "Impossible de supprimer : id local introuvable. Lance une synchronisation puis réessaie.",
  deleteSuccess: (name: string) => `Appareil "${name}" supprimé`,
  deleteErrorFallback: "Erreur suppression appareil",
  deleteErrorToast: "Erreur lors de la suppression de l'appareil",

  // Restart
  restartMissingCoreId: "Impossible de redémarrer : id local introuvable. Lance une synchronisation puis réessaie.",
  restartSuccess: (name: string) => `Redémarrage de "${name}" lancé`,
  restartErrorFallback: "Erreur redémarrage appareil",
  restartErrorToast: "Erreur lors du redémarrage de l'appareil",

  // Per-device sync / verify / diagnostics
  syncDeviceNotFound: (name: string) => `L'appareil "${name}" n'a pas été retrouvé après synchronisation.`,
  syncDeviceDone: (name: string) => `Synchronisation de "${name}" terminée`,
  verifyNotFound: "Vérification terminée, appareil non retrouvé dans le flux gateway.",
  verifyResult: (name: string, status: string) => `Vérification terminée : ${name} est ${status}.`,
  diagnosticToast: (name: string, message: string) => `Diagnostic ${name} : ${message}`,

  // Update
  updateMissingCoreId: "Impossible de modifier : id local introuvable. Lance une synchronisation puis réessaie.",
  nameRequired: "Le nom est obligatoire.",
  updateSuccess: "Appareil modifié avec succès",
  updateErrorFallback: "Erreur modification appareil",
  updateErrorToast: "Erreur lors de la modification de l'appareil",

  // Card
  actionsAria: "Actions",
  edit: "Modifier",
  restart: "Redémarrer",
  restarting: "Redémarrage...",
  verify: "Vérifier",
  verifying: "Vérification...",
  diagnose: "Diagnostiquer",
  diagnosing: "Diagnostic...",
  deleteAction: "Supprimer",
  deleting: "Suppression...",
  syncDevice: "Synchroniser",
  syncingDevice: "Synchronisation...",
  linkedBadge: "Lié",
  unlinkedBadge: "Non lié",
  statEvents: "Events",
  statUsers: "Users",
  statFirmware: "Firmware",

  // Empty states
  emptyNoDevices: "Aucun appareil connecté",
  emptyNoMatch: "Aucun appareil ne correspond aux filtres",
  emptyNoDevicesHint: "Ajoutez votre premier lecteur Hikvision pour commencer.",
  emptyNoMatchHint: "Élargissez la recherche ou réinitialisez les filtres.",
  addDevice: "Ajouter un appareil",

  // Add device dialog
  addDialogTitle: "Ajouter un appareil",
  addDialogDesc: "Champs requis : tenant, SN, ehome_key, mot de passe.",
  tenantLabel: "Tenant",
  loadingPlaceholder: "Chargement...",
  selectTenantPlaceholder: "Sélectionner un tenant",
  serialLabel: "Numéro de série",
  ehomeKeyLabel: "Clé eHome",
  passwordLabel: "Mot de passe",
  passwordPlaceholder: "requis",
  submitting: "Ajout en cours...",
  submitViaApi: "Ajouter via API",

  // Edit dialog
  editDialogTitle: "Modifier l'appareil",
  editDialogDesc: "Nom et champs autorisés par le backend.",
  nameLabel: "Nom",
  namePlaceholder: "Nom de l'appareil",
  saving: "Enregistrement...",
  save: "Enregistrer",

  // Details dialog
  tabInfo: "Informations",
  tabNetwork: "Réseau",
  tabActivity: "Activité",
  detailModel: "Modèle",
  detailSerial: "Série",
  detailLocation: "Localisation",
  detailFirmware: "Firmware",
  statusOnlineTitle: "En ligne",
  statusUnstableTitle: "Connexion instable",
  statusOfflineTitle: "Hors ligne",
  lastActivity: (value: string) => `Dernière activité : ${value}`,
  ipLabel: "IP",
  macLabel: "MAC",
  diagnosticsTitle: "Diagnostics",
  latency: "Latence",
  packetLoss: "Paquets perdus",
  uptime: "Uptime",
  activityEvents: "Events",
  activityUsers: "Utilisateurs",

  // Confirmations
  deleteConfirmTitle: "Supprimer l'appareil",
  deleteConfirmDesc: (name: string | null) =>
    `Cette action supprimera ${name ? `"${name}"` : "l'appareil"} de l'inventaire.`,
  restartConfirmTitle: "Redémarrer l'appareil",
  restartConfirmDesc: (name: string | null) =>
    `Le redémarrage de ${name ? `"${name}"` : "cet appareil"} peut interrompre temporairement les passages.`,

  // Manual onboarding dialog (add-device-by-ip)
  manualDialogDesc: "Saisie manuelle des informations de l'appareil (onboarding passerelle).",
  manualWarning: "Saisie manuelle — Vérifiez les informations avant d'enregistrer.",
  registrationInfo: "Informations d'enregistrement",
  deviceNamePlaceholder: "Ex : Lecteur Entrée Hall A",
  ehomeKeyPlaceholder: "32 caractères hex",
  adminPasswordPlaceholder: "Mot de passe admin",
}

export const devicesPageDict = { en, fr }
export type DevicesPageDict = typeof en
