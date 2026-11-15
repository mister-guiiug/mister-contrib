#!/usr/bin/env node
/**
 * Relevé multi-forges → `public/donnees.json` anonymisé.
 *
 * Lit `SOURCES_JSON` (secret Actions). Chaque source a un `kind` et un `token` ;
 * les échecs d'une source n'empêchent pas la publication des autres.
 *
 * Usage local :
 *   SOURCES_JSON='{"sources":[…]}' node scripts/releve.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertAnonyme, fusionner } from './fusion.mjs';
import { collecterGithub } from './adapters/github.mjs';
import { collecterGitlab } from './adapters/gitlab.mjs';
import { collecterAzureDevops } from './adapters/azuredevops.mjs';
import { collecterBitbucket } from './adapters/bitbucket.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sortie = join(root, 'public', 'donnees.json');

const COLLECTEURS = {
  github: collecterGithub,
  gitlab: collecterGitlab,
  azuredevops: collecterAzureDevops,
  bitbucket: collecterBitbucket,
};

function lireSources() {
  const brut = (process.env.SOURCES_JSON ?? '').trim() || '{"sources":[]}';
  let parsed;
  try {
    parsed = JSON.parse(brut);
  } catch {
    throw new Error('SOURCES_JSON n’est pas du JSON valide');
  }
  const sources = Array.isArray(parsed?.sources) ? parsed.sources : [];
  return sources;
}

async function uneSource(source, annee) {
  const kind = source?.kind;
  const collecter = COLLECTEURS[kind];
  if (!collecter) {
    return { depots: 0, jours: [], erreur: `kind inconnu` };
  }
  if (!source.token) {
    return { depots: 0, jours: [], erreur: 'token manquant' };
  }
  try {
    return await collecter({ ...source, annee });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Log Actions seulement — jamais dans le JSON public.
    console.error(`[releve] source en échec (${kind}): ${message}`);
    return { depots: 0, jours: [], erreur: message };
  }
}

async function main() {
  const annee = Number(process.env.ANNEE) || new Date().getUTCFullYear();
  const sources = lireSources();
  console.log(`[releve] ${sources.length} source(s), année ${annee}`);

  const resultats = [];
  for (const source of sources) {
    resultats.push(await uneSource(source, annee));
  }

  const donnees = assertAnonyme(
    fusionner(resultats, { annee, genere: new Date().toISOString() })
  );

  mkdirSync(dirname(sortie), { recursive: true });
  writeFileSync(sortie, `${JSON.stringify(donnees, null, 2)}\n`, 'utf8');
  console.log(
    `[releve] écrit ${sortie} — ${donnees.contributions} contributions, ${donnees.depots} dépôts${donnees.partiel ? ' (partiel)' : ''}`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
