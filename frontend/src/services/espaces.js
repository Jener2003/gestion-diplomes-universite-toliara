// Page d'accueil de chaque rôle après connexion.
// Les cinq rôles métier partagent /dashboard, qui affiche l'espace propre à chaque rôle.
export const ROLE_ADMIN = 'ADMIN_SYSTEME';

export const ROLES_METIER = [
  'SCOLARITE_ETABLISSEMENT',
  'SCOLARITE_CENTRALE',
  'CHEF_SERVICE',
  'IMPRIMEUR',
  'AGENT_TRANSMISSION',
  'PRESIDENCE',
];

export const accueilParRole = (role) => {
  if (!role) return '/login';
  if (role === ROLE_ADMIN) return '/administration';
  if (ROLES_METIER.includes(role)) return '/dashboard';
  return '/forbidden';
};
