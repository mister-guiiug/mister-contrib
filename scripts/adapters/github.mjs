/**
 * Adapter GitHub.com / GitHub Enterprise : calendrier officiel via GraphQL
 * `contributionsCollection`, plus le nombre de dépôts du viewer.
 */

const QUERY = `
query Contrib($from: DateTime!, $to: DateTime!) {
  viewer {
    repositories(
      affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
      first: 1
    ) {
      totalCount
    }
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
    }
  }
}
`;

/**
 * @param {{ token: string, baseUrl?: string, annee: number }} source
 * @returns {Promise<{ depots: number, jours: { date: string, count: number }[] }>}
 */
export async function collecterGithub(source) {
  const origin = (source.baseUrl ?? 'https://api.github.com').replace(/\/$/, '');
  const graphql =
    origin.includes('api.github.com') || origin.endsWith('/api/v3')
      ? origin.includes('api.github.com')
        ? 'https://api.github.com/graphql'
        : origin.replace(/\/api\/v3$/, '') + '/api/graphql'
      : `${origin}/api/graphql`;

  const from = `${source.annee}-01-01T00:00:00Z`;
  const to = `${source.annee}-12-31T23:59:59Z`;

  const res = await fetch(graphql, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${source.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'mister-contrib-releve',
    },
    body: JSON.stringify({ query: QUERY, variables: { from, to } }),
  });

  if (!res.ok) {
    throw new Error(`github HTTP ${res.status}`);
  }

  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(`github GraphQL: ${body.errors[0].message}`);
  }

  const viewer = body.data?.viewer;
  const weeks = viewer?.contributionsCollection?.contributionCalendar?.weeks ?? [];
  const jours = [];
  for (const week of weeks) {
    for (const day of week.contributionDays ?? []) {
      if (!day.date) continue;
      jours.push({ date: day.date, count: day.contributionCount ?? 0 });
    }
  }

  return {
    depots: viewer?.repositories?.totalCount ?? 0,
    jours,
  };
}
