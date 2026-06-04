import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { StoreToast, useStoreToast } from '../components/StoreToast';
import { confirmStorePasswordReset } from '../services/api';
import { useStoreAuth } from '../state/StoreAuthContext';

export function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useStoreAuth();
  const { toast, showToast, clearToast } = useStoreToast();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('');

  function showFeedback(message, type = 'error') {
    setFeedback(message);
    setFeedbackType(type);
    showToast(message, type);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    if (form.password.length < 8) {
      showFeedback('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      showFeedback('As senhas informadas não conferem.');
      return;
    }

    setBusy(true);
    setFeedback('');
    setFeedbackType('');

    try {
      const authData = await confirmStorePasswordReset({
        token,
        password: form.password,
      });
      login(authData);
      showFeedback(authData.message || 'Senha redefinida com sucesso.', 'success');
      setTimeout(() => navigate('/minha-conta', { replace: true }), 1000);
    } catch (requestError) {
      showFeedback(requestError.message || 'Não foi possível redefinir sua senha.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <StoreToast toast={toast} onClose={clearToast} />
      <section className="account-section">
        <div className="auth-container">
          <div className="auth-topbar">
            <Link to="/entrar" className="auth-back-button">
              <span aria-hidden="true">&lt;</span>
              <span>Voltar para login</span>
            </Link>
          </div>

          <div className="auth-header">
            <h1>Crie uma nova senha</h1>
            <p>Use uma senha com pelo menos 8 caracteres para proteger sua conta.</p>
          </div>

          <div className="auth-reset-layout">
            <div className="auth-form-wrapper">
              <div className="form-header">
                <span className="auth-flow-kicker">Redefinição de senha</span>
                <h2>Nova senha</h2>
                <p>Depois de confirmar, sua conta já será acessada automaticamente.</p>
              </div>

              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="new-password">Nova senha</label>
                  <input
                    id="new-password"
                    className="text-input"
                    type="password"
                    placeholder="Mínimo de 8 caracteres"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
                    }
                    minLength={8}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-password">Confirmar senha</label>
                  <input
                    id="confirm-password"
                    className="text-input"
                    type="password"
                    placeholder="Repita a nova senha"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    minLength={8}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="button-primary button-large button-login-submit"
                  disabled={busy}
                >
                  <LockResetIcon />
                  <span>{busy ? 'Salvando...' : 'Redefinir senha'}</span>
                </button>
              </form>

              {feedback ? (
                <div className={`auth-feedback feedback-${feedbackType}`} aria-live="polite">
                  <span>{feedback}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LockResetIcon() {
  return (
    <svg
      className="auth-inline-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.8-1.2" />
      <path d="M16 5h3V2" />
      <path d="M19 5a5 5 0 0 0-4-3" />
    </svg>
  );
}
