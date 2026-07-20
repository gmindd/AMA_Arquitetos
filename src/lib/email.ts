// Envio dos pedidos de orçamento por email, a partir de uma conta dedicada.
// As credenciais SMTP vêm de variáveis de ambiente (Coolify), nunca do
// backoffice — o backoffice só define o email de destino.
//
// Variáveis: SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS,
//            SMTP_FROM (opcional), SMTP_SECURE (opcional, 'true' para 465).

import nodemailer from 'nodemailer';
import type { PedidoOrcamento } from './store';

// O envio só está disponível quando as credenciais essenciais existem
export function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Envia um pedido de orçamento para o email de destino escolhido no backoffice
export async function enviarPedido(pedido: PedidoOrcamento, destino: string): Promise<void> {
  const porta = Number(process.env.SMTP_PORT ?? 587);
  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: porta,
    secure: process.env.SMTP_SECURE === 'true' || porta === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const de = process.env.SMTP_FROM || process.env.SMTP_USER;
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

  // Se o contacto for um email, permite responder diretamente ao cliente
  const responderA = EMAIL_RE.test(pedido.contacto) ? pedido.contacto : undefined;

  await transporte.sendMail({
    from: `AMA (site) <${de}>`,
    to: destino,
    replyTo: responderA,
    subject: `Novo pedido de orçamento (${pedido.tipo})`,
    text: corpo,
  });
}
