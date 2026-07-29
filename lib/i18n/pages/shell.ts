const en = {
  // Header — route meta stragglers
  weeklyScheduleTitle: "Weekly schedule",
  weeklyScheduleSubtitle: "Drag-and-drop weekly grid with coverage tracking",
  timesheetTitle: "Timesheet validation",
  timesheetSubtitle: "Approve, edit or reject anomalies with full timeline context",
  absencesTitle: "Time off requests",
  absencesSubtitle: "Approve leave requests, spot conflicts and check team availability",
  accountsTitle: "Accounts",
  accountsSubtitle: "Manage users, roles and permissions",
  profileSubtitle: "User profile and account security",

  // Header — controls
  openMenu: "Open menu",
  switchLanguageAria: (current: string) => `Switch language (current: ${current})`,
  // Shows the language the user would switch TO.
  switchLanguageTitle: "Passer en français",

  // Tenant switcher
  organization: "Organization",

  // Section tabs
  sectionDashboard: "Dashboard",
  tabOverview: "Overview",
  sectionPeople: "People",
  tabAccounts: "Accounts",
  tabMyProfile: "My profile",
  sectionPlanning: "Planning",
  tabSchedules: "Schedules",
  tabTimesheets: "Timesheets",
  tabTimeOff: "Time off",
  sectionDevices: "Devices",
  sectionReports: "Reports",
  sectionNavAria: (label: string) => `${label} sections`,

  // Sidebar
  userFallback: "User",
  roleFallback: "Admin",
  brandHomeAria: "LR Time",
  expandSidebar: "Expand the sidebar",
  collapseSidebar: "Collapse the sidebar",
  expand: "Expand",
  collapse: "Collapse",
  mainMenuAria: "Main menu",
  menu: "Menu",
  settings: "Settings",
  navigation: "Navigation",

  // Info tooltip
  moreInfo: "More information",

  // Confirm dialog defaults
  confirm: "Confirm",
  cancel: "Cancel",
  inProgress: "Working…",
}

const fr: typeof en = {
  weeklyScheduleTitle: "Planning hebdomadaire",
  weeklyScheduleSubtitle: "Grille hebdo avec suivi de couverture",
  timesheetTitle: "Validation pointages",
  timesheetSubtitle: "Validez, ajustez ou rejetez les anomalies avec la timeline complète",
  absencesTitle: "Demandes de congés",
  absencesSubtitle: "Validez les congés, repérez les conflits et vérifiez la couverture",
  accountsTitle: "Comptes",
  accountsSubtitle: "Gestion des utilisateurs, rôles et permissions",
  profileSubtitle: "Profil utilisateur et sécurité du compte",

  openMenu: "Ouvrir le menu",
  switchLanguageAria: (current: string) => `Changer de langue (actuelle : ${current})`,
  switchLanguageTitle: "Switch to English",

  organization: "Organisation",

  sectionDashboard: "Dashboard",
  tabOverview: "Vue d'ensemble",
  sectionPeople: "Personnes",
  tabAccounts: "Comptes",
  tabMyProfile: "Mon profil",
  sectionPlanning: "Planning",
  tabSchedules: "Plannings",
  tabTimesheets: "Pointages",
  tabTimeOff: "Congés",
  sectionDevices: "Appareils",
  sectionReports: "Rapports",
  sectionNavAria: (label: string) => `Sections ${label}`,

  userFallback: "Utilisateur",
  roleFallback: "Admin",
  brandHomeAria: "LR Time",
  expandSidebar: "Étendre la barre latérale",
  collapseSidebar: "Réduire la barre latérale",
  expand: "Étendre",
  collapse: "Réduire",
  mainMenuAria: "Menu principal",
  menu: "Menu",
  settings: "Paramètres",
  navigation: "Navigation",

  moreInfo: "Plus d'informations",

  confirm: "Confirmer",
  cancel: "Annuler",
  inProgress: "En cours…",
}

export const shellDict = { en, fr }
