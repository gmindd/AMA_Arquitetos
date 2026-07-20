// Início do fluxo OAuth: gera um state anti-CSRF, guarda-o num cookie e
// encaminha o administrador para o ecrã de consentimento da Google.
import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { oauthConfigurado, urlAutorizacao } from '../../../../lib/oauth';
import { pedidoSeguro } from '../../../../lib/auth';

export const GET: APIRoute = ({ url, request, cookies, redirect }) => {
  if (!oauthConfigurado()) {
    return redirect('/admin/definicoes?erro=config', 303);
  }

  const state = randomBytes(16).toString('hex');
  cookies.set('oauth_state', state, {
    path: '/admin/oauth',
    httpOnly: true,
    sameSite: 'lax',
    secure: pedidoSeguro(url, request),
    maxAge: 600,
  });

  return redirect(urlAutorizacao(url.origin, state), 302);
};
