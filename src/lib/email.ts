// Envio dos pedidos de orçamento por email.
// Método principal: conta Gmail ligada por OAuth no backoffice (nodemailer
// trata da renovação do token de acesso a partir do refresh token guardado).
// Alternativa: SMTP por variáveis de ambiente, se existir.

import nodemailer from 'nodemailer';
import type { Definicoes, PedidoOrcamento } from './store';
import { oauthConfigurado } from './oauth';

// Envio por SMTP disponível via variáveis de ambiente?
export function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Há algum método de envio pronto a usar para estas definições?
export function envioDisponivel(definicoes: Definicoes): boolean {
  return Boolean(definicoes.envio && oauthConfigurado()) || smtpConfigurado();
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Constrói o transporte de acordo com o método disponível
function construirTransporte(definicoes: Definicoes) {
  if (definicoes.envio && oauthConfigurado()) {
    return {
      transporte: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2' as const,
          user: definicoes.envio.email,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: definicoes.envio.refreshToken,
        },
      }),
      de: definicoes.envio.email,
    };
  }

  if (smtpConfigurado()) {
    const porta = Number(process.env.SMTP_PORT ?? 587);
    return {
      transporte: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: porta,
        secure: process.env.SMTP_SECURE === 'true' || porta === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      }),
      de: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    };
  }

  return null;
}

// Envia um pedido de orçamento. O destino é o email escolhido no backoffice;
// se estiver vazio, segue para a própria conta ligada.
export async function enviarPedido(pedido: PedidoOrcamento, definicoes: Definicoes): Promise<void> {
  const config = construirTransporte(definicoes);
  if (!config) throw new Error('Nenhum método de envio configurado.');

  const destino = definicoes.emailDestino || config.de;
  if (!destino) throw new Error('Sem email de destino.');

  const corpo = [
    `Nome: ${pedido.nome}`,
    `Contacto: ${pedido.contacto}`,
    `Tipo: ${pedido.tipo}`,
    `Localização: ${pedido.localizacao}`,
    '',
    pedido.mensagem,
    '',
    `Recebido em ${new Date(pedido.data).toLocaleString('pt-PT')}`,
  ].join('\n');

  const responderA = EMAIL_RE.test(pedido.contacto) ? pedido.contacto : undefined;

  await config.transporte.sendMail({
    from: `AMA (site) <${config.de}>`,
    to: destino,
    replyTo: responderA,
    subject: `Novo pedido de orçamento (${pedido.tipo})`,
    text: corpo,
  });
}
