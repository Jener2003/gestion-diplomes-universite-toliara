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

// Durée écoulée lisible : « à l'instant », « il y a 5 min », « il y a 3 h », « il y a 2 j »
export const depuis = (valeur, maintenant = Date.now()) => {
  if (!valeur) return null;
  const minutes = Math.floor((maintenant - new Date(valeur).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours < 30) return `il y a ${jours} j`;
  return `le ${formatDate(valeur, false)}`;
};

export const PRESENCES = {
  en_ligne: 'En ligne',
  absent: 'Absent',
  hors_ligne: 'Hors ligne',
};
