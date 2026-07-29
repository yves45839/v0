/**
 * Billing / pricing area dictionary (FR/EN).
 * Covers: components/billing/*, app/billing/page.tsx, app/pricing/page.tsx.
 */
import type { Invoice, SubscriptionStatus } from "@/lib/api/billing"
import type { FeatureKey, PlanTier } from "@/lib/billing/feature-access"

// ── Currency helpers (locale-aware) ─────────────────────────────────────────

export function formatMoney(amount: string, currency: string, localeTag: string): string {
  const value = parseFloat(amount)
  if (!Number.isFinite(value)) return `${amount} ${currency.toUpperCase()}`
  try {
    return new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: currency.toLowerCase() === "xof" ? 0 : 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`
  }
}

export function formatMoneyCents(cents: number, currency: string, localeTag: string): string {
  try {
    return new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

// ── English (reference) ─────────────────────────────────────────────────────

const en = {
  shared: {
    subscriptionStatus: {
      active: "Active",
      trialing: "Free trial",
      past_due: "Payment overdue",
      unpaid: "Unpaid",
      canceled: "Canceled",
      paused: "Paused",
      incomplete: "Incomplete",
      incomplete_expired: "Expired",
    } as Record<SubscriptionStatus, string>,
    invoiceStatus: {
      paid: "Paid",
      open: "Awaiting payment",
      draft: "Draft",
      uncollectible: "Uncollectible",
      void: "Voided",
    } as Record<Invoice["status"], string>,
    interval: { month: " / month", year: " / year", one_time: "" } as Record<
      "month" | "year" | "one_time",
      string
    >,
    intervalShort: { month: "/mo", year: "/yr", one_time: "" } as Record<
      "month" | "year" | "one_time",
      string
    >,
    devicesIncluded: (n: string) => `${n} devices included`,
    eventsPerMonth: (n: string) => `${n} events / month`,
    prioritySupport: "Priority support",
    advancedAnalytics: "Advanced analytics",
    meteredNote: (unit: string) => `Usage-based billing: per ${unit}`,
    trialWithCard: (days: number) => `${days}-day trial · Card required`,
    trialNoCard: (days: number) => `${days}-day trial · No card required`,
    startFreeTrial: "Start free trial",
    buy: "Buy",
    seePlans: "View plans",
    manageSubscription: "Manage my subscription",
    redirecting: "Redirecting…",
    unexpectedError: "Unexpected error",
    noActiveSubscription: "No active subscription",
    unlimited: "Unlimited",
  },
  page: {
    title: "Subscriptions & Payments",
    subtitle: "Manage your plan, payment methods, invoices and support.",
    tabs: {
      overview: { label: "Overview", short: "Overview" },
      plans: { label: "Plans & Subscriptions", short: "Plans" },
      paymentMethods: { label: "Payment methods", short: "Payment" },
      invoices: { label: "Invoices & History", short: "Invoices" },
      usage: { label: "Usage & Limits", short: "Usage" },
      support: { label: "Tickets & Support", short: "Support" },
      custom: { label: "Custom offer", short: "Custom" },
    },
  },
  overview: {
    plansErrorTitle: "Unable to load plans",
    loading: "Loading billing…",
    noPlansTitle: "No plans available",
    noPlansDesc:
      "The plan catalog is not configured yet. Contact your administrator or try again later.",
    summaryErrorTitle: "Unable to load your subscription",
    openInvoicesTitle: (n: number) =>
      `${n} invoice${n > 1 ? "s" : ""} awaiting payment`,
    viewInvoices: "View invoices",
    currentPlan: "Current plan",
    accessEndsOn: "Access ends on ",
    renewsOn: "Renews on ",
    trialUntil: (date: string) => `Trial until ${date}`,
    cancelScheduled: "Cancellation scheduled at the end of the period",
    autoRenewOn: "Automatic renewal enabled",
    changePlan: "Change plan",
    invoices: "Invoices",
    managePayment: "Manage payment",
    noSubscriptionDesc:
      "Choose a plan to activate your tenant and unlock all LR Time features.",
    usageTitle: "Usage",
    seeAll: "See all",
    employees: "Employees",
    devices: "Devices",
    usageUnavailable: "Usage counters are temporarily unavailable.",
    includedFeatures: "Included features",
    comparePlans: "Compare plans",
    subscribeToUnlock: "Subscribe to a plan to unlock features.",
    quickActions: "Quick actions",
    managePayments: "Manage payments",
    contactSupport: "Contact support",
  },
  invoices: {
    title: "Invoices & History",
    subtitle: "View and download your invoices.",
    errorTitle: "Unable to load invoices",
    loading: "Loading invoices…",
    emptyTitle: "No invoices yet",
    emptyDesc: "Your invoices will appear here after your first subscription.",
    kpiTotal: "Total",
    kpiPaid: "Paid",
    kpiOpen: "Awaiting payment",
    searchPlaceholder: "Search by number…",
    allStatuses: "All statuses",
    notFoundTitle: "No invoices found",
    notFoundDesc: "Adjust your filters or your search.",
    resetFilters: "Reset filters",
    colInvoice: "Invoice",
    colDate: "Date",
    colAmount: "Amount",
    colStatus: "Status",
    colDocuments: "Documents",
    pay: "Pay",
    view: "View",
  },
  plans: {
    badge: "Choose your plan",
    title: "Plans & Subscriptions",
    subtitle:
      "Plans designed for every stage of your company's growth. Switch plans at any time, no commitment.",
    manageCurrent: "Manage my current subscription",
    checkoutErrorTitle: "Unable to start the payment",
    catalogErrorTitle: "Unable to load plans",
    loading: "Loading plans…",
    emptyTitle: "No plans available",
    emptyDesc: "The plan catalog is not configured yet for this currency.",
    currentBadge: "✦ Current plan",
    popularBadge: "⚡ Popular",
    currentPlan: "Current plan",
    choosePlan: (name: string) => `Choose ${name}`,
    customKicker: "Large organizations / Advanced needs",
    customTitle: "Do you have needs beyond our standard plans?",
    customDesc:
      "For organizations with large volumes, extensive multi-site deployments, specific integrations or dedicated onboarding, we build a fully tailored proposal.",
    customCta: "Request a custom offer",
    customTurnaround: "Tailored proposal within 48 hours",
    faqTitle: "Frequently asked questions",
    faq: [
      {
        q: "Can I change plans at any time?",
        a: "Yes, you can upgrade or downgrade your plan at any time. The difference is prorated over the remaining period.",
      },
      {
        q: "What happens if I exceed my plan limits?",
        a: "You will receive an alert before reaching the limits. Beyond them, some features will be restricted until you change plan.",
      },
      {
        q: "Does the subscription renew automatically?",
        a: "Yes, by default automatic charging is enabled on your primary payment method. You can disable it at any time from the Stripe portal.",
      },
      {
        q: "How do I cancel my subscription?",
        a: "You can cancel from the Stripe portal (\"Manage my subscription\" button). Access remains active until the end of the paid period.",
      },
      {
        q: "Can I get a customized invoice?",
        a: "Yes, contact support to get an invoice with your specific details (VAT number, customer code, etc.).",
      },
    ],
  },
  usage: {
    loading: "Loading usage…",
    errorTitle: "Unable to load usage",
    title: "Usage & Limits",
    subtitle: "Track your consumption in real time.",
    planChipPrefix: "Plan",
    warningTitle: "You are approaching some limits",
    warningDesc: "Consider upgrading to avoid any service interruption.",
    employeesLabel: "Employees",
    employeesDesc: "Active employee accounts",
    devicesLabel: "Devices",
    devicesDesc: "Connected doors and devices",
    percentUsed: (p: number) => `${p}% used`,
    usedCount: (n: number) => `${n} used`,
    availableCount: (n: number) => `${n} available`,
    almostLimit: "Limit almost reached — upgrade to a higher plan",
    approachingLimit: "You are approaching the plan limit",
    unlimitedInPlan: "Unlimited in this plan",
    counterUnavailable: "Counter temporarily unavailable",
    eventQuotaTitle: "Event quota",
    includedInPlan: (name: string) => `Included in the ${name} plan`,
    activeFeatures: "Active features",
    baseFeaturesIncluded: "Base features included.",
    notIncludedFeatures: "Features not included",
    allIncluded: "All features are included in this plan!",
    noSubDesc:
      "Subscribe to a plan to get extended quotas and advanced features.",
  },
  payment: {
    title: "Payment methods",
    subtitle: "Your payment methods are securely managed by Stripe.",
    kicker: "Secure Stripe portal",
    heading: "Manage your cards and charges from the Stripe portal",
    desc: "For your security, no banking data is stored on our servers. Adding, updating or removing a payment method is done directly on the PCI-DSS certified Stripe customer portal.",
    bulletAddCard: "Add or replace a bank card",
    bulletDefault: "Choose the method used for automatic renewal",
    bulletHistory: "Find the full history of your payments",
    openPortal: "Open the Stripe portal",
    redirectNote: "You will be redirected to a secure Stripe page.",
    portalErrorTitle: "Unable to open the portal",
    portalErrorHint:
      "An active subscription may be required to access the portal.",
    securityBefore: "Payments are processed by ",
    securityAfter:
      ". Your banking information is encrypted and never passes through the LR Time / SecurePoint servers.",
  },
  support: {
    title: "Billing support",
    subtitle:
      "A question about an invoice, a payment or your subscription? Our team is here to help.",
    kicker: "Direct contact",
    heading: "Write to us, we reply quickly",
    desc: "For any billing-related question (missing invoice, declined payment, plan change, specific details on your invoices…), contact us by email, mentioning the invoice number concerned if possible.",
    mailSubject: "LR Time billing support",
    responseTime: "Reply within 24 business hours.",
    invoicesCardTitle: "Your invoices",
    invoicesCardDesc: "Download your PDF invoices and settle pending invoices.",
    customCardTitle: "Custom offer",
    customCardDesc:
      "Advanced needs, multi-site, large volumes: request a tailored proposal.",
  },
  custom: {
    accompanimentLevels: [
      "Self-serve (documentation only)",
      "Standard onboarding (email support)",
      "Enhanced onboarding (priority support + training)",
      "Dedicated onboarding (dedicated CSM + custom SLA)",
      "Strategic partnership (deep integration)",
    ],
    employeeRanges: ["100–200", "200–500", "500–1,000", "1,000–5,000", "5,000+"],
    deviceRanges: ["15–30", "30–100", "100–300", "300–1,000", "1,000+"],
    siteRanges: ["2–5", "5–15", "15–50", "50–200", "200+"],
    invalidEmail: "Invalid email",
    successTitle: "Request sent successfully!",
    successBefore: "Our sales team will review your request and get back to you within ",
    successStrong: "48 business hours",
    successAfter: " with a tailored proposal.",
    newRequest: "New request",
    heroKicker: "Custom Enterprise offer",
    heroTitle: "Needs beyond the Enterprise plan?",
    heroDesc:
      "For organizations exceeding standard capacity — more than 100 employees, dozens of devices, multiple sites or advanced integration requirements — we build a fully customized pricing proposal.",
    heroTags: [
      "Customized invoice",
      "Dedicated SLA",
      "Tailored integrations",
      "Premium onboarding",
    ],
    features: [
      { label: "Custom employee volume", description: "Beyond 100 employees" },
      { label: "Extended infrastructure", description: "Unlimited devices & doors" },
      { label: "Advanced multi-site", description: "International deployment" },
      { label: "API & integrations", description: "Webhooks, SSO, ERP" },
      { label: "Dedicated support", description: "CSM + custom SLA" },
      { label: "Customization", description: "Branding & workflows" },
    ],
    howTitle: "How does it work?",
    steps: [
      { num: "01", title: "Send your request", desc: "Fill in the form below with your estimated needs." },
      { num: "02", title: "Review & proposal", desc: "Our team contacts you within 48 hours with a tailored offer." },
      { num: "03", title: "Tailored deployment", desc: "We configure the platform to your exact specifications." },
    ],
    formTitle: "Custom offer request form",
    companySection: "Company information",
    companyName: "Company name",
    companyPlaceholder: "Acme Inc.",
    employeesEstimate: "Estimated employees",
    rangePlaceholder: "Choose a range…",
    employeesOption: (r: string) => `${r} employees`,
    devicesEstimate: "Estimated devices / doors",
    devicesOption: (r: string) => `${r} devices`,
    sitesEstimate: "Estimated sites",
    sitesOption: (r: string) => `${r} sites`,
    accompanimentLabel: "Desired level of onboarding",
    levelPlaceholder: "Choose a level…",
    specificNeeds: "Specific needs",
    specificNeedsPlaceholder:
      "Integrations, customizations, regulatory requirements, technical environment…",
    contactSection: "Contact information",
    contactName: "Full name",
    contactPlaceholder: "John Smith",
    emailLabel: "Work email",
    emailPlaceholder: "contact@company.com",
    phoneLabel: "Phone",
    messageLabel: "Additional message",
    messagePlaceholder:
      "Describe your context, goals, timeline and any information useful to our team…",
    infoStrong: "A tailored proposal",
    infoRest:
      " will be prepared based on your needs: number of employees, devices, sites, required features and desired level of onboarding. No commitment at this stage.",
    sending: "Sending…",
    send: "Send request",
  },
  pricing: {
    title: "Choose your plan",
    subtitle: "Transparent pricing. No commitment. Cancel anytime.",
    trialHighlight: "14-day free trial · No credit card required",
    currency: "Currency",
    currencyLabels: {
      eur: "EUR — Euro",
      usd: "USD — US Dollar",
      gbp: "GBP — British Pound",
      xof: "XOF — CFA Franc",
      mad: "MAD — Dirham",
      cad: "CAD — Canadian Dollar",
    } as Record<string, string>,
    loadError: "Unable to load plans: ",
    emptyBefore: "No plan is configured for this currency yet. Sync the catalog from Stripe with ",
    emptyAfter: ".",
    footnote:
      "Payments secured by Stripe. VAT applied according to your country. You can manage or cancel your subscription at any time from your Billing area.",
    popular: "Most popular",
    loginToBuy: "Log in to buy",
    chooseThisPlan: "Choose this plan",
    signUp: "Sign up",
  },
  card: {
    loadError: "Unable to load the subscription: ",
    loading: "Loading subscription…",
    currentSubscription: "Current subscription",
    statusLabel: "Status: ",
    cancelScheduled: "Cancellation scheduled",
    nextDue: "Next payment due: ",
    noSubDesc: "Choose a plan on the pricing page to get started.",
    openInvoices: (n: number) =>
      `${n} invoice${n > 1 ? "s" : ""} awaiting payment.`,
  },
  upgrade: {
    unlock: (title: string) => `Unlock "${title}"`,
    upgradeTitle: "Upgrade to a higher plan",
    includedIn: (tier: string) => `This feature is included in the ${tier} plan.`,
    defaultPlanDesc: "Everything you need to go to production.",
    devices: (n: string) => `${n} devices`,
    trialNoCardBullet: (days: number) => `${days}-day trial, no card required`,
    noPlanConfigured: (tier: string) =>
      `No ${tier} plan configured yet. Contact support for a custom offer.`,
    later: "Later",
    seeAllPlans: "See all plans",
    tierLabels: {
      free: "Free",
      pro: "Pro",
      enterprise: "Enterprise",
    } as Record<PlanTier, string>,
    featureMeta: {
      api_access: {
        title: "API access",
        description: "Control your devices and events from your own code.",
      },
      advanced_analytics: {
        title: "Advanced analytics",
        description: "Attendance heatmaps, top users, 12-month trends.",
      },
      priority_support: {
        title: "Priority support",
        description: "Reply within 24 business hours via a dedicated email.",
      },
      multi_site: {
        title: "Multi-site",
        description: "Manage several buildings from a single dashboard.",
      },
      webhooks: {
        title: "Real-time webhooks",
        description: "Push notifications to Slack, Teams, or your backend.",
      },
      custom_alerts: {
        title: "Custom alerts",
        description: "Email / SMS / WhatsApp rules on critical events.",
      },
      scheduled_reports: {
        title: "Scheduled reports",
        description: "Receive your PDF reports automatically every week.",
      },
      audit_log: {
        title: "Audit log",
        description: "Full traceability of admin actions for compliance.",
      },
      retention_long: {
        title: "Long-term retention",
        description: "Keep your events for up to 12 months (vs 7 days).",
      },
      white_label: {
        title: "White-label",
        description: "Custom logo and domain.",
      },
      sso: {
        title: "SSO / SAML",
        description: "Enterprise authentication via your IdP.",
      },
    } as Record<FeatureKey, { title: string; description: string }>,
  },
  paymentElement: {
    initError: "Unable to initialize the payment: ",
    preparing: "Preparing the payment form…",
    paymentFailed: "The payment failed.",
    processing: "Processing…",
    pay: (amount: string) => `Pay ${amount}`,
  },
}

// ── French ──────────────────────────────────────────────────────────────────

const fr: typeof en = {
  shared: {
    subscriptionStatus: {
      active: "Actif",
      trialing: "Essai gratuit",
      past_due: "Paiement en retard",
      unpaid: "Impayé",
      canceled: "Annulé",
      paused: "En pause",
      incomplete: "Incomplet",
      incomplete_expired: "Expiré",
    } as Record<SubscriptionStatus, string>,
    invoiceStatus: {
      paid: "Payée",
      open: "À régler",
      draft: "Brouillon",
      uncollectible: "Irrécouvrable",
      void: "Annulée",
    } as Record<Invoice["status"], string>,
    interval: { month: " / mois", year: " / an", one_time: "" } as Record<
      "month" | "year" | "one_time",
      string
    >,
    intervalShort: { month: "/mois", year: "/an", one_time: "" } as Record<
      "month" | "year" | "one_time",
      string
    >,
    devicesIncluded: (n: string) => `${n} appareils inclus`,
    eventsPerMonth: (n: string) => `${n} évènements / mois`,
    prioritySupport: "Support prioritaire",
    advancedAnalytics: "Analytique avancée",
    meteredNote: (unit: string) => `Facturé à l'usage : par ${unit}`,
    trialWithCard: (days: number) => `Essai ${days} jours · CB requise`,
    trialNoCard: (days: number) => `Essai ${days} jours · Sans CB`,
    startFreeTrial: "Démarrer l'essai gratuit",
    buy: "Acheter",
    seePlans: "Voir les plans",
    manageSubscription: "Gérer mon abonnement",
    redirecting: "Redirection…",
    unexpectedError: "Erreur inattendue",
    noActiveSubscription: "Aucun abonnement actif",
    unlimited: "Illimité",
  },
  page: {
    title: "Abonnements & Paiements",
    subtitle: "Gérez votre plan, vos moyens de paiement, vos factures et votre support.",
    tabs: {
      overview: { label: "Vue d'ensemble", short: "Vue" },
      plans: { label: "Plans & Abonnements", short: "Plans" },
      paymentMethods: { label: "Moyens de paiement", short: "Paiement" },
      invoices: { label: "Factures & Historique", short: "Factures" },
      usage: { label: "Utilisation & Limites", short: "Utilisation" },
      support: { label: "Tickets & Support", short: "Support" },
      custom: { label: "Offre sur mesure", short: "Sur mesure" },
    },
  },
  overview: {
    plansErrorTitle: "Impossible de charger les offres",
    loading: "Chargement de la facturation…",
    noPlansTitle: "Aucune offre disponible",
    noPlansDesc:
      "Le catalogue de plans n'est pas encore configuré. Contactez votre administrateur ou réessayez plus tard.",
    summaryErrorTitle: "Impossible de charger votre abonnement",
    openInvoicesTitle: (n: number) =>
      `${n} facture${n > 1 ? "s" : ""} en attente de règlement`,
    viewInvoices: "Voir les factures",
    currentPlan: "Plan actuel",
    accessEndsOn: "Fin d'accès le ",
    renewsOn: "Renouvellement le ",
    trialUntil: (date: string) => `Essai jusqu'au ${date}`,
    cancelScheduled: "Annulation programmée en fin de période",
    autoRenewOn: "Renouvellement automatique activé",
    changePlan: "Changer de plan",
    invoices: "Factures",
    managePayment: "Gérer le paiement",
    noSubscriptionDesc:
      "Choisissez un plan pour activer votre tenant et accéder à l'ensemble des fonctionnalités LR Time.",
    usageTitle: "Utilisation",
    seeAll: "Voir tout",
    employees: "Employés",
    devices: "Appareils",
    usageUnavailable: "Compteurs d'utilisation momentanément indisponibles.",
    includedFeatures: "Fonctionnalités incluses",
    comparePlans: "Comparer les plans",
    subscribeToUnlock: "Souscrivez à un plan pour débloquer les fonctionnalités.",
    quickActions: "Actions rapides",
    managePayments: "Gérer les paiements",
    contactSupport: "Contacter le support",
  },
  invoices: {
    title: "Factures & Historique",
    subtitle: "Consultez et téléchargez vos factures.",
    errorTitle: "Impossible de charger les factures",
    loading: "Chargement des factures…",
    emptyTitle: "Aucune facture pour le moment",
    emptyDesc: "Vos factures apparaîtront ici dès votre première souscription.",
    kpiTotal: "Total",
    kpiPaid: "Payées",
    kpiOpen: "À régler",
    searchPlaceholder: "Rechercher par numéro…",
    allStatuses: "Tous les statuts",
    notFoundTitle: "Aucune facture trouvée",
    notFoundDesc: "Modifiez vos filtres ou votre recherche.",
    resetFilters: "Réinitialiser les filtres",
    colInvoice: "Facture",
    colDate: "Date",
    colAmount: "Montant",
    colStatus: "Statut",
    colDocuments: "Documents",
    pay: "Payer",
    view: "Voir",
  },
  plans: {
    badge: "Choisissez votre plan",
    title: "Plans & Abonnements",
    subtitle:
      "Des offres adaptées à chaque étape de la croissance de votre entreprise. Changez de plan à tout moment, sans engagement.",
    manageCurrent: "Gérer mon abonnement actuel",
    checkoutErrorTitle: "Impossible de démarrer le paiement",
    catalogErrorTitle: "Impossible de charger les offres",
    loading: "Chargement des offres…",
    emptyTitle: "Aucune offre disponible",
    emptyDesc: "Le catalogue de plans n'est pas encore configuré pour cette devise.",
    currentBadge: "✦ Plan actuel",
    popularBadge: "⚡ Populaire",
    currentPlan: "Plan actuel",
    choosePlan: (name: string) => `Choisir ${name}`,
    customKicker: "Super Entreprises / Besoins avancés",
    customTitle: "Vous avez des besoins au-delà de nos plans standard ?",
    customDesc:
      "Pour les structures avec de gros volumes, des déploiements multi-sites étendus, des intégrations spécifiques ou un accompagnement dédié, nous établissons une proposition personnalisée sur mesure.",
    customCta: "Demander une offre sur mesure",
    customTurnaround: "Proposition personnalisée sous 48h",
    faqTitle: "Questions fréquentes",
    faq: [
      {
        q: "Puis-je changer de plan à tout moment ?",
        a: "Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. La différence est calculée au prorata de la période restante.",
      },
      {
        q: "Que se passe-t-il si je dépasse les limites de mon plan ?",
        a: "Vous recevrez une alerte avant d'atteindre les limites. Au-delà, certaines fonctionnalités seront restreintes jusqu'au changement de plan.",
      },
      {
        q: "Le renouvellement est-il automatique ?",
        a: "Oui, par défaut le prélèvement automatique est activé sur votre moyen de paiement principal. Vous pouvez le désactiver à tout moment depuis le portail Stripe.",
      },
      {
        q: "Comment annuler mon abonnement ?",
        a: "Vous pouvez annuler depuis le portail Stripe (bouton « Gérer mon abonnement »). L'accès reste actif jusqu'à la fin de la période payée.",
      },
      {
        q: "Puis-je obtenir une facture personnalisée ?",
        a: "Oui, contactez le support pour obtenir une facture avec vos mentions spécifiques (numéro TVA, code client, etc.).",
      },
    ],
  },
  usage: {
    loading: "Chargement de l'utilisation…",
    errorTitle: "Impossible de charger l'utilisation",
    title: "Utilisation & Limites",
    subtitle: "Suivez votre consommation en temps réel.",
    planChipPrefix: "Plan",
    warningTitle: "Vous approchez de certaines limites",
    warningDesc:
      "Pensez à passer au plan supérieur pour éviter toute interruption de service.",
    employeesLabel: "Employés",
    employeesDesc: "Comptes employés actifs",
    devicesLabel: "Appareils",
    devicesDesc: "Portes et appareils connectés",
    percentUsed: (p: number) => `${p}% utilisé`,
    usedCount: (n: number) => `${n} utilisé${n > 1 ? "s" : ""}`,
    availableCount: (n: number) => `${n} disponible${n > 1 ? "s" : ""}`,
    almostLimit: "Limite presque atteinte — passez au plan supérieur",
    approachingLimit: "Vous approchez de la limite du plan",
    unlimitedInPlan: "Illimité dans ce plan",
    counterUnavailable: "Compteur momentanément indisponible",
    eventQuotaTitle: "Quota d'évènements",
    includedInPlan: (name: string) => `Inclus dans le plan ${name}`,
    activeFeatures: "Fonctionnalités actives",
    baseFeaturesIncluded: "Fonctionnalités de base incluses.",
    notIncludedFeatures: "Fonctionnalités non incluses",
    allIncluded: "Toutes les fonctionnalités sont incluses dans ce plan !",
    noSubDesc:
      "Souscrivez à un plan pour bénéficier de quotas étendus et des fonctionnalités avancées.",
  },
  payment: {
    title: "Moyens de paiement",
    subtitle: "Vos moyens de paiement sont gérés en toute sécurité par Stripe.",
    kicker: "Portail sécurisé Stripe",
    heading: "Gérez vos cartes et prélèvements depuis le portail Stripe",
    desc: "Pour votre sécurité, aucune donnée bancaire n'est stockée sur nos serveurs. L'ajout, la mise à jour ou la suppression d'un moyen de paiement s'effectue directement sur le portail client Stripe, certifié PCI-DSS.",
    bulletAddCard: "Ajouter ou remplacer une carte bancaire",
    bulletDefault: "Choisir le moyen utilisé pour le renouvellement automatique",
    bulletHistory: "Retrouver l'historique complet de vos paiements",
    openPortal: "Ouvrir le portail Stripe",
    redirectNote: "Vous serez redirigé vers une page sécurisée Stripe.",
    portalErrorTitle: "Impossible d'ouvrir le portail",
    portalErrorHint:
      "Un abonnement actif est peut-être requis pour accéder au portail.",
    securityBefore: "Les paiements sont traités par ",
    securityAfter:
      ". Vos informations bancaires sont chiffrées et ne transitent jamais par les serveurs LR Time / SecurePoint.",
  },
  support: {
    title: "Support facturation",
    subtitle:
      "Une question sur une facture, un paiement ou votre abonnement ? Notre équipe vous répond.",
    kicker: "Contact direct",
    heading: "Écrivez-nous, nous répondons rapidement",
    desc: "Pour toute question liée à la facturation (facture manquante, paiement refusé, changement de plan, mentions spécifiques sur vos factures…), contactez-nous par e-mail en précisant le numéro de facture concerné si possible.",
    mailSubject: "Support facturation LR Time",
    responseTime: "Réponse sous 24h ouvrées.",
    invoicesCardTitle: "Vos factures",
    invoicesCardDesc:
      "Téléchargez vos factures PDF et réglez les factures en attente.",
    customCardTitle: "Offre sur mesure",
    customCardDesc:
      "Besoins avancés, multi-sites, gros volumes : demandez une proposition personnalisée.",
  },
  custom: {
    accompanimentLevels: [
      "Autonome (documentation seule)",
      "Accompagnement standard (support email)",
      "Accompagnement renforcé (support prioritaire + formations)",
      "Accompagnement dédié (CSM dédié + SLA personnalisé)",
      "Partenariat stratégique (intégration approfondie)",
    ],
    employeeRanges: ["100–200", "200–500", "500–1 000", "1 000–5 000", "5 000+"],
    deviceRanges: ["15–30", "30–100", "100–300", "300–1 000", "1 000+"],
    siteRanges: ["2–5", "5–15", "15–50", "50–200", "200+"],
    invalidEmail: "Email invalide",
    successTitle: "Demande envoyée avec succès !",
    successBefore:
      "Notre équipe commerciale analysera votre demande et vous contactera sous ",
    successStrong: "48 heures ouvrées",
    successAfter: " avec une proposition personnalisée.",
    newRequest: "Nouvelle demande",
    heroKicker: "Offre Enterprise sur mesure",
    heroTitle: "Des besoins au-delà du plan Enterprise ?",
    heroDesc:
      "Pour les organisations dépassant les capacités standard — plus de 100 employés, des dizaines d'appareils, plusieurs sites ou des exigences d'intégration avancées — nous établissons une proposition tarifaire entièrement personnalisée.",
    heroTags: [
      "Facture personnalisée",
      "SLA dédié",
      "Intégrations sur mesure",
      "Accompagnement premium",
    ],
    features: [
      { label: "Volume d'employés sur mesure", description: "Au-delà de 100 employés" },
      { label: "Infrastructure étendue", description: "Appareils & portes illimités" },
      { label: "Multi-sites avancé", description: "Déploiement international" },
      { label: "API & intégrations", description: "Webhooks, SSO, ERP" },
      { label: "Support dédié", description: "CSM + SLA personnalisé" },
      { label: "Personnalisation", description: "Branding & workflows" },
    ],
    howTitle: "Comment ça fonctionne ?",
    steps: [
      { num: "01", title: "Envoi de votre demande", desc: "Remplissez le formulaire ci-dessous avec vos besoins estimés." },
      { num: "02", title: "Analyse & proposition", desc: "Notre équipe vous contacte sous 48h avec une offre personnalisée." },
      { num: "03", title: "Déploiement sur mesure", desc: "Nous configurons la plateforme selon vos spécifications exactes." },
    ],
    formTitle: "Formulaire de demande sur mesure",
    companySection: "Informations de l'entreprise",
    companyName: "Nom de l'entreprise",
    companyPlaceholder: "Entreprise SA",
    employeesEstimate: "Estimation d'employés",
    rangePlaceholder: "Choisir une fourchette…",
    employeesOption: (r: string) => `${r} employés`,
    devicesEstimate: "Estimation d'appareils / portes",
    devicesOption: (r: string) => `${r} appareils`,
    sitesEstimate: "Estimation de sites",
    sitesOption: (r: string) => `${r} sites`,
    accompanimentLabel: "Niveau d'accompagnement souhaité",
    levelPlaceholder: "Choisir un niveau…",
    specificNeeds: "Besoins spécifiques",
    specificNeedsPlaceholder:
      "Intégrations, personnalisations, exigences réglementaires, environnement technique…",
    contactSection: "Informations de contact",
    contactName: "Nom & prénom",
    contactPlaceholder: "Jean Dupont",
    emailLabel: "Email professionnel",
    emailPlaceholder: "contact@entreprise.com",
    phoneLabel: "Téléphone",
    messageLabel: "Message complémentaire",
    messagePlaceholder:
      "Décrivez votre contexte, vos objectifs, votre timeline et toute information utile à notre équipe…",
    infoStrong: "Une proposition personnalisée",
    infoRest:
      " sera établie sur la base de vos besoins : nombre d'employés, d'appareils, de sites, fonctionnalités requises et niveau d'accompagnement souhaité. Aucun engagement à ce stade.",
    sending: "Envoi en cours…",
    send: "Envoyer la demande",
  },
  pricing: {
    title: "Choisissez votre plan",
    subtitle: "Tarification transparente. Sans engagement. Annulez à tout moment.",
    trialHighlight: "Essai gratuit 14 jours · Sans carte bancaire",
    currency: "Devise",
    currencyLabels: {
      eur: "EUR — Euro",
      usd: "USD — Dollar US",
      gbp: "GBP — Livre",
      xof: "XOF — Franc CFA",
      mad: "MAD — Dirham",
      cad: "CAD — Dollar CA",
    } as Record<string, string>,
    loadError: "Impossible de charger les plans : ",
    emptyBefore:
      "Aucun plan n'est encore configuré pour cette devise. Synchronisez le catalogue depuis Stripe avec ",
    emptyAfter: ".",
    footnote:
      "Paiements sécurisés par Stripe. TVA appliquée selon votre pays. Vous pourrez gérer ou annuler votre abonnement à tout moment depuis votre espace Facturation.",
    popular: "Le plus populaire",
    loginToBuy: "Connectez-vous pour acheter",
    chooseThisPlan: "Choisir ce plan",
    signUp: "S'inscrire",
  },
  card: {
    loadError: "Impossible de charger l'abonnement : ",
    loading: "Chargement de l'abonnement…",
    currentSubscription: "Abonnement actuel",
    statusLabel: "Statut : ",
    cancelScheduled: "Annulation programmée",
    nextDue: "Prochaine échéance : ",
    noSubDesc: "Choisissez un plan sur la page tarifs pour commencer.",
    openInvoices: (n: number) =>
      `${n} facture${n > 1 ? "s" : ""} en attente de règlement.`,
  },
  upgrade: {
    unlock: (title: string) => `Débloquez « ${title} »`,
    upgradeTitle: "Passez au plan supérieur",
    includedIn: (tier: string) =>
      `Cette fonctionnalité est incluse dans le plan ${tier}.`,
    defaultPlanDesc: "Tout ce qu'il faut pour passer en production.",
    devices: (n: string) => `${n} dispositifs`,
    trialNoCardBullet: (days: number) => `Essai ${days} jours sans CB`,
    noPlanConfigured: (tier: string) =>
      `Aucun plan ${tier} configuré pour le moment. Contactez le support pour une offre sur mesure.`,
    later: "Plus tard",
    seeAllPlans: "Voir tous les plans",
    tierLabels: {
      free: "Free",
      pro: "Pro",
      enterprise: "Enterprise",
    } as Record<PlanTier, string>,
    featureMeta: {
      api_access: {
        title: "Accès API",
        description: "Pilotez vos dispositifs et événements depuis votre code.",
      },
      advanced_analytics: {
        title: "Analytique avancée",
        description: "Heatmaps de fréquentation, top utilisateurs, tendances 12 mois.",
      },
      priority_support: {
        title: "Support prioritaire",
        description: "Réponse sous 24h ouvrées par e-mail dédié.",
      },
      multi_site: {
        title: "Multi-sites",
        description: "Gérez plusieurs bâtiments dans un seul tableau de bord.",
      },
      webhooks: {
        title: "Webhooks temps réel",
        description: "Notifications push vers Slack, Teams, ou votre backend.",
      },
      custom_alerts: {
        title: "Alertes personnalisées",
        description: "Règles email / SMS / WhatsApp sur les événements critiques.",
      },
      scheduled_reports: {
        title: "Rapports planifiés",
        description: "Recevez vos rapports PDF automatiquement chaque semaine.",
      },
      audit_log: {
        title: "Journal d'audit",
        description: "Traçabilité complète des actions admin pour la conformité.",
      },
      retention_long: {
        title: "Rétention longue durée",
        description: "Conservez vos événements jusqu'à 12 mois (vs 7 jours).",
      },
      white_label: {
        title: "White-label",
        description: "Logo et domaine personnalisés.",
      },
      sso: {
        title: "SSO / SAML",
        description: "Authentification d'entreprise via votre IdP.",
      },
    } as Record<FeatureKey, { title: string; description: string }>,
  },
  paymentElement: {
    initError: "Impossible d'initialiser le paiement : ",
    preparing: "Préparation du formulaire de paiement…",
    paymentFailed: "Le paiement a échoué.",
    processing: "Traitement…",
    pay: (amount: string) => `Payer ${amount}`,
  },
}

export const billingDict = { en, fr }
export type BillingDict = typeof en
