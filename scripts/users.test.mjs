import { describe, expect, it } from 'vitest';
import { correspondUser } from './users.mjs';

describe('correspondUser', () => {
  it('refuse sans cibles', () => {
    expect(correspondUser('x', [])).toBe(false);
  });

  it('compare login et e-mail', () => {
    expect(correspondUser('Alice', ['alice'])).toBe(true);
    expect(correspondUser('alice@ex.com', ['alice'])).toBe(true);
    expect(correspondUser('bob', ['alice'])).toBe(false);
  });
});
