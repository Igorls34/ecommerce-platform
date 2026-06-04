import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { LoadingSpinner } from '../components/LoadingSpinner';
import { StoreToast, useStoreToast } from '../components/StoreToast';
import { brandAssets } from '../lib/brandAssets';
import { loginStoreCustomer, registerStoreCustomer, requestStorePasswordReset } from '../services/api';
import { useStoreAuth } from '../state/StoreAuthContext';

function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : '';
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function AccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useStoreAuth();
  const redirectTo = location.state?.from || '/produtos';
  const isCheckoutFlow = redirectTo === '/checkout';
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(location.state?.message || '');
  const [feedbackType, setFeedbackType] = useState(location.state?.message ? 'error' : '');
  const { toast, showToast, clearToast } = useStoreToast();
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [resetRequestForm, setResetRequestForm] = useState({ email: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    marketingOptIn: true,
  });

  function showAuthFeedback(message, type = 'error') {
    setFeedbackType(type);
    setFeedback(message);
    showToast(message, type);
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setFeedback('');
    setFeedbackType('');

    try {
      const authData = await loginStoreCustomer(loginForm);
      login(authData);
      showAuthFeedback('Bem-vinda de volta. Redirecionando...', 'success');
      setTimeout(() => navigate(redirectTo), 1000);
    } catch (requestError) {
      showAuthFeedback(requestError.message || 'Não foi possível entrar.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setFeedback('');
    setFeedbackType('');

    try {
      const authData = await registerStoreCustomer(registerForm);
      login(authData);
      showAuthFeedback('Conta criada com sucesso. Redirecionando...', 'success');
      setTimeout(() => navigate(redirectTo), 1000);
    } catch (requestError) {
      if (requestError.message?.includes('ja esta registrado')) {
        setLoginForm((current) => ({ ...current, email: registerForm.email }));
        setAuthMode('login');
        showAuthFeedback(
          'Este e-mail já tem conta. Entre com sua senha para puxar seus dados salvos.',
          'error',
        );
      } else {
        showAuthFeedback(requestError.message || 'Não foi possível criar sua conta.', 'error');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResetRequestSubmit(event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setFeedback('');
    setFeedbackType('');

    try {
      const response = await requestStorePasswordReset(resetRequestForm);
      showAuthFeedback(
        response.message ||
          'Se existir uma conta com este e-mail, enviaremos um link para redefinir a senha.',
        'success',
      );
    } catch (requestError) {
      showAuthFeedback(requestError.message || 'Não foi possível solicitar a redefinição.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function syncSharedField(field, value) {
    if (field === 'email') {
      setLoginForm((current) => ({ ...current, email: value }));
      setRegisterForm((current) => ({ ...current, email: value }));
      setResetRequestForm((current) => ({ ...current, email: value }));
    }

    if (field === 'name') {
      setRegisterForm((current) => ({ ...current, name: value }));
    }

    if (field === 'phone') {
      setRegisterForm((current) => ({ ...current, phone: value }));
    }

    if (field === 'marketingOptIn') {
      setRegisterForm((current) => ({ ...current, marketingOptIn: value }));
    }
  }

  function updateLoginForm(field, value) {
    if (field === 'email') {
      syncSharedField(field, value);
      return;
    }

    setLoginForm((current) => ({ ...current, [field]: value }));
  }

  function updateRegisterForm(field, value) {
    const nextValue = field === 'phone' ? formatPhone(value) : value;

    if (['email', 'name', 'phone', 'marketingOptIn'].includes(field)) {
      syncSharedField(field, nextValue);
      return;
    }

    setRegisterForm((current) => ({ ...current, [field]: nextValue }));
  }

  function switchMode(mode) {
    setAuthMode(mode);
    setFeedback('');
    setFeedbackType('');

    if (mode === 'forgot') {
      setResetRequestForm((current) => ({
        ...current,
        email: current.email || loginForm.email || registerForm.email,
      }));
    }
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/produtos');
  }

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo || '/minha-conta', { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, 'error');
    }
  }, [location.state?.message, showToast]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="page-stack">
      <StoreToast toast={toast} onClose={clearToast} />
      <section className="account-section">
        <div className="auth-container">
          <div className="auth-topbar">
            <button
              type="button"
              className="auth-back-button"
              onClick={handleBack}
              aria-label="Voltar para a pagina anterior"
            >
              <span aria-hidden="true">&lt;</span>
              <span>Voltar</span>
            </button>
          </div>

          <div className="auth-header">
            <img
              src={brandAssets.logoHorizontalBlue}
              alt="Thessara"
              className="auth-brand-logo"
              decoding="async"
            />
            <h1>{isCheckoutFlow ? 'Finalize sua compra' : 'Acesse sua conta'}</h1>
            <p>
              {isCheckoutFlow
                ? 'Entre na sua conta ou crie um cadastro para finalizar o pagamento com segurança.'
                : 'Entre com sua conta existente ou crie um cadastro para salvar seus dados.'}
            </p>
          </div>

          <div className="auth-content">
            <div className="auth-sidebar">
              <div className="auth-brand-card">
                <img src={brandAssets.symbolBlue} alt="" aria-hidden="true" decoding="async" />
                <strong>Seu espaço Thessara</strong>
                <span>Pedidos, entregas e dados salvos em um único lugar.</span>
              </div>

              <div className="auth-tabs-vertical auth-tabs-compact">
                <button
                  type="button"
                  className={`auth-tab-vertical ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => switchMode('login')}
                >
                  <span className="tab-icon" aria-hidden="true">
                    <LoginIcon />
                  </span>
                  <span className="tab-label">
                    <strong>Entrar</strong>
                    <span className="tab-hint">Com sua conta</span>
                  </span>
                </button>

                <button
                  type="button"
                  className={`auth-tab-vertical ${authMode === 'register' ? 'active' : ''}`}
                  onClick={() => switchMode('register')}
                >
                  <span className="tab-icon" aria-hidden="true">
                    <PersonAddIcon />
                  </span>
                  <span className="tab-label">
                    <strong>Criar conta</strong>
                    <span className="tab-hint">Mais praticidade nas proximas compras</span>
                  </span>
                </button>
              </div>
            </div>

            <div className="auth-form-container">
              {authMode === 'login' ? (
                <div className="auth-form-wrapper">
                  <div className="form-header">
                    <span className="auth-flow-kicker">Conta existente</span>
                    <h2>Bem-vinda de volta</h2>
                    <p>
                      Entre para carregar nome, e-mail, telefone e historico da sua conta antes de
                      continuar.
                    </p>
                  </div>

                  <form className="auth-form" onSubmit={handleLoginSubmit}>
                    <div className="form-group">
                      <label htmlFor="login-email">E-mail</label>
                      <input
                        id="login-email"
                        className="text-input"
                        placeholder="seu@email.com"
                        type="email"
                        value={loginForm.email}
                        onChange={(event) =>
                          updateLoginForm('email', event.target.value.toLowerCase())
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <div className="auth-label-row">
                        <label htmlFor="login-password">Senha</label>
                        <button
                          type="button"
                          className="link-button auth-inline-action"
                          onClick={() => switchMode('forgot')}
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                      <input
                        id="login-password"
                        className="text-input"
                        placeholder="Sua senha"
                        type="password"
                        value={loginForm.password}
                        onChange={(event) => updateLoginForm('password', event.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="button-primary button-large button-login-submit"
                      disabled={busy}
                    >
                      <LoginIcon />
                      <span>{busy ? 'Entrando...' : 'Entrar'}</span>
                    </button>
                  </form>

                  <div className="form-footer">
                    <p>
                      Ainda não tem conta? Os dados que você digitou aqui acompanham o cadastro.{' '}
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => switchMode('register')}
                      >
                        Criar conta
                      </button>
                    </p>
                  </div>
                </div>
              ) : null}

              {authMode === 'forgot' ? (
                <div className="auth-form-wrapper">
                  <div className="form-header">
                    <span className="auth-flow-kicker">Recuperação de acesso</span>
                    <h2>Redefina sua senha</h2>
                    <p>
                      Informe o e-mail da conta. Se ele estiver cadastrado, enviaremos um link para
                      criar uma nova senha.
                    </p>
                  </div>

                  <form className="auth-form" onSubmit={handleResetRequestSubmit}>
                    <div className="form-group">
                      <label htmlFor="reset-email">E-mail</label>
                      <input
                        id="reset-email"
                        className="text-input"
                        placeholder="seu@email.com"
                        type="email"
                        value={resetRequestForm.email}
                        onChange={(event) =>
                          setResetRequestForm({ email: event.target.value.toLowerCase() })
                        }
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="button-primary button-large button-login-submit"
                      disabled={busy}
                    >
                      <MailIcon />
                      <span>{busy ? 'Enviando...' : 'Enviar link de redefinição'}</span>
                    </button>
                  </form>

                  <div className="form-footer">
                    <p>
                      Lembrou a senha?{' '}
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => switchMode('login')}
                      >
                        Voltar para o login
                      </button>
                    </p>
                  </div>
                </div>
              ) : null}

              {authMode === 'register' ? (
                <div className="auth-form-wrapper">
                  <div className="form-header">
                    <span className="auth-flow-kicker">Novo cadastro</span>
                    <h2>Crie sua conta</h2>
                    <p>
                      Complete os dados uma vez. Depois, o login puxa essas informacoes nas proximas
                      compras.
                    </p>
                  </div>

                  <form className="auth-form" onSubmit={handleRegisterSubmit}>
                    <div className="form-group">
                      <label htmlFor="register-name">Nome completo</label>
                      <input
                        id="register-name"
                        className="text-input"
                        placeholder="Seu nome"
                        value={registerForm.name}
                        onChange={(event) => updateRegisterForm('name', event.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="register-email">E-mail</label>
                      <input
                        id="register-email"
                        className="text-input"
                        placeholder="seu@email.com"
                        type="email"
                        value={registerForm.email}
                        onChange={(event) =>
                          updateRegisterForm('email', event.target.value.toLowerCase())
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="register-password">Senha</label>
                      <input
                        id="register-password"
                        className="text-input"
                        placeholder="Crie uma senha forte"
                        type="password"
                        value={registerForm.password}
                        onChange={(event) => updateRegisterForm('password', event.target.value)}
                        minLength={8}
                        required
                      />
                      <small className="form-hint">Mínimo de 8 caracteres.</small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="register-phone">Telefone ou WhatsApp</label>
                      <input
                        id="register-phone"
                        className="text-input"
                        placeholder="(11) 99999-9999"
                        value={registerForm.phone}
                        onChange={(event) => updateRegisterForm('phone', event.target.value)}
                      />
                    </div>

                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={registerForm.marketingOptIn}
                        onChange={(event) =>
                          updateRegisterForm('marketingOptIn', event.target.checked)
                        }
                      />
                      <span>
                        Quero receber novidades e avisos de atendimento por e-mail ou WhatsApp.
                      </span>
                    </label>

                    <button
                      type="submit"
                      className="button-primary button-large button-login-submit"
                      disabled={busy}
                    >
                      <PersonAddIcon />
                      <span>{busy ? 'Criando conta...' : 'Criar conta'}</span>
                    </button>
                  </form>

                  <div className="form-footer">
                    <p>
                      Já
tem conta? Use o login para carregar seu cadastro salvo.{' '}
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => switchMode('login')}
                      >
                        Fazer login
                      </button>
                    </p>
                  </div>
                </div>
              ) : null}

              {feedback ? (
                <div className={`auth-feedback feedback-${feedbackType}`} aria-live="polite">
                  <span>{feedback}</span>
                </div>
              ) : null}

              {busy ? <LoadingSpinner variant="dots" text="Processando..." /> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LoginIcon() {
  return (
    <svg
      className="auth-inline-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      className="auth-inline-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PersonAddIcon() {
  return (
    <svg
      className="auth-inline-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M15 20a6 6 0 0 0-12 0" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </svg>
  );
}
