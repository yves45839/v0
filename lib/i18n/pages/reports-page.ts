import type { AttendanceReportPeriod } from "@/lib/api/reports"

export type AttendanceExportFieldId =
  | "tenant"
  | "person_id"
  | "employee_name"
  | "department_name"
  | "planning_name"
  | "work_shift_name"
  | "date"
  | "status"
  | "expected_work_period"
  | "arrival_time"
  | "departure_time"
  | "arrival_delta_minutes"
  | "departure_delta_minutes"
  | "planned_minutes"
  | "total_logs"
  | "checkins"
  | "checkouts"
  | "unknown_events"
  | "expected_checkin_at"
  | "actual_checkin_at"
  | "expected_checkout_at"
  | "actual_checkout_at"

export const ATTENDANCE_EXPORT_FIELD_IDS: AttendanceExportFieldId[] = [
  "tenant",
  "person_id",
  "employee_name",
  "department_name",
  "planning_name",
  "work_shift_name",
  "date",
  "status",
  "expected_work_period",
  "arrival_time",
  "departure_time",
  "arrival_delta_minutes",
  "departure_delta_minutes",
  "planned_minutes",
  "total_logs",
  "checkins",
  "checkouts",
  "unknown_events",
  "expected_checkin_at",
  "actual_checkin_at",
  "expected_checkout_at",
  "actual_checkout_at",
]

type AttendanceDayStatus = "compliant" | "partial" | "missing" | "unexpected_activity" | "rest"

