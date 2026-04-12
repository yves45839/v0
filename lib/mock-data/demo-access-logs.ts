/**
 * Données de démonstration pour la page Journaux d'accès.
 * Utilisées quand l'API n'est pas disponible.
 */

const TODAY = new Date().toISOString().split("T")[0]
const TODAY_LABEL = new Date().toLocaleDateString("fr-FR")

type DemoAccessLog = {
  id: string
  employeeId: string
  employeeName: string
  department: string
  deviceId: string
  deviceName: string
  deviceLocation: string
  status: "granted" | "denied" | "unknown"
  accessType: string
  site: string
  reason?: string
  timestamp: string
  date: string
  dateLabel: string
}

export const DEMO_ACCESS_LOGS: DemoAccessLog[] = [
  { id: "9001", employeeId: "EMP-0001", employeeName: "Sarah Chen", department: "Ingenierie", deviceId: "d-1", deviceName: "Entree Principale A", deviceLocation: "Batiment A, RDC", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "09:03:22", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9002", employeeId: "EMP-0042", employeeName: "Michael Torres", department: "Marketing", deviceId: "d-3", deviceName: "Etage 3", deviceLocation: "Batiment A, Etage 3", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "09:02:58", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9003", employeeId: "EMP-0156", employeeName: "Emily Watson", department: "Finance", deviceId: "d-5", deviceName: "Salle Serveurs", deviceLocation: "Batiment B, Sous-sol", status: "denied", accessType: "ACCESS_DENIED", site: "Site HQ", reason: "Droits d'acces insuffisants", timestamp: "09:02:31", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9004", employeeId: "EMP-0089", employeeName: "James Liu", department: "Ingenierie", deviceId: "d-2", deviceName: "Entree Principale B", deviceLocation: "Batiment A, RDC", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "09:01:45", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9005", employeeId: "EMP-0203", employeeName: "Anna Kowalski", department: "Ressources Humaines", deviceId: "d-6", deviceName: "Bureau RH", deviceLocation: "Batiment A, Etage 4", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "09:00:12", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9006", employeeId: "EMP-0078", employeeName: "David Kim", department: "Commercial", deviceId: "d-1", deviceName: "Entree Principale A", deviceLocation: "Batiment A, RDC", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "08:59:33", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9007", employeeId: "EMP-0112", employeeName: "Rachel Green", department: "Ingenierie", deviceId: "d-7", deviceName: "Lab Creatif", deviceLocation: "Batiment C, Etage 1", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "08:58:17", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9008", employeeId: "EMP-0199", employeeName: "Marc Dupont", department: "Direction", deviceId: "d-1", deviceName: "Entree Principale A", deviceLocation: "Batiment A, RDC", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "08:55:00", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9009", employeeId: "EMP-0234", employeeName: "Leila Benali", department: "Finance", deviceId: "d-4", deviceName: "Salle Finance", deviceLocation: "Batiment A, Etage 2", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "08:52:44", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9010", employeeId: "VISITOR-001", employeeName: "Visiteur Inconnu", department: "-", deviceId: "d-1", deviceName: "Entree Principale A", deviceLocation: "Batiment A, RDC", status: "denied", accessType: "ACCESS_DENIED", site: "Site HQ", reason: "Badge non reconnu", timestamp: "08:49:15", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9011", employeeId: "EMP-0042", employeeName: "Michael Torres", department: "Marketing", deviceId: "d-5", deviceName: "Salle Serveurs", deviceLocation: "Batiment B, Sous-sol", status: "denied", accessType: "ACCESS_DENIED", site: "Site HQ", reason: "Zone restreinte", timestamp: "08:45:10", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9012", employeeId: "EMP-0301", employeeName: "Thomas Moreau", department: "Marketing", deviceId: "d-1", deviceName: "Entree Principale A", deviceLocation: "Batiment A, RDC", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "08:44:52", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9013", employeeId: "EMP-0089", employeeName: "James Liu", department: "Ingenierie", deviceId: "d-5", deviceName: "Salle Serveurs", deviceLocation: "Batiment B, Sous-sol", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "08:40:33", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9014", employeeId: "EMP-0001", employeeName: "Sarah Chen", department: "Ingenierie", deviceId: "d-5", deviceName: "Salle Serveurs", deviceLocation: "Batiment B, Sous-sol", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "08:38:20", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9015", employeeId: "EMP-0199", employeeName: "Marc Dupont", department: "Direction", deviceId: "d-8", deviceName: "Parking Barriere", deviceLocation: "Parking", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "08:30:05", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9016", employeeId: "EMP-0156", employeeName: "Emily Watson", department: "Finance", deviceId: "d-1", deviceName: "Entree Principale A", deviceLocation: "Batiment A, RDC", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "08:28:44", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9017", employeeId: "EMP-0203", employeeName: "Anna Kowalski", department: "Ressources Humaines", deviceId: "d-1", deviceName: "Entree Principale A", deviceLocation: "Batiment A, RDC", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "07:55:10", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9018", employeeId: "VISITOR-002", employeeName: "Technicien Externe", department: "-", deviceId: "d-2", deviceName: "Entree Principale B", deviceLocation: "Batiment A, RDC", status: "denied", accessType: "ACCESS_DENIED", site: "Site HQ", reason: "Acces expire", timestamp: "07:48:30", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9019", employeeId: "EMP-0078", employeeName: "David Kim", department: "Commercial", deviceId: "d-8", deviceName: "Parking Barriere", deviceLocation: "Parking", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "07:45:00", date: TODAY, dateLabel: TODAY_LABEL },
  { id: "9020", employeeId: "EMP-0234", employeeName: "Leila Benali", department: "Finance", deviceId: "d-1", deviceName: "Entree Principale A", deviceLocation: "Batiment A, RDC", status: "granted", accessType: "CHECK_IN", site: "Site HQ", timestamp: "07:42:15", date: TODAY, dateLabel: TODAY_LABEL },
]
