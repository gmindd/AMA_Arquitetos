// Termina a sessão do backoffice e devolve ao ecrã de entrada.
import type { APIRoute } from 'astro';
import { terminarSessao } from '../../lib/auth';

export const POST: APIRoute = ({ cookies, redirect }) => {
  terminarSessao(cookies);
  return redirect('/admin/entrar', 303);
};
