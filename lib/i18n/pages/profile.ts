const en = {
  loadError: "Unable to load the profile.",
  profileUpdated: "Profile updated.",
  profileUpdateError: "Failed to update the profile.",
  passwordConfirmMismatch: "The new password and the confirmation do not match.",
  passwordTooShort: "The new password must be at least 8 characters long.",
  passwordChanged: "Password changed.",
  passwordChangeError: "Unable to change the password.",

  title: "My profile",
  subtitle: "Personal information of the signed-in account.",
  loading: "Loading...",
  usernameLabel: "Username",
  emailLabel: "Email",
  firstNameLabel: "First name",
  lastNameLabel: "Last name",
  saveProfile: "Save profile",
  accountLine: (id: number, active: boolean) => `Account #${id} • ${active ? "Active" : "Inactive"}`,

  securityTitle: "Change password",
  securitySubtitle: "The new password must be strong and unique.",
  currentPasswordLabel: "Current password",
  newPasswordLabel: "New password",
  confirmPasswordLabel: "Confirm password",
  updatePassword: "Update password",
}

const fr: typeof en = {
  loadError: "Impossible de charger le profil.",
  profileUpdated: "Profil mis à jour.",
  profileUpdateError: "Échec de mise à jour du profil.",
  passwordConfirmMismatch: "Le nouveau mot de passe et la confirmation ne correspondent pas.",
  passwordTooShort: "Le nouveau mot de passe doit avoir au moins 8 caractères.",
  passwordChanged: "Mot de passe modifié.",
  passwordChangeError: "Impossible de changer le mot de passe.",

  title: "Mon profil",
  subtitle: "Informations personnelles du compte connecté.",
  loading: "Chargement...",
  usernameLabel: "Nom d'utilisateur",
  emailLabel: "Email",
  firstNameLabel: "Prénom",
  lastNameLabel: "Nom",
  saveProfile: "Enregistrer le profil",
  accountLine: (id: number, active: boolean) => `Compte #${id} • ${active ? "Actif" : "Inactif"}`,

  securityTitle: "Changer le mot de passe",
  securitySubtitle: "Le nouveau mot de passe doit être fort et unique.",
  currentPasswordLabel: "Mot de passe actuel",
  newPasswordLabel: "Nouveau mot de passe",
  confirmPasswordLabel: "Confirmer le mot de passe",
  updatePassword: "Mettre à jour le mot de passe",
}

export const profileDict = { en, fr }
