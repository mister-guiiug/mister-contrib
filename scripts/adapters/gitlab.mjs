/**
 * Adapter GitLab.com / self-hosted : événements utilisateur (issues, MR,
 * pushes, commentaires) agrégés par jour, plus les projets touchés.
 *
 * Sans filtre : événements du jeton (`/events`).
 * Avec `users` : événements publics/accessibles de chaque username.
 */

import { normaliserUsers } from '../users.mjs';

/**
 * @param {string} base
 * @param {string} token
 * @param {string} path
 * @param {Record<string, string>} [query]
 */
async function gitlabGet(base, token, path, query = {}) {
  const url = new URL(`${base.replace(/\/$/, '')}/api/v4${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: {
      'PRIVATE-TOKEN': token,
      Accept: 'application/json',
      'User-Agent': 'mister-contrib-releve',
    },
  });
  if (!res.ok) throw new Error(`gitlab HTTP ${res.status} ${path}`);
  const total = res.headers.get('x-total');
  const data = await res.json();
  return { data, total: total ? Number(total) : null };
}

/**
 * @param {string} base
 * @param {string} token
 * @param {string} username
 */
async function resolirUserId(base, token, username) {
  const { data } = await gitlabGet(base, token, '/users', {
    username,
    per_page: '1',
  });
  const id = Array.isArray(data) ? data[0]?.id : null;
  if (id == null)
    throw new Error(`gitlab: utilisateur introuvable « ${username} »`);
  return id;
}

/**
 * @param {string} base
 * @param {string} token
 * @param {string} path
 * @param {number} annee
 * @param {string} after
 * @param {string} before
 */
async function collecterEvents(base, token, path, annee, after, before) {
  /** @type {Map<string, number>} */
  const byDate = new Map();
  /** @type {Set<number|string>} */
  const projetsTouches = new Set();
  let page = 1;
  for (;;) {
    const { data } = await gitlabGet(base, token, path, {
      after,
      before,
      per_page: '100',
      page: String(page),
    });
    if (!Array.isArray(data) || data.length === 0) break;
    for (const ev of data) {
      const created = ev.created_at ?? ev.createdAt;
      if (!created) continue;
      const date = String(created).slice(0, 10);
      if (!date.startsWith(String(annee))) continue;
      byDate.set(date, (byDate.get(date) ?? 0) + 1);
      const pid = ev.project_id ?? ev.project?.id;
      if (pid != null) projetsTouches.add(pid);
    }
    if (data.length < 100) break;
    page += 1;
    if (page > 50) break;
  }
  return { byDate, projetsTouches };
}

/**
 * @param {{ token: string, baseUrl?: string, annee: number, users?: string[], user?: string, login?: string }} source
 */
export async function collecterGitlab(source) {
  const base = source.baseUrl ?? 'https://gitlab.com';
  const after = `${source.annee - 1}-12-31`;
  const before = `${source.annee + 1}-01-01`;
  const users = normaliserUsers(source);

  /** @type {Map<string, number>} */
  const byDate = new Map();
  /** @type {Set<number|string>} */
  const projetsTouches = new Set();

  /** @param {{ byDate: Map<string, number>, projetsTouches: Set<number|string> }} bloc */
  const accumuler = bloc => {
    for (const [date, count] of bloc.byDate) {
      byDate.set(date, (byDate.get(date) ?? 0) + count);
    }
    for (const id of bloc.projetsTouches) projetsTouches.add(id);
  };

  if (users.length === 0) {
    accumuler(
      await collecterEvents(
        base,
        source.token,
        '/events',
        source.annee,
        after,
        before
      )
    );
  } else {
    for (const username of users) {
      const id = await resolirUserId(base, source.token, username);
      accumuler(
        await collecterEvents(
          base,
          source.token,
          `/users/${id}/events`,
          source.annee,
          after,
          before
        )
      );
    }
  }

  const jours = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    depots: projetsTouches.size,
    jours,
  };
}
