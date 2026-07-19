// Autenticação do backoffice: uma palavra-passe única definida na
// variável de ambiente ADMIN_PASSWORD. A sessão é um cookie HMAC
// derivado da palavra-passe — sem base de dados, sem estado no servidor.

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';

const NOME_COOKIE = 'ama_sessao';

function senhaConfigurada(): string {
  return process.env.ADMIN_PASSWORD ?? '';
}

// Valor esperado do cookie de sessão para a palavra-passe atual
function tokenSessao(): string {
  return createHmac('sha256', senhaConfigurada()).update('ama-backoffice').digest('hex');
}

// Comparação em tempo constante para evitar fugas por timing
function iguais(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function backofficeAtivo(): boolean {
  return senhaConfigurada().length > 0;
}

export function senhaCorreta(tentativa: string): boolean {
  return backofficeAtivo() && iguais(tentativa, senhaConfigurada());
}

export function sessaoValida(cookies: AstroCookies): boolean {
  if (!backofficeAtivo()) return false;
  const cookie = cookies.get(NOME_COOKIE)?.value ?? '';
  return cookie.length > 0 && iguais(cookie, tokenSessao());
}

// Inicia sessão durante 7 dias; cookie seguro quando o pedido chega por HTTPS
export function iniciarSessao(cookies: AstroCookies, pedidoSeguro: boolean) {
  cookies.set(NOME_COOKIE, tokenSessao(), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: pedidoSeguro,
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function terminarSessao(cookies: AstroCookies) {
  cookies.delete(NOME_COOKIE, { path: '/' });
}

// O pedido chegou por HTTPS, direto ou através do proxy do Coolify
export function pedidoSeguro(url: URL, request: Request): boolean {
  return url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
}
