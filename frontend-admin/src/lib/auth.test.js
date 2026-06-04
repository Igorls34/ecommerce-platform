import { beforeEach, describe, expect, it } from 'vitest';

import { clearAdminToken, getAdminToken, isAuthenticated, setAdminToken } from './auth';

describe('auth helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persiste e remove o token administrativo', () => {
    expect(isAuthenticated()).toBe(false);

    setAdminToken('jwt-test');
    expect(getAdminToken()).toBe('jwt-test');
    expect(isAuthenticated()).toBe(true);

    clearAdminToken();
    expect(getAdminToken()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });
});
