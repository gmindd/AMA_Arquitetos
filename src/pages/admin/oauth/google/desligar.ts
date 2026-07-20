// Desliga a conta de envio: revoga o token na Google e limpa as definições.
import type { APIRoute } from 'astro';
import { obterDefinicoes, guardarDefinicoes } from '../../../../lib/store';
import { revogar } from '../../../../lib/oauth';

export const POST: APIRoute = async ({ redirect }) => {
  const atual = await obterDefinicoes();
  if (atual.envio) {
    await revogar(atual.envio.refreshToken);
  }
  const { envio, ...resto } = atual;
  await guardarDefinicoes(resto);
  return redirect('/admin/definicoes?desligado=1', 303);
};