const en = {
  // Page header
  pageKicker: "Compliance & attendance",
  pageTitle: "Reports",
  pageSubtitle: "Attendance analysis, compliance and exportable clock-in corrections.",
  loading: "Loading...",
  refresh: "Refresh",
  reset: "Reset",
  generate: "Generate",

  // Header metrics
  metricLogsLabel: "Logs analyzed",
  metricLogsNote: "Total volume",
  metricEmployeesLabel: "Employees covered",
  metricEmployeesNote: "Scope",
  metricCorrectionsLabel: "Corrections loaded",
  metricCorrectionsNote: "Adjustments",

  // Filter bar
  settingsKicker: "Settings",
  filtersTitle: "Filters & exports",
  periodLabels: {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
  } as Record<AttendanceReportPeriod, string>,
  customRange: "Custom range",
  startDateAria: "Start date",
  endDateAria: "End date",
  endDateBeforeStart: "End date must be after the start date.",
  longRangeWarning: "Range longer than 92 days — the export may be large.",
  allDepartments: "All departments",
  allPeople: "All people",
  peopleCount: (n: number) => `${n} people`,
  peopleSelection: "People selection",
  exportsLabel: "Exports",
  fieldsButton: (n: number) => `Fields (${n})`,
  exporting: "Exporting...",
  errorKicker: "Error",

  // Tabs
  tabRecap: "Summary",
  tabDetails: "Arrivals / departures",

  // Recap tab
  includeLateTotals: "Include total lateness",
  includeOvertimeTotals: "Include total overtime",
  metricOkDaysLabel: "Days OK / Total",
  metricOkDaysNote: "Compliant days",
  metricWorkedLabel: "Hours worked",
  metricPeriodNote: "Period total",
  metricLateLabel: "Total lateness",
  metricLateNote: "To monitor",
  metricOvertimeLabel: "Overtime",
  metricComplianceLabel: "Compliance rate",
  metricComplianceNote: "Overall index",

  // Details tab
  searchPlaceholder: "Search name / ID / department...",
  focusLabels: {
    all: "All",
    compliant: "Compliant",
    late: "Late",
    missing: "Absences",
    incident: "Incidents",
  },
  sortPlaceholder: "Sort",
  sortDate: "Date",
  sortEmployee: "Employee",
  sortDepartment: "Department",
  sortStatus: "Status",
  sortAsc: "Asc",
  sortDesc: "Desc",
  rowCount: (n: number) => `${n} row${n !== 1 ? "s" : ""}`,
  thPerson: "Person",
  thDepartment: "Department",
  thDate: "Date",
  thArrival: "Arrival",
  thDeparture: "Departure",
  thCompliance: "Compliance",
  thAction: "Action",
  loadingReport: "Loading report...",
  noDetails: "No attendance details available. Adjust the filters or refresh the report.",
  noFilterResults: "No results for this detail filter.",
  inspect: "Inspect",
  zeroResults: "0 results",
  prev: "Prev",
  next: "Next",

  // Day statuses (compliance)
  statusLabels: {
    compliant: "Compliant",
    partial: "Partial",
    missing: "Missing",
    unexpected_activity: "Unexpected",
    rest: "Rest",
  } as Record<AttendanceDayStatus, string>,
  unassigned: "Unassigned",

  // Export fields dialog
  exportFieldsTitle: "Custom export fields",
  exportFieldsDescription: "Select the columns to include in the Excel, PDF and CSV exports.",
  fieldsCount: (selected: number, total: number) => `${selected} / ${total} fields`,
  selectAll: "Select all",
  saveViewTitle: "Save the view",
  viewNamePlaceholder: "View name (e.g. Monthly HR)",
  saveButton: "Save",
  viewNameRequiredInline: "The view name is required.",
  applyButton: "Apply",
  deleteButton: "Delete",
  noSavedViews: "No saved views yet.",
  close: "Close",

  // Export field labels + hints
  exportFields: {
    tenant: { label: "Tenant", hint: "Tenant code" },
    person_id: { label: "Person ID", hint: "Employee identifier" },
    employee_name: { label: "Employee", hint: "Full name" },
    department_name: { label: "Department", hint: "Unit/department" },
    planning_name: { label: "Planning", hint: "Associated planning" },
    work_shift_name: { label: "Shift", hint: "Associated shift" },
    date: { label: "Date", hint: "Clock-in day" },
    status: { label: "Status", hint: "Compliant, partial, missing..." },
    expected_work_period: { label: "Expected clock-in", hint: "Yes/No per planning" },
    arrival_time: { label: "Arrival time", hint: "Actual arrival time" },
    departure_time: { label: "Departure time", hint: "Actual departure time" },
    arrival_delta_minutes: { label: "Arrival delta (min)", hint: "Lateness in minutes" },
    departure_delta_minutes: { label: "Departure delta (min)", hint: "Early leave/overrun in minutes" },
    planned_minutes: { label: "Planned minutes", hint: "Theoretical duration" },
    total_logs: { label: "Total logs", hint: "Number of logs for the day" },
    checkins: { label: "Check-ins", hint: "Number of check-ins" },
    checkouts: { label: "Check-outs", hint: "Number of check-outs" },
    unknown_events: { label: "Unknown", hint: "Unclassified events" },
    expected_checkin_at: { label: "Expected arrival", hint: "Planned arrival time" },
    actual_checkin_at: { label: "Actual arrival", hint: "Actual arrival date/time" },
    expected_checkout_at: { label: "Expected departure", hint: "Planned departure time" },
    actual_checkout_at: { label: "Actual departure", hint: "Actual departure date/time" },
  } as Record<AttendanceExportFieldId, { label: string; hint: string }>,

  // Detail row dialog
  detailTitle: "Attendance detail",
  detailDescription: "Inspection of a compliance row for operational control.",
  dlgEmployee: "Employee",
  dlgDepartment: "Department",
  dlgDate: "Date",
  dlgStatus: "Status",
  dlgArrivalDeparture: "Arrival / Departure",
  dlgLateOverrun: "Lateness / Overrun",
  deltaMinutes: (arrival: number, departure: number) => `${arrival} min / ${departure} min`,
  copyJson: "Copy JSON",
  correctThisEntry: "Correct this entry",

  // Correction section
  adjustmentKicker: "Adjustment",
  correctionTitle: "Clock-in correction",
  helpLabel: "Help:",
  helpText:
    "Arrival = first check-in of the day. Departure = end-of-day check-out. Break = start and end. Overtime = number of extra hours (e.g. 1.5).",
  choosePerson: "Choose a person",
  noPeople: "No people",
  selectionRequired: "Selection required",
  tenantNotDetected: "Tenant: not detected",
  arrivalTimeLabel: "Arrival time",
  departureTimeLabel: "Departure time",
  overtimeOptionalLabel: "Overtime (optional)",
  overtimePlaceholder: "E.g. 2 or 1.5",
  breakStartOptionalLabel: "Break start (optional)",
  breakEndOptionalLabel: "Break end (optional)",
  notesPlaceholder: "Comment (optional)",
  clear: "Clear",
  savingButton: "Saving...",
  saveCorrectionButton: "Save correction",
  reloadButton: "Reload",

  // Correction messages
  selectPersonToSave: "Select a person to save the correction.",
  tenantNotFound:
    "No tenant found for this person. Select an active organization or load a report filtered by tenant.",
  invalidArrival: "Invalid or incomplete arrival time. Valid example: 08:00.",
  invalidDeparture: "Invalid or incomplete departure time. Valid example: 17:00.",
  breakBothOrNone: "Fill in both break fields (start and end), or leave both empty.",
  invalidBreakStart: "Invalid break start time. Valid example: 12:30.",
  invalidBreakEnd: "Invalid break end time. Valid example: 13:00.",
  departureEqualsArrival: "Departure time must differ from arrival time.",
  atLeastOneField: "Fill in at least one field to correct (arrival, departure, break, overtime or comment).",
  correctionSaved: "Correction saved.",
  arrivalRequired: "Arrival time is required.",
  departureRequired: "Departure time is required.",
  breakBothRequired: "Fill in both break fields (start and end).",

  // Errors
  directoryLoadError: "Unable to load the people/departments directory.",
  reportLoadError: "Unable to load the report.",
  exportReportError: "Unable to export the report.",
  correctionLoadError: "Unable to load the correction.",
  correctionSaveError: "Unable to save the correction.",

  // Toasts
  selectAtLeastOneField: "Select at least one field.",
  viewNameRequiredToast: "View name required.",
  viewSaved: (name: string) => `View "${name}" saved.`,
  viewApplied: (name: string) => `View "${name}" applied.`,
  viewDeleted: (name: string) => `View "${name}" deleted.`,
  filtersReset: "Report filters reset",
  reportRegenerated: "Report regenerated",
  exportSuccess: (format: string) => `Report exported as ${format}`,
  exportErrorToast: "Error exporting the report",
  correctionSavedToast: "Correction saved successfully",
  rowCopied: "Row copied",
  copyFailed: "Copy failed",
}

