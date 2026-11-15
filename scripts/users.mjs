/**
 * Comparaison d’identités forge (login, e-mail, display name…).
 * Utilisé pour borner Azure / Bitbucket au titulaire du jeton.
 *
 * @param {string|null|undefined} valeur
 * @param {string[]} cibles
 */
export function correspondUser(valeur, cibles) {
  if (!cibles.length) return false;
  if (valeur == null || valeur === '') return false;
  const bas = cibles.map(u => u.toLowerCase());
  const v = String(valeur).trim().toLowerCase();
  if (bas.includes(v)) return true;
  const at = v.indexOf('@');
  if (at > 0 && bas.includes(v.slice(0, at))) return true;
  return false;
}
