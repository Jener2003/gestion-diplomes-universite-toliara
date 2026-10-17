// Utilitaires d'affichage de l'espace Administrateur
export const formatDate = (valeur, avecHeure = true) => {
  if (!valeur) return '—';
  return new Date(valeur).toLocaleString('fr-FR', avecHeure
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Message lisible à partir d'une erreur d'API DRF (detail, erreurs de champs ou réseau)
export const messageErreur = (erreur, defaut = 'Une erreur est survenue.') => {
  if (!erreur?.response) return 'Serveur inaccessible : vérifiez que le backend fonctionne.';
  const data = erreur.response.data;
  if (erreur.response.status === 403) return data?.detail || "Accès refusé.";
  if (typeof data === 'string') return defaut;
  if (data?.detail) return data.detail;
  if (data && typeof data === 'object') {
    const premier = Object.values(data).flat()[0];
    if (typeof premier === 'string') return premier;
  }
  return defaut;
};
