/**
 * Adapter GitLab.com / self-hosted : événements utilisateur (issues, MR,
 * pushes, commentaires) agrégés par jour, plus le nombre de projets où
 * l’utilisateur a réellement intervenu pendant l’année.
 */

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
 * @param {{ token: string, baseUrl?: string, annee: number }} source
 */
export async function collecterGitlab(source) {
  const base = source.baseUrl ?? 'https://gitlab.com';
  const after = `${source.annee - 1}-12-31`;
  const before = `${source.annee + 1}-01-01`;

  /** @type {Map<string, number>} */
  const byDate = new Map();
  /** @type {Set<number|string>} */
  const projetsTouches = new Set();
  let page = 1;
  for (;;) {
    const { data } = await gitlabGet(base, source.token, '/events', {
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
      if (!date.startsWith(String(source.annee))) continue;
      byDate.set(date, (byDate.get(date) ?? 0) + 1);
      const pid = ev.project_id ?? ev.project?.id;
      if (pid != null) projetsTouches.add(pid);
    }
    if (data.length < 100) break;
    page += 1;
    if (page > 50) break;
  }

  const jours = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    depots: projetsTouches.size,
    jours,
  };
}
