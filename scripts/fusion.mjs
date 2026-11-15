/**
 * Fusionne les résultats des adapters en un instantané public anonymisé.
 * Aucune clé `kind`, URL ou détail de source ne doit sortir d'ici.
 *
 * `depots` additionne, par source, le nombre de dépôts où une intervention
 * a été mesurée sur l’année — pas le catalogue accessible. Deux forges
 * distinctes restent deux comptes : on n’a pas d’identité croisée anonymisée.
 */

/**
 * @typedef {{ date: string, count: number }} Jour
 * @typedef {{ depots: number, jours: Jour[], erreur?: string }} SourceResultat
 */

/**
 * @param {SourceResultat[]} resultats
 * @param {{ genere?: string, annee?: number }} [opts]
 */
export function fusionner(resultats, opts = {}) {
  const annee = opts.annee ?? new Date().getUTCFullYear();
  const byDate = new Map();
  let depots = 0;
  let echecs = 0;

  for (const r of resultats) {
    if (r.erreur) {
      echecs += 1;
      continue;
    }
    depots += Number(r.depots) || 0;
    for (const j of r.jours ?? []) {
      if (!j?.date || typeof j.count !== 'number') continue;
      byDate.set(j.date, (byDate.get(j.date) ?? 0) + j.count);
    }
  }

  const jours = [...byDate.entries()]
    .filter(([date]) => date.startsWith(String(annee)))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const contributions = jours.reduce((s, j) => s + j.count, 0);

  /** @type {Record<string, unknown>} */
  const sortie = {
    genere: opts.genere ?? new Date().toISOString(),
    annee,
    contributions,
    depots,
    jours,
  };
  if (echecs > 0) sortie.partiel = true;
  return sortie;
}

/** Refuse toute fuite de plateforme dans l'objet public. */
export function assertAnonyme(donnees) {
  const texte = JSON.stringify(donnees);
  const interdits = [
    'kind',
    'github',
    'gitlab',
    'azure',
    'bitbucket',
    'baseUrl',
    'token',
    'sources',
    'hostname',
  ];
  for (const mot of interdits) {
    if (new RegExp(`"${mot}"`, 'i').test(texte)) {
      throw new Error(`fuite dans donnees.json : clé suspecte « ${mot} »`);
    }
  }
  return donnees;
}
