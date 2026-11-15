/**
 * Adapter GitHub.com / GitHub Enterprise : calendrier officiel via GraphQL
 * `contributionsCollection`, plus le nombre de dépôts où le(s) user(s) ont
 * intervenu pendant l’année.
 *
 * Sans `users` / `user` : compte du jeton (`viewer`).
 * Avec filtre : un ou plusieurs `user(login:)` fusionnés.
 */

import { normaliserUsers } from '../users.mjs';

const FRAGMENT_COLLECTION = `
  contributionsCollection(from: $from, to: $to) {
    contributionCalendar {
      totalContributions
      weeks {
        contributionDays {
          date
          contributionCount
        }
      }
    }
    commitContributionsByRepository(maxRepositories: 100) {
      repository { databaseId }
    }
    issueContributionsByRepository(maxRepositories: 100) {
      repository { databaseId }
    }
    pullRequestContributionsByRepository(maxRepositories: 100) {
      repository { databaseId }
    }
    pullRequestReviewContributionsByRepository(maxRepositories: 100) {
      repository { databaseId }
    }
    repositoryContributions(first: 100) {
      nodes {
        repository { databaseId }
      }
    }
  }
`;

const QUERY_VIEWER = `
query Contrib($from: DateTime!, $to: DateTime!) {
  viewer {
    ${FRAGMENT_COLLECTION}
  }
}
`;

const QUERY_USER = `
query ContribUser($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    ${FRAGMENT_COLLECTION}
  }
}
`;

/**
 * @param {{ token: string, baseUrl?: string, annee: number, users?: string[], user?: string, login?: string }} source
 * @returns {Promise<{ depots: number, jours: { date: string, count: number }[] }>}
 */
/** Endpoint GraphQL : GitHub.com ou GHE (hostname exact, pas un includes). */
function graphqlEndpoint(baseUrl) {
  if (!baseUrl) return 'https://api.github.com/graphql';
  const u = new URL(baseUrl);
  if (u.hostname === 'api.github.com' || u.hostname === 'github.com') {
    return 'https://api.github.com/graphql';
  }
  let path = u.pathname.replace(/\/+$/, '');
  if (path.endsWith('/api/v3')) path = path.slice(0, -'/api/v3'.length);
  return `${u.origin}${path}/api/graphql`;
}

/** @param {unknown} coll */
function idsDepuisByRepo(coll) {
  /** @type {number[]} */
  const ids = [];
  if (!Array.isArray(coll)) return ids;
  for (const row of coll) {
    const id = row?.repository?.databaseId;
    if (typeof id === 'number') ids.push(id);
  }
  return ids;
}

/**
 * @param {object|null|undefined} collection
 * @returns {{ jours: { date: string, count: number }[], repoIds: number[] }}
 */
function extraire(collection) {
  const weeks = collection?.contributionCalendar?.weeks ?? [];
  /** @type {{ date: string, count: number }[]} */
  const jours = [];
  for (const week of weeks) {
    for (const day of week.contributionDays ?? []) {
      if (!day.date) continue;
      jours.push({ date: day.date, count: day.contributionCount ?? 0 });
    }
  }
  const repoIds = [
    ...idsDepuisByRepo(collection?.commitContributionsByRepository),
    ...idsDepuisByRepo(collection?.issueContributionsByRepository),
    ...idsDepuisByRepo(collection?.pullRequestContributionsByRepository),
    ...idsDepuisByRepo(collection?.pullRequestReviewContributionsByRepository),
    ...idsDepuisByRepo(collection?.repositoryContributions?.nodes),
  ];
  return { jours, repoIds };
}

/**
 * @param {string} graphql
 * @param {string} token
 * @param {string} query
 * @param {Record<string, unknown>} variables
 */
async function graphql(graphqlUrl, token, query, variables) {
  const res = await fetch(graphqlUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'mister-contrib-releve',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`github HTTP ${res.status}`);
  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(`github GraphQL: ${body.errors[0].message}`);
  }
  return body.data;
}

export async function collecterGithub(source) {
  const endpoint = graphqlEndpoint(source.baseUrl);
  const from = `${source.annee}-01-01T00:00:00Z`;
  const to = `${source.annee}-12-31T23:59:59Z`;
  const users = normaliserUsers(source);

  /** @type {Map<string, number>} */
  const byDate = new Map();
  const uniques = new Set();

  /** @param {{ jours: { date: string, count: number }[], repoIds: number[] }} bloc */
  const accumuler = bloc => {
    for (const j of bloc.jours) {
      byDate.set(j.date, (byDate.get(j.date) ?? 0) + j.count);
    }
    for (const id of bloc.repoIds) uniques.add(id);
  };

  if (users.length === 0) {
    const data = await graphql(endpoint, source.token, QUERY_VIEWER, {
      from,
      to,
    });
    accumuler(extraire(data?.viewer?.contributionsCollection));
  } else {
    for (const login of users) {
      const data = await graphql(endpoint, source.token, QUERY_USER, {
        login,
        from,
        to,
      });
      if (!data?.user) {
        throw new Error(`github: utilisateur introuvable « ${login} »`);
      }
      accumuler(extraire(data.user.contributionsCollection));
    }
  }

  const jours = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return { depots: uniques.size, jours };
}
