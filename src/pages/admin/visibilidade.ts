// Alterna rapidamente a visibilidade de um projeto ou obra a partir da lista
// do backoffice, devolvendo ao painel.
import type { APIRoute } from 'astro';
import { alternarVisibilidade } from '../../lib/store';

export const POST: APIRoute = async ({ request, redirect }) => {
  const dados = await request.formData();
  const colecao = String(dados.get('colecao') ?? '');
  const slug = String(dados.get('slug') ?? '');
  if ((colecao === 'projetos' || colecao === 'reabilitacao') && slug) {
    await alternarVisibilidade(colecao, slug);
  }
  return redirect('/admin', 303);
};
