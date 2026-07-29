const en = {
  loadOrganizationsError: "Unable to load organizations.",
  loadUsersRolesError: "Error loading users/roles.",
  refreshError: "Refresh failed.",

  roleNameRequired: "The role name is required.",
  roleCreated: "Role created.",
  roleCreateError: "Unable to create the role.",

  userFieldsRequired: "A valid email and a password (8 characters min) are required.",
  userCreated: "User created and email sent.",
  userCreateError: "Unable to create the user.",

  roleAssigned: "Role assigned.",
  roleRemoved: "Role removed.",
  assignError: "Unable to update the assignment.",

  title: "User accounts & roles",
  subtitle: "Create tenant accounts, custom roles and assignments per organization.",
  organizationLabel: "Organization",
  loadingPlaceholder: "Loading...",
  selectOrganizationPlaceholder: "Select an organization",
  tenantLine: (tenantName: string, tenantCode: string) => `Tenant: ${tenantName} (${tenantCode}) • Your tenant role:`,
  refresh: "Refresh",

  createRoleTitle: "Create a custom role",
  roleNameLabel: "Role name",
  roleDescriptionLabel: "Description",
  roleActiveLabel: "Active role",
  createRole: "Create role",

  createUserTitle: "Create a user",
  emailLabel: "Email",
  passwordLabel: "Password",
  usernameOptionalLabel: "Username (optional)",
  firstNameLabel: "First name",
  lastNameLabel: "Last name",
  tenantRoleLabel: "Tenant role",
  organizationRoleLabel: "Organization role",
  customRolesToAssignLabel: "Custom roles to assign",
  noCustomRolesAvailable: "No custom roles available.",
  createUser: "Create user",

  customRolesTitle: "Custom roles",
  customRolesCount: (n: number) => `${n} role${n !== 1 ? "s" : ""} available in the selected organization.`,
  noCustomRoles: "No custom roles.",

  usersTitle: "Organization users",
  usersCount: (n: number) => `${n} user${n !== 1 ? "s" : ""} found.`,
  noUsers: "No users for this organization.",
  inactiveBadge: "inactive",

  roleLabels: {
    viewer: "Viewer",
    operator: "Operator",
    org_admin: "Organization admin",
    tenant_admin: "Tenant admin",
  } as Record<string, string>,
}

const fr: typeof en = {
  loadOrganizationsError: "Impossible de charger les organisations.",
  loadUsersRolesError: "Erreur de chargement utilisateurs/rôles.",
  refreshError: "Échec d'actualisation.",

  roleNameRequired: "Le nom du rôle est obligatoire.",
  roleCreated: "Rôle créé.",
  roleCreateError: "Impossible de créer le rôle.",

  userFieldsRequired: "Email valide et mot de passe (8 caractères min) sont obligatoires.",
  userCreated: "Utilisateur créé et email envoyé.",
  userCreateError: "Impossible de créer l'utilisateur.",

  roleAssigned: "Rôle attribué.",
  roleRemoved: "Rôle retiré.",
  assignError: "Impossible de modifier l'attribution.",

  title: "Comptes utilisateurs & rôles",
  subtitle: "Création de comptes tenant, rôles personnalisés et attribution par organisation.",
  organizationLabel: "Organisation",
  loadingPlaceholder: "Chargement...",
  selectOrganizationPlaceholder: "Sélectionner une organisation",
  tenantLine: (tenantName: string, tenantCode: string) => `Tenant : ${tenantName} (${tenantCode}) • Votre rôle tenant :`,
  refresh: "Actualiser",

  createRoleTitle: "Créer un rôle personnalisé",
  roleNameLabel: "Nom du rôle",
  roleDescriptionLabel: "Description",
  roleActiveLabel: "Rôle actif",
  createRole: "Créer le rôle",

  createUserTitle: "Créer un utilisateur",
  emailLabel: "Email",
  passwordLabel: "Mot de passe",
  usernameOptionalLabel: "Nom d'utilisateur (optionnel)",
  firstNameLabel: "Prénom",
  lastNameLabel: "Nom",
  tenantRoleLabel: "Rôle tenant",
  organizationRoleLabel: "Rôle organisation",
  customRolesToAssignLabel: "Rôles personnalisés à attribuer",
  noCustomRolesAvailable: "Aucun rôle personnalisé disponible.",
  createUser: "Créer l'utilisateur",

  customRolesTitle: "Rôles personnalisés",
  customRolesCount: (n: number) => `${n} rôle${n !== 1 ? "s" : ""} disponible${n !== 1 ? "s" : ""} dans l'organisation sélectionnée.`,
  noCustomRoles: "Aucun rôle personnalisé.",

  usersTitle: "Utilisateurs de l'organisation",
  usersCount: (n: number) => `${n} utilisateur${n !== 1 ? "s" : ""} trouvé${n !== 1 ? "s" : ""}.`,
  noUsers: "Aucun utilisateur pour cette organisation.",
  inactiveBadge: "inactif",

  roleLabels: {
    viewer: "Lecteur",
    operator: "Opérateur",
    org_admin: "Admin organisation",
    tenant_admin: "Admin tenant",
  } as Record<string, string>,
}

export const tenantUsersDict = { en, fr }
