import { defineMiddleware, sequence } from 'astro:middleware';
import { sessaoValida } from './lib/auth';
import { extrairLocale, type Locale } from './lib/i18n';

// Deteta o idioma a partir do prefixo do URL. Se for /en/... ou /fr/...,
// injeta o idioma em Astro.locals e faz rewrite interno para a página
// original (a árvore de páginas vive só em /). As páginas leem o idioma
// via Astro.locals.locale e mostram o texto certo.
const i18n = defineMiddleware(async (contexto, seguinte) => {
  const locals = contexto.locals as { locale?: Locale };
  // Se este pedido já é um rewrite (locale já preenchido), respeita-o.
  // Sem isto, o segundo passo da cadeia (agora sobre /sobre em vez de
  // /en/sobre) sobrescreveria a variável para 'pt' e perderíamos o idioma.
  if (locals.locale) return seguinte();

  const { locale, pathSemLocale } = extrairLocale(contexto.url.pathname);
  locals.locale = locale;

  if (locale !== 'pt' && pathSemLocale !== contexto.url.pathname) {
    const destino = pathSemLocale + contexto.url.search;
    return contexto.rewrite(destino);
  }

  return seguinte();
});

// Protege todo o backoffice: sem sessão válida, qualquer rota /admin
// redireciona para o ecrã de entrada.
const admin = defineMiddleware((contexto, seguinte) => {
  const { pathname } = contexto.url;
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/entrar')) {
    if (!sessaoValida(contexto.cookies)) {
      return contexto.redirect('/admin/entrar');
    }
  }
  return seguinte();
});

export const onRequest = sequence(i18n, admin);
