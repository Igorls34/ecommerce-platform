import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('envia login e persiste o token ao autenticar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'jwt-browser-test' }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'admin@eliane.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'admin123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(window.localStorage.getItem('adminToken')).toBe('jwt-browser-test');
  });
});
