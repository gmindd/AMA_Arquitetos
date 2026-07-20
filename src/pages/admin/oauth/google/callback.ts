// Regresso da Google: valida o state, troca o código por tokens, lê o email
// da conta e guarda o refresh token nas definições (volume de dados).
import type { APIRoute } from 'astro';
import { trocarCodigo } from '../../../../lib/oauth';
import { obterDefinicoes, guardarDefinicoes } from '../../../../lib/store';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const erro = url.searchParams.get('error');
  if (erro) {
    return redirect('/admin/definicoes?erro=negado', 303);
  }

  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state') ?? '';
  const stateCookie = cookies.get('oauth_state')?.value ?? '';
  cookies.delete('oauth_state', { path: '/admin/oauth' });

  if (!code || !state || state !== stateCookie) {
    return redirect('/admin/definicoes?erro=estado', 303);
  }

  try {
    const { refreshToken, email } = await trocarCodigo(url.origin, code);
    if (!refreshToken || !email) {
      // Sem refresh token normalmente significa autorização repetida sem consentimento
      return redirect('/admin/definicoes?erro=token', 303);
    }
    const atual = await obterDefinicoes();
    await guardarDefinicoes({
      ...atual,
      envio: { provedor: 'google', email, refreshToken, ligadoEm: new Date().toISOString() },
    });
    return redirect('/admin/definicoes?ligado=1', 303);
  } catch (e) {
    console.error('Falha no callback OAuth da Google:', e);
    return redirect('/admin/definicoes?erro=troca', 303);
  }
};
