// Envio dos pedidos de orçamento por email.
// Método principal: Resend (chave API colada no backoffice).
// Alternativa: SMTP por variáveis de ambiente, se existir.

import nodemailer from 'nodemailer';
import type { Definicoes, PedidoOrcamento } from './store';

// Endpoint do Resend (sobreponível em testes via RESEND_API_URL)
const RESEND_URL = process.env.RESEND_API_URL || 'https://api.resend.com/emails';
// Remetente de teste do Resend, usável antes de verificar um domínio próprio
const REMETENTE_PADRAO = 'AMA <onboarding@resend.dev>';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Envio por SMTP disponível via variáveis de ambiente?
export function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Há algum método de envio pronto a usar para estas definições?
export function envioDisponivel(definicoes: Definicoes): boolean {
  return Boolean(definicoes.envio?.apiKey) || smtpConfigurado();
}

// Monta o corpo de texto do email a partir do pedido
function corpoDoPedido(pedido: PedidoOrcamento): string {
  return [
    `Nome: ${pedido.nome}`,
    `Contacto: ${pedido.contacto}`,
    `Tipo: ${pedido.tipo}`,
    `Localização: ${pedido.localizacao}`,
    '',
    pedido.mensagem,
    '',
    `Recebido em ${new Date(pedido.data).toLocaleString('pt-PT')}`,
  ].join('\n');
}

// Envia um pedido de orçamento. O destino é o email escolhido no backoffice.
export async function enviarPedido(pedido: PedidoOrcamento, definicoes: Definicoes): Promise<void> {
  const assunto = `Novo pedido de orçamento (${pedido.tipo})`;
  const corpo = corpoDoPedido(pedido);
  const responderA = EMAIL_RE.test(pedido.contacto) ? pedido.contacto : undefined;

  // --- Resend ---
  if (definicoes.envio?.apiKey) {
    if (!definicoes.emailDestino) throw new Error('Sem email de destino.');
    const remetente = definicoes.envio.remetente?.trim() || REMETENTE_PADRAO;
    const resposta = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${definicoes.envio.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: remetente,
        to: [definicoes.emailDestino],
        reply_to: responderA,
        subject: assunto,
        text: corpo,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => '');
      throw new Error(`Resend ${resposta.status}: ${detalhe}`);
    }
    return;
  }

  // --- SMTP (alternativa por variáveis de ambiente) ---
  if (smtpConfigurado()) {
    const porta = Number(process.env.SMTP_PORT ?? 587);
    const de = process.env.SMTP_FROM || process.env.SMTP_USER || '';
    const destino = definicoes.emailDestino || de;
    if (!destino) throw new Error('Sem email de destino.');
    const transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: porta,
      secure: process.env.SMTP_SECURE === 'true' || porta === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporte.sendMail({
      from: `AMA (site) <${de}>`,
      to: destino,
      replyTo: responderA,
      subject: assunto,
      text: corpo,
    });
    return;
  }

  throw new Error('Nenhum método de envio configurado.');
}
