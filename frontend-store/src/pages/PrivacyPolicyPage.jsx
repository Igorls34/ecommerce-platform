import { Link } from 'react-router-dom';

export function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacidade"
      title="Política de Privacidade"
      intro="Esta política explica como a Thessara coleta, usa, armazena e compartilha dados pessoais durante a navegação, cadastro, atendimento e compra no e-commerce."
    >
      <LegalSection title="1. Dados que podemos coletar">
        <p>
          Podemos coletar nome, e-mail, telefone, CPF, endereço de entrega, dados de acesso, itens
          adicionados ao carrinho, histórico de pedidos e mensagens enviadas pelos canais de
          atendimento.
        </p>
        <p>
          Dados sensíveis de cartão não são armazenados pela loja. Quando o pagamento por cartão
          estiver habilitado, a captura e o processamento acontecem em ambiente seguro do gateway de
          pagamento.
        </p>
      </LegalSection>

      <LegalSection title="2. Como usamos os dados">
        <p>
          Os dados são usados para criar e acompanhar pedidos, calcular entrega, processar
          pagamento, emitir comunicações operacionais, responder dúvidas, prevenir fraude e cumprir
          obrigações legais.
        </p>
        <p>
          Mensagens promocionais por e-mail ou WhatsApp devem depender de consentimento específico
          do cliente e podem ser canceladas a qualquer momento.
        </p>
      </LegalSection>

      <LegalSection title="3. Cookies e tecnologias similares">
        <p>
          Cookies essenciais mantêm funções básicas como carrinho, sessão, segurança e preferências
          de privacidade. Sem eles, partes do site podem não funcionar corretamente.
        </p>
        <p>
          Cookies de análise, publicidade ou remarketing só devem ser ativados quando ferramentas
          como analytics, pixels ou campanhas forem configuradas, respeitando as escolhas do
          usuário.
        </p>
      </LegalSection>

      <LegalSection title="4. Compartilhamento com terceiros">
        <p>
          Dados podem ser compartilhados com fornecedores necessários para operar a compra, como
          gateway de pagamento, serviços de e-mail transacional, hospedagem, ferramentas antifraude
          e parceiros de entrega.
        </p>
      </LegalSection>

      <LegalSection title="5. Armazenamento e segurança">
        <p>
          Mantemos controles técnicos e organizacionais para proteger dados pessoais. Informações
          como CPF devem ser armazenadas de forma protegida no banco de dados e acessadas apenas
          quando necessário para operação, auditoria ou obrigação legal.
        </p>
      </LegalSection>

      <LegalSection title="6. Direitos do titular">
        <p>
          O cliente pode solicitar confirmação de tratamento, acesso, correção, exclusão,
          portabilidade, revogação de consentimento e informações sobre compartilhamento, conforme a
          LGPD.
        </p>
        <p>
          Para exercer esses direitos, entre em contato pelo e-mail{' '}
          <a href="mailto:thessarasemijoias@gmail.com">thessarasemijoias@gmail.com</a>.
        </p>
      </LegalSection>

      <LegalSection title="7. Atualizações desta política">
        <p>
          Esta política pode ser atualizada para refletir mudanças no site, em fornecedores ou em
          exigências legais. A versão publicada nesta página é a referência vigente.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}

export function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Compra"
      title="Termos de Compra"
      intro="Estes termos organizam as principais regras para navegação, pedido, pagamento, entrega, troca e devolução no e-commerce da Thessara."
    >
      <LegalSection title="1. Produtos e disponibilidade">
        <p>
          As imagens, descrições, medidas e valores dos produtos buscam representar as peças com
          fidelidade. Pequenas variações de cor, brilho ou proporção podem ocorrer conforme tela,
          iluminação e lote da peça.
        </p>
        <p>
          A disponibilidade pode mudar até a confirmação do pagamento. Caso uma peça fique
          indisponível, a equipe entrará em contato para oferecer alternativa, prazo ou
          cancelamento.
        </p>
      </LegalSection>

      <LegalSection title="2. Pedido e cadastro">
        <p>
          Para finalizar a compra, o cliente deve informar dados corretos de identificação, contato
          e entrega. Informações incorretas podem atrasar atendimento, pagamento ou envio.
        </p>
      </LegalSection>

      <LegalSection title="3. Pagamento">
        <p>
          O site pode oferecer pagamento por Pix, cartão e outros meios conforme configuração
          vigente. Pagamentos por cartão são processados pelo gateway contratado, sem armazenamento
          dos dados completos do cartão pela loja.
        </p>
        <p>
          O pedido só segue para separação após confirmação do pagamento ou validação operacional
          pela equipe.
        </p>
      </LegalSection>

      <LegalSection title="4. Entrega">
        <p>
          Prazos e valores de entrega podem variar conforme endereço, modalidade escolhida e
          disponibilidade logística. O prazo informado pode iniciar após a confirmação do pagamento.
        </p>
      </LegalSection>

      <LegalSection title="5. Trocas, devoluções e arrependimento">
        <p>
          Em compras online, o cliente pode solicitar arrependimento em até 7 dias corridos após o
          recebimento, conforme o Código de Defesa do Consumidor. A peça deve retornar sem sinais de
          uso, com embalagem, acessórios e comprovantes aplicáveis.
        </p>
        <p>
          Trocas por defeito, tamanho, modelo ou preferência devem ser solicitadas pelo atendimento
          para avaliação de disponibilidade, condições da peça e regras logísticas.
        </p>
      </LegalSection>

      <LegalSection title="6. Atendimento">
        <p>
          Dúvidas sobre medidas, composição, disponibilidade, pagamento ou entrega podem ser
          enviadas para <a href="mailto:thessarasemijoias@gmail.com">thessarasemijoias@gmail.com</a>.
        </p>
      </LegalSection>

      <LegalSection title="7. Uso do site">
        <p>
          O usuário se compromete a usar o site de forma lícita, sem tentar acessar áreas restritas,
          interferir na segurança, copiar conteúdo indevidamente ou realizar pedidos fraudulentos.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}

function LegalPageShell({ eyebrow, title, intro, children }) {
  return (
    <div className="page-stack">
      <section className="legal-hero">
        <p className="section-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
        <div className="legal-hero-actions">
          <Link to="/produtos" className="button-primary">
            Ver produtos
          </Link>
          <Link to="/sobre" className="button-secondary">
            Falar com atendimento
          </Link>
        </div>
      </section>

      <section className="legal-content">{children}</section>
    </div>
  );
}

function LegalSection({ title, children }) {
  return (
    <article className="legal-section">
      <h2>{title}</h2>
      {children}
    </article>
  );
}
