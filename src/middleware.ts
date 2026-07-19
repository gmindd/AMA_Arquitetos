import { defineMiddleware } from 'astro:middleware';
import { sessaoValida } from './lib/auth';

// Protege todo o backoffice: sem sessão válida, qualquer rota /admin
// redireciona para o ecrã de entrada.
export const onRequest = defineMiddleware((contexto, seguinte) => {
  const { pathname } = contexto.url;
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/entrar')) {
    if (!sessaoValida(contexto.cookies)) {
      return contexto.redirect('/admin/entrar');
    }
  }
  return seguinte();
});
