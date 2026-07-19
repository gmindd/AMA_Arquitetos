// Serve as fotografias carregadas no backoffice a partir do volume de
// dados do servidor (DATA_DIR/uploads). Os nomes são únicos, por isso
// o cache pode ser agressivo.
import type { APIRoute } from 'astro';
import { lerUpload } from '../../lib/store';

const TIPOS: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export const GET: APIRoute = async ({ params }) => {
  const nome = params.ficheiro ?? '';
  const conteudo = await lerUpload(nome);
  if (!conteudo) {
    return new Response('Não encontrado', { status: 404 });
  }
  const extensao = nome.slice(nome.lastIndexOf('.')).toLowerCase();
  return new Response(new Uint8Array(conteudo), {
    headers: {
      'Content-Type': TIPOS[extensao] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
