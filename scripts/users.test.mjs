import { describe, expect, it } from 'vitest';
import { correspondUser, normaliserUsers } from './users.mjs';

describe('normaliserUsers', () => {
  it('accepte users[] et déduplique sans casse', () => {
    expect(normaliserUsers({ users: ['Alice', 'bob', 'alice', ''] })).toEqual([
      'Alice',
      'bob',
    ]);
  });

  it('accepte user / login seul', () => {
    expect(normaliserUsers({ user: 'Alice' })).toEqual(['Alice']);
    expect(normaliserUsers({ login: 'Bob' })).toEqual(['Bob']);
  });

  it('liste vide sans filtre', () => {
    expect(normaliserUsers({})).toEqual([]);
    expect(normaliserUsers({ users: [] })).toEqual([]);
  });
});

describe('correspondUser', () => {
  it('laisse tout passer sans filtre', () => {
    expect(correspondUser('x', [])).toBe(true);
  });

  it('compare login et e-mail', () => {
    expect(correspondUser('Alice', ['alice'])).toBe(true);
    expect(correspondUser('alice@ex.com', ['alice'])).toBe(true);
    expect(correspondUser('bob', ['alice'])).toBe(false);
  });
});
