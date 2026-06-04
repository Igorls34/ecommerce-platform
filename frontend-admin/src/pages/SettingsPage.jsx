import { useEffect, useState } from 'react';

import { AdminLayout } from '../components/AdminLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { getAdminSettings, updateAdminSettings } from '../services/api';

function FieldRow({ fields, settings, onChange }) {
  const visible = fields.filter((f) => f.key !== 'spacer');
  return (
    <div className="field-row">
      {visible.map((field) => (
        <div key={field.key} className="field">
          <label htmlFor={`setting-${field.key}`}>{field.label}</label>
          {field.options ? (
            <select
              id={`setting-${field.key}`}
              className="input"
              value={settings[field.key] || ''}
              onChange={(event) => onChange(field.key, event.target.value)}
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              id={`setting-${field.key}`}
              className="input"
              type={field.type || 'text'}
              step={field.step}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              value={settings[field.key] || ''}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          )}
          {field.hint ? <div className="field-help">{field.hint}</div> : null}
        </div>
      ))}
    </div>
  );
}

function SettingsSection({ title, subtitle, rows, settings, onChange }) {
  return (
    <section className="panel form-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{subtitle}</p>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="form-layout">
        {rows.map((row, index) => (
          <FieldRow key={index} fields={row} settings={settings} onChange={onChange} />
        ))}
      </div>
    </section>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getAdminSettings();
        if (active) {
          const mapped = {};
          const allKeys = [
            'adminOrderEmail', 'mailFrom', 'mailFromName',
            'storeBaseUrl', 'adminBaseUrl',
            'senderName', 'senderPhone', 'senderEmail', 'senderDocument',
            'senderAddress', 'senderNumber', 'senderComplement',
            'senderDistrict', 'senderCity', 'senderState',
            'storeZipCode', 'storeWeight', 'storeLength', 'storeWidth', 'storeHeight',
            'pixKey', 'pixMerchantName', 'pixMerchantCity',
            'pixProvider', 'cardProvider',
            'companyName', 'companyCnpj', 'stateRegistration', 'taxRegime',
          ];
          for (const key of allKeys) {
            mapped[key] = data[key] || '';
          }
          setSettings(mapped);
        }
      } catch (requestError) {
        if (active) setError(requestError.message || 'Não foi possível carregar as configurações.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  function updateField(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await updateAdminSettings(settings);
      setSuccess('Configurações salvas.');
      window.setTimeout(() => setSuccess(''), 4000);
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível salvar as configurações.');
    } finally {
      setBusy(false);
    }
  }

  const f = (key, label, opts = {}) => ({ key, label, ...opts });

  return (
    <AdminLayout title="Configurações" subtitle="Painel administrativo">
      {error ? <div className="panel feedback feedback-error">{error}</div> : null}
      {success ? <div className="panel feedback feedback-success">{success}</div> : null}

      {loading ? (
        <LoadingSpinner variant="dual-ring" text="Carregando..." />
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <div className="page-summary--split">
            <SettingsSection
              title="Notificações"
              subtitle="Alertas do sistema"
              settings={settings}
              onChange={updateField}
              rows={[
                [f('adminOrderEmail', 'E-mail do lojista', { type: 'email', placeholder: 'admin@thessarasemijoias.com.br', hint: 'Recebe alertas de pedidos pagos e notificações.' })],
              ]}
            />
            <SettingsSection
              title="Email"
              subtitle="Remetente dos e-mails"
              settings={settings}
              onChange={updateField}
              rows={[
                [
                  f('mailFrom', 'E-mail remetente', { type: 'email', placeholder: 'contato@thessarasemijoias.com.br' }),
                  f('mailFromName', 'Nome remetente', { type: 'text', placeholder: 'Thessara' }),
                ],
              ]}
            />
          </div>

          <SettingsSection
            title="URLs"
            subtitle="Links usados nos e-mails e integrações"
            settings={settings}
            onChange={updateField}
            rows={[
              [
                f('storeBaseUrl', 'URL da loja', { type: 'url', placeholder: 'https://thessarasemijoias.com.br' }),
                f('adminBaseUrl', 'URL do admin', { type: 'url', placeholder: 'https://admin.thessarasemijoias.com.br' }),
              ],
            ]}
          />

          <SettingsSection
            title="Remetente (etiquetas de frete)"
            subtitle="Dados do lojista no Melhor Envio"
            settings={settings}
            onChange={updateField}
            rows={[
              [
                f('senderName', 'Nome / Razão social', { placeholder: 'Thessara Semijoias' }),
                f('senderDocument', 'CPF/CNPJ', { placeholder: '000.000.000-00' }),
              ],
              [
                f('senderPhone', 'Telefone', { placeholder: '(11) 99999-9999' }),
                f('senderEmail', 'E-mail', { type: 'email', placeholder: 'contato@thessarasemijoias.com.br' }),
              ],
              [
                f('senderAddress', 'Logradouro', { placeholder: 'Rua Exemplo' }),
                f('senderNumber', 'Número', { placeholder: '123' }),
              ],
              [
                f('senderComplement', 'Complemento', { placeholder: 'Sala 1' }),
                f('senderDistrict', 'Bairro', { placeholder: 'Centro' }),
              ],
              [
                f('senderCity', 'Cidade', { placeholder: 'São Paulo' }),
                f('senderState', 'UF', { placeholder: 'SP', maxLength: 2 }),
              ],
            ]}
          />

          <div className="page-summary--split">
            <SettingsSection
              title="Dimensões do pacote"
              subtitle="Cálculo de frete"
              settings={settings}
              onChange={updateField}
              rows={[
                [
                  f('storeZipCode', 'CEP de origem', { placeholder: '00000-000' }),
                  f('storeWeight', 'Peso (kg)', { type: 'number', placeholder: '0.3', step: '0.01' }),
                ],
                [
                  f('storeLength', 'Comprimento (cm)', { type: 'number', placeholder: '20' }),
                  f('storeWidth', 'Largura (cm)', { type: 'number', placeholder: '15' }),
                ],
                [
                  f('storeHeight', 'Altura (cm)', { type: 'number', placeholder: '5' }),
                  { key: 'spacer', label: '' },
                ],
              ]}
            />
            {(!settings.pixProvider || settings.pixProvider !== 'mercado_pago') ? (
              <SettingsSection
                title="PIX Local"
                subtitle="QR Code manual (fallback)"
                settings={settings}
                onChange={updateField}
                rows={[
                  [
                    f('pixKey', 'Chave PIX', { placeholder: 'email@exemplo.com' }),
                    f('pixMerchantCity', 'Cidade', { placeholder: 'São Paulo' }),
                  ],
                  [
                    f('pixMerchantName', 'Nome do recebedor', { placeholder: 'Thessara Semijoias' }),
                    { key: 'spacer', label: '' },
                  ],
                ]}
              />
            ) : (
              <section className="panel form-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Gerenciado pelo Mercado Pago</p>
                    <h3>PIX via gateway</h3>
          </div>

          <SettingsSection
            title="Dados fiscais da empresa"
            subtitle="Emissão de NF-e e notas fiscais"
            settings={settings}
            onChange={updateField}
            rows={[
              [
                f('companyName', 'Razão social', { placeholder: 'Thessara Semijoias Ltda' }),
                f('companyCnpj', 'CNPJ', { placeholder: '00.000.000/0001-00' }),
              ],
              [
                f('stateRegistration', 'Inscrição Estadual', { placeholder: '00.000.000-0' }),
                f('taxRegime', 'Regime tributário', {
                  options: [
                    { value: '', label: 'Não definido' },
                    { value: 'mei', label: 'MEI' },
                    { value: 'simples', label: 'Simples Nacional' },
                    { value: 'presumido', label: 'Lucro Presumido' },
                    { value: 'real', label: 'Lucro Real' },
                  ],
                }),
              ],
            ]}
          />
                </div>
                <div className="form-layout">
                  <p className="page-summary__text">
                    A chave PIX, QR Code e dados do recebedor são gerenciados diretamente na conta
                    do Mercado Pago. Altere o provedor acima para voltar ao modo manual.
                  </p>
                </div>
              </section>
            )}
          </div>

          <div className="category-editor-actions">
            <button type="submit" className="button button-primary" disabled={busy}>
              {busy ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </AdminLayout>
  );
}
