/**
 * Identifiants utilisateurs déclarés sur une source SOURCES_JSON.
 * `users: ["a","b"]`, ou raccourci `user` / `login` pour un seul.
 * Liste vide → comportement historique (compte du jeton).
 *
 * @param {{ users?: unknown, user?: unknown, login?: unknown }} source
 * @returns {string[]} formes telles que déclarées (casse conservée pour les API)
 */
export function normaliserUsers(source) {
  /** @type {string[]} */
  const bruts = [];
  if (Array.isArray(source?.users)) {
    for (const u of source.users) {
      const s = String(u ?? '').trim();
      if (s) bruts.push(s);
    }
  } else {
    const un = source?.user ?? source?.login;
    if (un != null && String(un).trim() !== '') bruts.push(String(un).trim());
  }
  const vus = new Set();
  /** @type {string[]} */
  const out = [];
  for (const u of bruts) {
    const cle = u.toLowerCase();
    if (vus.has(cle)) continue;
    vus.add(cle);
    out.push(u);
  }
  return out;
}

/**
 * True si la valeur (login, e-mail, display name…) correspond à un filtre.
 * Comparaison insensible à la casse ; pour un e-mail, accepte aussi la partie locale.
 *
 * @param {string|null|undefined} valeur
 * @param {string[]} users
 */
export function correspondUser(valeur, users) {
  if (!users.length) return true;
  if (valeur == null || valeur === '') return false;
  const cibles = users.map(u => u.toLowerCase());
  const v = String(valeur).trim().toLowerCase();
  if (cibles.includes(v)) return true;
  const at = v.indexOf('@');
  if (at > 0 && cibles.includes(v.slice(0, at))) return true;
  return false;
}
