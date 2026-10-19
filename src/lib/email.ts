// Envio dos pedidos do formulário por email.
//
// As credenciais de envio são SEMPRE variáveis de ambiente — nunca ficam
// no volume de dados nem são editáveis no backoffice. No backoffice só se
// escolhe para quem seguem os pedidos.
//
// Resend (preferido):
//   RESEND_API_KEY   chave da API (re_...)
//   RESEND_FROM      remetente, ex.: "AMA <obras@andremelissaarquitetos.pt>"
//                    (opcional: sem domínio verificado usa onboarding@resend.dev)
//
// SMTP (alternativa):
//   SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_FROM, SMTP_SECURE

import nodemailer from 'nodemailer';
import type { Definicoes, PedidoOrcamento } from './store';

// Endpoint do Resend (sobreponível em testes via RESEND_API_URL)
const RESEND_URL = process.env.RESEND_API_URL || 'https://api.resend.com/emails';
// Remetente de teste do Resend, usável antes de verificar um domínio próprio
const REMETENTE_PADRAO = 'AMA <onboarding@resend.dev>';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Envio por Resend disponível via variáveis de ambiente?
export function resendConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

// Envio por SMTP disponível via variáveis de ambiente?
export function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Há credenciais de envio no ambiente? (independente dos destinatários)
export function credenciaisConfiguradas(): boolean {
  return resendConfigurado() || smtpConfigurado();
}

// Há tudo o que é preciso para enviar: credenciais e pelo menos um destino.
export function envioDisponivel(definicoes: Definicoes): boolean {
  return credenciaisConfiguradas() && definicoes.emailsDestino.length > 0;
}

// Valida um endereço de email
export function emailValido(valor: string): boolean {
  return EMAIL_RE.test(valor.trim());
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

// Envia um pedido. Os destinos são os emails escolhidos no backoffice.
export async function enviarPedido(pedido: PedidoOrcamento, definicoes: Definicoes): Promise<void> {
  const destinos = definicoes.emailsDestino;
  if (destinos.length === 0) throw new Error('Sem email de destino configurado.');

  const assunto = `Novo pedido do site (${pedido.tipo})`;
  const corpo = corpoDoPedido(pedido);
  const responderA = emailValido(pedido.contacto) ? pedido.contacto.trim() : undefined;

  // --- Resend ---
  if (resendConfigurado()) {
    const remetente = process.env.RESEND_FROM?.trim() || REMETENTE_PADRAO;
    const resposta = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: remetente,
        to: destinos,
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

  // --- SMTP (alternativa) ---
  if (smtpConfigurado()) {
    const porta = Number(process.env.SMTP_PORT ?? 587);
    const de = process.env.SMTP_FROM || process.env.SMTP_USER || '';
    const transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: porta,
      secure: process.env.SMTP_SECURE === 'true' || porta === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporte.sendMail({
      from: `AMA (site) <${de}>`,
      to: destinos.join(', '),
      replyTo: responderA,
      subject: assunto,
      text: corpo,
    });
    return;
  }

  throw new Error('Nenhum método de envio configurado nas variáveis de ambiente.');
}
