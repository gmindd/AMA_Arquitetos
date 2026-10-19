// Recebe os pedidos do formulário do site conceito.
// Com JS responde em JSON; sem JS redireciona de volta ao contacto.
// Envia por email (Resend/SMTP, ver lib/email.ts) e, se não for
// possível, guarda o pedido em DATA_DIR/mensagens para não se perder.
import type { APIRoute } from 'astro';
import { obterDefinicoes, guardarMensagem, type PedidoOrcamento } from '../../lib/store';
import { envioDisponivel, enviarPedido } from '../../lib/email';

const PROGRAMAS = ['Casa nova', 'Reabilitação', 'Interiores', 'Reconversão'];
const LIMITE = { nome: 120, contacto: 160, localizacao: 160, mensagem: 4000 };

export const POST: APIRoute = async ({ request, redirect }) => {
  const querJson = (request.headers.get('accept') ?? '').includes('application/json');
  const responder = (ok: boolean, erro?: string, estado = ok ? 200 : 400) =>
    querJson
      ? new Response(JSON.stringify({ ok, erro }), { status: estado, headers: { 'Content-Type': 'application/json' } })
      : redirect(ok ? '/?enviado=1#contacto' : '/#contacto', 303);

  let dados: FormData;
  try {
    dados = await request.formData();
  } catch {
    return responder(false, 'Pedido inválido.');
  }

  // Honeypot: um bot preenche o campo escondido; fingimos sucesso
  if (String(dados.get('empresa') ?? '').trim() !== '') return responder(true);

  const campo = (k: keyof typeof LIMITE) => String(dados.get(k) ?? '').trim().slice(0, LIMITE[k]);
  const tipo = String(dados.get('tipo') ?? '');
  const pedido: PedidoOrcamento = {
    nome: campo('nome'),
    contacto: campo('contacto'),
    tipo: PROGRAMAS.includes(tipo) ? tipo : PROGRAMAS[0],
    localizacao: campo('localizacao'),
    mensagem: campo('mensagem'),
    data: new Date().toISOString(),
  };

  if (!pedido.nome || !pedido.contacto || !pedido.localizacao || !pedido.mensagem) {
    return responder(false, 'Faltam campos por preencher.');
  }

  const definicoes = await obterDefinicoes();
  if (envioDisponivel(definicoes)) {
    try {
      await enviarPedido(pedido, definicoes);
      return responder(true);
    } catch (e) {
      console.error('Falha no envio do pedido por email:', e);
    }
  }
  try {
    await guardarMensagem(pedido);
    return responder(true);
  } catch (e) {
    console.error('Falha ao guardar o pedido em disco:', e);
    return responder(false, 'Não foi possível registar o pedido.', 500);
  }
};
