/**
 * Adapter Azure DevOps : commits + pull requests de l'année du (des)
 * auteur(s) ciblé(s). Sans `users` : titulaire du jeton uniquement —
 * jamais tous les commits de l’organisation.
 */

import { correspondUser, normaliserUsers } from '../users.mjs';

/**
 * @param {string} org
 * @param {string} token
 * @param {string} path
 * @param {Record<string, string>} [query]
 */
async function adoGet(org, token, path, query = {}) {
  const url = new URL(
    `https://dev.azure.com/${encodeURIComponent(org)}${path}`
  );
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  if (!url.searchParams.has('api-version')) {
    url.searchParams.set('api-version', '7.1');
  }
  const auth = Buffer.from(`:${token}`).toString('base64');
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'User-Agent': 'mister-contrib-releve',
    },
  });
  if (!res.ok) throw new Error(`azuredevops HTTP ${res.status} ${path}`);
  return res.json();
}

/**
 * @param {{ token: string, org: string, annee: number, users?: string[], user?: string, login?: string }} source
 */
export async function collecterAzureDevops(source) {
  if (!source.org) throw new Error('azuredevops: org manquant');

  const reposBody = await adoGet(
    source.org,
    source.token,
    '/_apis/git/repositories'
  );
  const repos = reposBody.value ?? [];
  const from = `${source.annee}-01-01T00:00:00Z`;
  const to = `${source.annee}-12-31T23:59:59Z`;
  const users = normaliserUsers(source);

  /** @type {Map<string, number>} */
  const byDate = new Map();
  /** @type {Set<string>} */
  const depotsTouches = new Set();
  const bump = (date, repoId) => {
    if (!date?.startsWith(String(source.annee))) return;
    byDate.set(date, (byDate.get(date) ?? 0) + 1);
    if (repoId) depotsTouches.add(String(repoId));
  };

  const me = await adoGet(source.org, source.token, '/_apis/connectionData', {
    'api-version': '7.1-preview.1',
  }).catch(() => null);
  const tokenEmail =
    me?.authenticatedUser?.properties?.Account?.['$value'] ??
    me?.authenticatedUser?.providerDisplayName ??
    null;
  const tokenDisplay =
    me?.authenticatedUser?.providerDisplayName ??
    me?.authenticatedUser?.customDisplayName ??
    null;

  /** Toujours un filtre : users déclarés, sinon titulaire du jeton. Jamais « tout le monde ». */
  const filtre =
    users.length > 0
      ? users
      : [tokenEmail, tokenDisplay]
          .map(v => (v == null ? '' : String(v).trim()))
          .filter(Boolean);
  if (filtre.length === 0) {
    throw new Error(
      'azuredevops: impossible de résoudre le titulaire du jeton (pose users[])'
    );
  }

  for (const repo of repos) {
    const project = repo.project?.name;
    const repoId = repo.id;
    if (!project || !repoId) continue;

    try {
      for (const auteur of filtre) {
        const commits = await adoGet(
          source.org,
          source.token,
          `/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/commits`,
          {
            'searchCriteria.fromDate': from,
            'searchCriteria.toDate': to,
            'searchCriteria.author': auteur,
            $top: '100',
          }
        );
        for (const c of commits.value ?? []) {
          const date = String(c.author?.date ?? c.committer?.date ?? '').slice(
            0,
            10
          );
          bump(date, repoId);
        }
      }
    } catch {
      // un dépôt inaccessible ne bloque pas le reste
    }

    try {
      const prs = await adoGet(
        source.org,
        source.token,
        `/${encodeURIComponent(project)}/_apis/git/pullrequests`,
        {
          'searchCriteria.status': 'all',
          'searchCriteria.minTime': from,
          $top: '100',
        }
      );
      for (const pr of prs.value ?? []) {
        const createur =
          pr.createdBy?.uniqueName ??
          pr.createdBy?.directoryAlias ??
          pr.createdBy?.displayName ??
          null;
        if (!correspondUser(createur, filtre)) continue;
        const date = String(pr.creationDate ?? '').slice(0, 10);
        bump(date, repoId);
      }
    } catch {
      // idem
    }
  }

  const jours = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return { depots: depotsTouches.size, jours };
}
