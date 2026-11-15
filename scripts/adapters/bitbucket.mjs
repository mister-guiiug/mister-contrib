/**
 * Adapter Bitbucket Cloud : commits / PRs de l'année du (des) compte(s)
 * ciblé(s). Sans `users` : uniquement le titulaire du jeton (`GET /user`),
 * jamais tout le workspace.
 */

import { correspondUser, normaliserUsers } from '../users.mjs';

/**
 * @param {string} token
 * @param {string} path
 * @param {Record<string, string>} [query]
 */
async function bbGet(token, path, query = {}) {
  const url = new URL(`https://api.bitbucket.org/2.0${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'mister-contrib-releve',
    },
  });
  if (!res.ok) throw new Error(`bitbucket HTTP ${res.status} ${path}`);
  return res.json();
}

/**
 * @param {object|null|undefined} user
 * @param {string[]} filtre toujours non vide
 */
function auteurOk(user, filtre) {
  return (
    correspondUser(user?.nickname, filtre) ||
    correspondUser(user?.username, filtre) ||
    correspondUser(user?.display_name, filtre) ||
    correspondUser(user?.uuid, filtre) ||
    correspondUser(user?.account_id, filtre)
  );
}

/**
 * @param {{ token: string, workspace: string, annee: number, users?: string[], user?: string, login?: string }} source
 */
export async function collecterBitbucket(source) {
  if (!source.workspace) throw new Error('bitbucket: workspace manquant');

  const declares = normaliserUsers(source);
  /** @type {string[]} */
  let filtre = declares;
  if (filtre.length === 0) {
    const me = await bbGet(source.token, '/user');
    filtre = [
      me?.nickname,
      me?.username,
      me?.display_name,
      me?.uuid,
      me?.account_id,
    ]
      .map(v => (v == null ? '' : String(v).trim()))
      .filter(Boolean);
    if (filtre.length === 0) {
      throw new Error(
        'bitbucket: impossible de résoudre le titulaire du jeton'
      );
    }
  }

  /** @type {Map<string, number>} */
  const byDate = new Map();
  /** @type {Set<string>} */
  const depotsTouches = new Set();
  const bump = (date, repoKey) => {
    if (!date?.startsWith(String(source.annee))) return;
    byDate.set(date, (byDate.get(date) ?? 0) + 1);
    if (repoKey) depotsTouches.add(repoKey);
  };

  const repos = [];
  let next = `/repositories/${encodeURIComponent(source.workspace)}`;
  let pageGuard = 0;
  while (next && pageGuard < 20) {
    pageGuard += 1;
    const path = next.startsWith('http')
      ? new URL(next).pathname.replace(/^\/2\.0/, '') +
        (new URL(next).search || '')
      : next;
    const body = next.startsWith('http')
      ? await fetch(next, {
          headers: {
            Authorization: `Bearer ${source.token}`,
            Accept: 'application/json',
            'User-Agent': 'mister-contrib-releve',
          },
        }).then(r => {
          if (!r.ok) throw new Error(`bitbucket HTTP ${r.status}`);
          return r.json();
        })
      : await bbGet(source.token, path);
    repos.push(...(body.values ?? []));
    next = body.next ?? null;
  }

  for (const repo of repos) {
    const full = repo.full_name;
    if (!full) continue;
    try {
      let commitsNext = `/repositories/${full}/commits`;
      let guard = 0;
      while (commitsNext && guard < 10) {
        guard += 1;
        const body = commitsNext.startsWith('http')
          ? await fetch(commitsNext, {
              headers: {
                Authorization: `Bearer ${source.token}`,
                Accept: 'application/json',
                'User-Agent': 'mister-contrib-releve',
              },
            }).then(r => {
              if (!r.ok) throw new Error(`bitbucket HTTP ${r.status}`);
              return r.json();
            })
          : await bbGet(source.token, commitsNext);
        for (const c of body.values ?? []) {
          const date = String(c.date ?? '').slice(0, 10);
          if (date && date < `${source.annee}-01-01`) {
            commitsNext = null;
            break;
          }
          if (!auteurOk(c.author?.user ?? c.author, filtre)) continue;
          bump(date, full);
        }
        if (!commitsNext) break;
        commitsNext = body.next ?? null;
      }
    } catch {
      // dépôt inaccessible
    }

    try {
      const prs = await bbGet(
        source.token,
        `/repositories/${full}/pullrequests`,
        { state: 'OPEN,MERGED,DECLINED,SUPERSEDED', pagelen: '50' }
      );
      for (const pr of prs.values ?? []) {
        if (!auteurOk(pr.author, filtre)) continue;
        const date = String(pr.created_on ?? '').slice(0, 10);
        bump(date, full);
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
