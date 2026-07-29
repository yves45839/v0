const en = {
  title: "Hikvision gateway & sync",
  subtitle: "Read-only status of the gateway, event ingestion and billing.",
  refresh: "Refresh",
  loading: "Loading…",
  unexpectedError: "An unexpected error occurred.",
  platformInfoError: (status: number) => `Unable to fetch platform information (${status})`,
  // Gateway card
  gatewayCardTitle: "Hik Device Gateway",
  gatewayConnected: "Connected",
  gatewayUnreachable: "Unreachable",
  gatewayDeviceCount: (n: number): string => (n > 1 ? "devices seen by the gateway" : "device seen by the gateway"),
  // Events card
  eventsCardTitle: "Event ingestion",
  lastEventReceived: "Last event received",
  sourceRealtime: "Real-time (webhook)",
  sourceCatchup: "Catch-up (catchup)",
  noEventsYet: "No events received yet.",
  webhookInfo: "Events arrive via the gateway webhook at",
  // Devices card
  devicesCardTitle: "Synced devices",
  localDeviceCount: (n: number): string => (n > 1 ? "devices in the local database" : "device in the local database"),
  noSyncedDevices: "No synced devices for this tenant.",
  deviceFallbackName: (id: number) => `Device #${id}`,
  statusOnline: "Online",
  statusOffline: "Offline",
  statusUnknown: "Unknown",
  // Billing card
  billingCardTitle: "Stripe billing",
  stripeLabel: "Stripe",
  stripeConfigured: "Configured",
  stripeNotConfigured: "Not configured",
  billingLabel: "Billing",
  billingEnabled: "Enabled",
  billingDisabled: "Disabled",
  betaMode: "Platform in beta mode.",
}

const fr: typeof en = {
  title: "Passerelle Hikvision & synchronisation",
  subtitle: "État en lecture seule de la passerelle, de la réception des événements et de la facturation.",
  refresh: "Actualiser",
  loading: "Chargement…",
  unexpectedError: "Une erreur inattendue est survenue.",
  platformInfoError: (status: number) => `Impossible de récupérer les informations plateforme (${status})`,
  // Gateway card
  gatewayCardTitle: "Passerelle Hik Device Gateway",
  gatewayConnected: "Connectée",
  gatewayUnreachable: "Injoignable",
  gatewayDeviceCount: (n: number) => (n > 1 ? "appareils vus par la passerelle" : "appareil vu par la passerelle"),
  // Events card
  eventsCardTitle: "Réception des événements",
  lastEventReceived: "Dernier événement reçu",
  sourceRealtime: "Temps réel (webhook)",
  sourceCatchup: "Rattrapage (catchup)",
  noEventsYet: "Aucun événement reçu pour le moment.",
  webhookInfo: "Les événements arrivent via webhook de la passerelle vers",
  // Devices card
  devicesCardTitle: "Appareils synchronisés",
  localDeviceCount: (n: number) => (n > 1 ? "appareils en base locale" : "appareil en base locale"),
  noSyncedDevices: "Aucun appareil synchronisé pour ce tenant.",
  deviceFallbackName: (id: number) => `Appareil #${id}`,
  statusOnline: "En ligne",
  statusOffline: "Hors ligne",
  statusUnknown: "Inconnu",
  // Billing card
  billingCardTitle: "Facturation Stripe",
  stripeLabel: "Stripe",
  stripeConfigured: "Configuré",
  stripeNotConfigured: "Non configuré",
  billingLabel: "Facturation",
  billingEnabled: "Activée",
  billingDisabled: "Désactivée",
  betaMode: "Plateforme en mode bêta.",
}

export const integrationsDict = { en, fr }

export type IntegrationsDict = typeof en