const fr: typeof en = {
  // Page header
  pageKicker: "Conformité & présence",
  pageTitle: "Rapports",
  pageSubtitle: "Analyse de présence, conformité et corrections de pointage exportables.",
  loading: "Chargement...",
  refresh: "Actualiser",
  reset: "Réinitialiser",
  generate: "Générer",

  // Header metrics
  metricLogsLabel: "Pointages analysés",
  metricLogsNote: "Volume total",
  metricEmployeesLabel: "Employés couverts",
  metricEmployeesNote: "Périmètre",
  metricCorrectionsLabel: "Corrections chargées",
  metricCorrectionsNote: "Ajustements",

  // Filter bar
  settingsKicker: "Paramétrage",
  filtersTitle: "Filtres & exports",
  periodLabels: {
    daily: "Journalier",
    weekly: "Hebdomadaire",
    monthly: "Mensuel",
  },
  customRange: "Plage personnalisée",
  startDateAria: "Date de début",
  endDateAria: "Date de fin",
  endDateBeforeStart: "La date de fin doit être postérieure à la date de début.",
  longRangeWarning: "Plage supérieure à 92 jours — l'export peut être volumineux.",
  allDepartments: "Tous les départements",
  allPeople: "Toutes les personnes",
  peopleCount: (n: number) => `${n} personnes`,
  peopleSelection: "Sélection des personnes",
  exportsLabel: "Exports",
  fieldsButton: (n: number) => `Champs (${n})`,
  exporting: "Export...",
  errorKicker: "Erreur",

  // Tabs
  tabRecap: "Récap",
  tabDetails: "Arrivées / départs",

  // Recap tab
  includeLateTotals: "Inclure total retard",
  includeOvertimeTotals: "Inclure total heures sup",
  metricOkDaysLabel: "Jours OK / Total",
  metricOkDaysNote: "Jours conformes",
  metricWorkedLabel: "Heures travaillées",
  metricPeriodNote: "Cumul période",
  metricLateLabel: "Total retard",
  metricLateNote: "À surveiller",
  metricOvertimeLabel: "Heures sup",
  metricComplianceLabel: "Taux de conformité",
  metricComplianceNote: "Indice global",

  // Details tab
  searchPlaceholder: "Rechercher nom / ID / département...",
  focusLabels: {
    all: "Tous",
    compliant: "Conformes",
    late: "Retards",
    missing: "Absences",
    incident: "Incidents",
  },
  sortPlaceholder: "Tri",
  sortDate: "Date",
  sortEmployee: "Employé",
  sortDepartment: "Département",
  sortStatus: "Statut",
  sortAsc: "Asc",
  sortDesc: "Desc",
  rowCount: (n: number) => `${n} ligne${n !== 1 ? "s" : ""}`,
  thPerson: "Personne",
  thDepartment: "Département",
  thDate: "Date",
  thArrival: "Arrivée",
  thDeparture: "Départ",
  thCompliance: "Conformité",
  thAction: "Action",
  loadingReport: "Chargement du rapport...",
  noDetails: "Aucun détail de présence disponible. Ajustez les filtres ou actualisez le rapport.",
  noFilterResults: "Aucun résultat pour ce filtre détaillé.",
  inspect: "Inspecter",
  zeroResults: "0 résultat",
  prev: "Préc",
  next: "Suiv",

  // Day statuses (compliance)
  statusLabels: {
    compliant: "Conforme",
    partial: "Partiel",
    missing: "Manquant",
    unexpected_activity: "Inattendu",
    rest: "Repos",
  },
  unassigned: "Non assigné",

  // Export fields dialog
  exportFieldsTitle: "Champs personnalisés d'export",
  exportFieldsDescription: "Sélectionnez les colonnes à inclure dans les exports Excel, PDF et CSV.",
  fieldsCount: (selected: number, total: number) => `${selected} / ${total} champs`,
  selectAll: "Tout sélectionner",
  saveViewTitle: "Sauvegarder la vue",
  viewNamePlaceholder: "Nom de vue (ex : RH mensuel)",
  saveButton: "Sauvegarder",
  viewNameRequiredInline: "Le nom de la vue est obligatoire.",
  applyButton: "Appliquer",
  deleteButton: "Supprimer",
  noSavedViews: "Aucune vue sauvegardée pour le moment.",
  close: "Fermer",

  // Export field labels + hints
  exportFields: {
    tenant: { label: "Tenant", hint: "Code tenant" },
    person_id: { label: "Person ID", hint: "Identifiant employé" },
    employee_name: { label: "Employé", hint: "Nom complet" },
    department_name: { label: "Département", hint: "Service/département" },
    planning_name: { label: "Planning", hint: "Planning associé" },
    work_shift_name: { label: "Shift", hint: "Shift associé" },
    date: { label: "Date", hint: "Jour de pointage" },
    status: { label: "Statut", hint: "Conforme, partiel, manquant..." },
    expected_work_period: { label: "Pointage attendu", hint: "Oui/Non selon planning" },
    arrival_time: { label: "Heure d'arrivée", hint: "Heure réelle d'arrivée" },
    departure_time: { label: "Heure de départ", hint: "Heure réelle de départ" },
    arrival_delta_minutes: { label: "Écart arrivée (min)", hint: "Retard en minutes" },
    departure_delta_minutes: { label: "Écart départ (min)", hint: "Avance/dépassement en minutes" },
    planned_minutes: { label: "Minutes planifiées", hint: "Durée théorique" },
    total_logs: { label: "Total logs", hint: "Nombre de logs du jour" },
    checkins: { label: "Entrées", hint: "Nombre d'entrées" },
    checkouts: { label: "Sorties", hint: "Nombre de sorties" },
    unknown_events: { label: "Inconnus", hint: "Événements non classés" },
    expected_checkin_at: { label: "Arrivée attendue", hint: "Heure planifiée d'arrivée" },
    actual_checkin_at: { label: "Arrivée réelle", hint: "Date/heure réelle d'arrivée" },
    expected_checkout_at: { label: "Départ attendu", hint: "Heure planifiée de départ" },
    actual_checkout_at: { label: "Départ réel", hint: "Date/heure réelle de départ" },
  },

  // Detail row dialog
  detailTitle: "Détail de présence",
  detailDescription: "Inspection d'une ligne de conformité pour contrôle opérationnel.",
  dlgEmployee: "Employé",
  dlgDepartment: "Département",
  dlgDate: "Date",
  dlgStatus: "Statut",
  dlgArrivalDeparture: "Arrivée / Départ",
  dlgLateOverrun: "Retard / Dépassement",
  deltaMinutes: (arrival: number, departure: number) => `${arrival} min / ${departure} min`,
  copyJson: "Copier JSON",
  correctThisEntry: "Corriger ce pointage",

  // Correction section
  adjustmentKicker: "Ajustement",
  correctionTitle: "Correction de pointage",
  helpLabel: "Aide :",
  helpText:
    "Arrivée = première entrée de la journée. Départ = sortie de fin de journée. Pause = début et fin. Heures sup = nombre d'heures supplémentaires (ex : 1.5).",
  choosePerson: "Choisir une personne",
  noPeople: "Aucune personne",
  selectionRequired: "Sélection requise",
  tenantNotDetected: "Tenant : non détecté",
  arrivalTimeLabel: "Heure d'arrivée",
  departureTimeLabel: "Heure de départ",
  overtimeOptionalLabel: "Heures sup (optionnel)",
  overtimePlaceholder: "Ex : 2 ou 1.5",
  breakStartOptionalLabel: "Début de pause (optionnel)",
  breakEndOptionalLabel: "Fin de pause (optionnel)",
  notesPlaceholder: "Commentaire (optionnel)",
  clear: "Effacer",
  savingButton: "Enregistrement...",
  saveCorrectionButton: "Enregistrer la correction",
  reloadButton: "Recharger",

  // Correction messages
  selectPersonToSave: "Sélectionnez une personne pour enregistrer la correction.",
  tenantNotFound:
    "Tenant introuvable pour cette personne. Sélectionnez une organisation active ou chargez un rapport filtré par tenant.",
  invalidArrival: "Heure d'arrivée invalide ou incomplète. Exemple valide : 08:00.",
  invalidDeparture: "Heure de départ invalide ou incomplète. Exemple valide : 17:00.",
  breakBothOrNone: "Renseignez les deux champs de pause (début et fin), ou laissez les deux vides.",
  invalidBreakStart: "Heure de début de pause invalide. Exemple valide : 12:30.",
  invalidBreakEnd: "Heure de fin de pause invalide. Exemple valide : 13:00.",
  departureEqualsArrival: "L'heure de départ doit être différente de l'heure d'arrivée.",
  atLeastOneField: "Renseignez au moins un champ à corriger (arrivée, départ, pause, heures sup ou commentaire).",
  correctionSaved: "Correction enregistrée.",
  arrivalRequired: "Heure d'arrivée obligatoire.",
  departureRequired: "Heure de départ obligatoire.",
  breakBothRequired: "Renseignez les deux champs de pause (début et fin).",

  // Errors
  directoryLoadError: "Impossible de charger l'annuaire personnes/départements.",
  reportLoadError: "Impossible de charger le rapport.",
  exportReportError: "Impossible d'exporter le rapport.",
  correctionLoadError: "Impossible de charger la correction.",
  correctionSaveError: "Impossible d'enregistrer la correction.",

  // Toasts
  selectAtLeastOneField: "Sélectionnez au moins un champ.",
  viewNameRequiredToast: "Nom de vue requis.",
  viewSaved: (name: string) => `Vue "${name}" enregistrée.`,
  viewApplied: (name: string) => `Vue "${name}" appliquée.`,
  viewDeleted: (name: string) => `Vue "${name}" supprimée.`,
  filtersReset: "Filtres de rapport réinitialisés",
  reportRegenerated: "Rapport régénéré",
  exportSuccess: (format: string) => `Rapport exporté en ${format}`,
  exportErrorToast: "Erreur lors de l'export du rapport",
  correctionSavedToast: "Correction enregistrée avec succès",
  rowCopied: "Ligne copiée",
  copyFailed: "Copie impossible",
}

export const reportsPageDict = { en, fr }
