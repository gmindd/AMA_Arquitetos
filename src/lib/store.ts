// Camada de dados do site: os projetos e obras vivem como ficheiros JSON
// no diretório de dados do servidor (DATA_DIR — em Coolify, um volume
// persistente). As fotografias carregadas pelo backoffice ficam em
// DATA_DIR/uploads. As definições da marca (logótipos) ficam em
// DATA_DIR/definicoes.json. Nada disto é gravado no git.
//
// No primeiro arranque, se o volume estiver vazio, é semeado com o
// conteúdo de exemplo em ./seed (placeholders a substituir no /admin).

import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DATA_DIR = process.env.DATA_DIR ?? path.resolve('./data');
const SEED_DIR = path.resolve('./seed');

// Cada imagem carregada é reduzida até, no máximo, 1 MB.
const MAX_SAIDA = 1024 * 1024;
// Guarda de entrada: recusa ficheiros manifestamente grandes antes de processar.
const MAX_ENTRADA = 30 * 1024 * 1024;

export interface Projeto {
  slug: string;
  titulo: string;
  tipologia: string;
  local: string;
  area: string;
  ano: number;
  capa: string;
  galeria: string[];
  variacaoLogo: 'A/MA' | 'A/AM' | 'MA/A';
  logoClaro: boolean;
  ordem: number;
  visivel: boolean;
  nota?: string;
}

export interface Obra {
  slug: string;
  titulo: string;
  local: string;
  ano: number;
  antes: string;
  depois: string;
  ordem: number;
  visivel: boolean;
  nota?: string;
}

// Erro amigável quando o upload de uma imagem falha (formato inválido, etc.)
export class ErroUpload extends Error {}

// Chaves dos logótipos geríveis no backoffice.
// principal = lockup AMA + designação; icone = ícone circular (favicon);
// varAMA/varAAM/varMAA = variações compostas usadas sobre fotografia.
export type ChaveLogo = 'principal' | 'icone' | 'varAMA' | 'varAAM' | 'varMAA';

// Conta de envio configurada no backoffice (Resend)
export interface Envio {
  provedor: 'resend';
  apiKey: string;
  remetente?: string;
}

export interface Definicoes {
  logos: Partial<Record<ChaveLogo, string>>;
  // Email para onde seguem os pedidos de orçamento (escolhido no backoffice)
  emailDestino?: string;
  // Conta que envia os alertas, ligada por OAuth no backoffice
  envio?: Envio;
}

// Pedido de orçamento submetido no formulário de contactos
export interface PedidoOrcamento {
  nome: string;
  contacto: string;
  tipo: string;
  localizacao: string;
  mensagem: string;
  data: string;
}

// Mapeia a variação escolhida num projeto para a chave do logótipo
export function chaveVariante(v: Projeto['variacaoLogo']): ChaveLogo {
  if (v === 'A/AM') return 'varAAM';
  if (v === 'MA/A') return 'varMAA';
  return 'varAMA';
}

// Mapeia a variação para a posição do logótipo sobre a capa do cartão.
// A/MA -> canto inferior direito
// A/AM -> canto superior direito
// MA/A -> canto inferior esquerdo
export function cantoVariante(v: Projeto['variacaoLogo']): 'ID' | 'SD' | 'IE' {
  if (v === 'A/AM') return 'SD';
  if (v === 'MA/A') return 'IE';
  return 'ID';
}

// Rótulos legíveis mostrados no backoffice
export const ROTULO_VARIACAO: Record<Projeto['variacaoLogo'], string> = {
  'A/MA': 'Canto inferior direito',
  'A/AM': 'Canto superior direito',
  'MA/A': 'Canto inferior esquerdo',
};

// Garante o diretório de dados e a pasta de uploads
async function garantirDataDir(): Promise<void> {
  await fs.mkdir(path.join(DATA_DIR, 'uploads'), { recursive: true });
}

// Garante que a coleção existe no volume; se não existir, copia o seed
async function garantirColecao(colecao: 'projetos' | 'reabilitacao'): Promise<string> {
  const dir = path.join(DATA_DIR, colecao);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
    try {
      const seeds = await fs.readdir(path.join(SEED_DIR, colecao));
      for (const ficheiro of seeds) {
        if (!ficheiro.endsWith('.json')) continue;
        await fs.copyFile(path.join(SEED_DIR, colecao, ficheiro), path.join(dir, ficheiro));
      }
    } catch {
      // sem seed disponível: a coleção começa vazia
    }
  }
  await garantirDataDir();
  return dir;
}

// Lê todos os registos de uma coleção, ordenados por ordem e ano
async function listar<T extends { ordem: number; ano: number }>(
  colecao: 'projetos' | 'reabilitacao'
): Promise<T[]> {
  const dir = await garantirColecao(colecao);
  const ficheiros = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
  const registos: T[] = [];
  for (const ficheiro of ficheiros) {
    try {
      registos.push(JSON.parse(await fs.readFile(path.join(dir, ficheiro), 'utf8')));
    } catch {
      // ficheiro corrompido: ignorado, não derruba o site
    }
  }
  return registos.sort((a, b) => a.ordem - b.ordem || b.ano - a.ano);
}

// Um registo é visível por omissão; só desaparece quando marcado como oculto
function ehVisivel(r: { visivel?: boolean }): boolean {
  return r.visivel !== false;
}

// Listas completas (backoffice)
export const listarProjetos = () => listar<Projeto>('projetos');
export const listarObras = () => listar<Obra>('reabilitacao');

// Listas públicas: apenas os registos visíveis
export const listarProjetosPublicos = async () => (await listarProjetos()).filter(ehVisivel);
export const listarObrasPublicas = async () => (await listarObras()).filter(ehVisivel);

export async function obterProjeto(slug: string): Promise<Projeto | null> {
  return (await listarProjetos()).find((p) => p.slug === slug) ?? null;
}

export async function obterObra(slug: string): Promise<Obra | null> {
  return (await listarObras()).find((o) => o.slug === slug) ?? null;
}

// Converte um título em slug de URL (sem acentos, minúsculas, hífenes)
export function slugificar(texto: string): string {
  return (
    texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'sem-titulo'
  );
}

// Gera um slug único dentro da coleção (acrescenta -2, -3, … se preciso)
export async function slugUnico(
  colecao: 'projetos' | 'reabilitacao',
  titulo: string
): Promise<string> {
  const existentes = new Set(
    (colecao === 'projetos' ? await listarProjetos() : await listarObras()).map((r) => r.slug)
  );
  const base = slugificar(titulo);
  if (!existentes.has(base)) return base;
  let n = 2;
  while (existentes.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

async function guardar(colecao: 'projetos' | 'reabilitacao', slug: string, dados: unknown) {
  const dir = await garantirColecao(colecao);
  await fs.writeFile(path.join(dir, `${slug}.json`), JSON.stringify(dados, null, 2), 'utf8');
}

export const guardarProjeto = (p: Projeto) => guardar('projetos', p.slug, p);
export const guardarObra = (o: Obra) => guardar('reabilitacao', o.slug, o);

export async function apagar(colecao: 'projetos' | 'reabilitacao', slug: string) {
  const dir = await garantirColecao(colecao);
  await fs.rm(path.join(dir, `${slugificar(slug)}.json`), { force: true });
}

// Alterna a visibilidade de um registo (ocultar/mostrar no site público)
export async function alternarVisibilidade(colecao: 'projetos' | 'reabilitacao', slug: string) {
  if (colecao === 'projetos') {
    const p = await obterProjeto(slug);
    if (!p) return;
    p.visivel = p.visivel === false ? true : false;
    await guardarProjeto(p);
  } else {
    const o = await obterObra(slug);
    if (!o) return;
    o.visivel = o.visivel === false ? true : false;
    await guardarObra(o);
  }
}

// --------- Definições da marca (logótipos) ---------

export async function obterDefinicoes(): Promise<Definicoes> {
  await garantirDataDir();
  try {
    const bruto = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'definicoes.json'), 'utf8'));
    return {
      logos: { ...(bruto?.logos ?? {}) },
      emailDestino: typeof bruto?.emailDestino === 'string' ? bruto.emailDestino : undefined,
      envio: bruto?.envio && typeof bruto.envio.apiKey === 'string' ? bruto.envio : undefined,
    };
  } catch {
    return { logos: {} };
  }
}

// Guarda um pedido de orçamento em disco (rede de segurança: usado quando o
// envio por email falha ou ainda não está configurado, para não perder o lead).
export async function guardarMensagem(pedido: PedidoOrcamento): Promise<void> {
  const dir = path.join(DATA_DIR, 'mensagens');
  await fs.mkdir(dir, { recursive: true });
  const nome = `${Date.now()}-${slugificar(pedido.nome).slice(0, 40)}.json`;
  await fs.writeFile(path.join(dir, nome), JSON.stringify(pedido, null, 2), 'utf8');
}

export async function guardarDefinicoes(d: Definicoes): Promise<void> {
  await garantirDataDir();
  await fs.writeFile(path.join(DATA_DIR, 'definicoes.json'), JSON.stringify(d, null, 2), 'utf8');
}

// --------- Uploads e processamento de imagem ---------

// Reduz uma imagem até, no máximo, 1 MB. SVG passa tal como está (é leve e
// vetorial); tudo o resto é reconvertido para WebP — sem perdas quando
// couber (logótipos nítidos, com transparência), com perdas para fotografia.
async function processarImagem(entrada: Buffer, mime: string): Promise<{ conteudo: Buffer; ext: string }> {
  if (mime.toLowerCase().includes('svg')) {
    if (entrada.length > MAX_SAIDA) {
      throw new ErroUpload('O SVG é demasiado grande (máximo 1 MB).');
    }
    return { conteudo: entrada, ext: '.svg' };
  }

  const base = (largura: number) =>
    sharp(entrada, { failOn: 'none', animated: true })
      .rotate()
      .resize({ width: largura, withoutEnlargement: true });

  try {
    // Logótipos e gráficos simples: WebP sem perdas mantém arestas e alfa
    const semPerdas = await base(2400).webp({ lossless: true }).toBuffer();
    if (semPerdas.length <= MAX_SAIDA) {
      return { conteudo: semPerdas, ext: '.webp' };
    }

    // Fotografia: qualidade e dimensão decrescentes até caber em 1 MB
    for (const largura of [2400, 2000, 1600, 1200, 1000]) {
      for (const qualidade of [82, 74, 66, 58, 50, 42]) {
        const buf = await base(largura).webp({ quality: qualidade }).toBuffer();
        if (buf.length <= MAX_SAIDA) return { conteudo: buf, ext: '.webp' };
      }
    }
    const ultimo = await base(900).webp({ quality: 38 }).toBuffer();
    return { conteudo: ultimo, ext: '.webp' };
  } catch {
    throw new ErroUpload('O ficheiro não é uma imagem válida.');
  }
}

// Grava um ficheiro carregado no formulário em DATA_DIR/uploads, reduzido a
// ≤ 1 MB, e devolve o URL público (/uploads/…). Nome único e seguro.
export async function guardarUpload(ficheiro: File): Promise<string> {
  await garantirDataDir();
  if (ficheiro.size > MAX_ENTRADA) {
    throw new ErroUpload('A imagem é demasiado grande (máximo 30 MB antes de compressão).');
  }
  const entrada = Buffer.from(await ficheiro.arrayBuffer());
  const { conteudo, ext } = await processarImagem(entrada, ficheiro.type || '');
  const base = slugificar(path.basename(ficheiro.name, path.extname(ficheiro.name)));
  const nome = `${Date.now()}-${base}${ext}`;
  await fs.writeFile(path.join(DATA_DIR, 'uploads', nome), conteudo);
  return `/uploads/${nome}`;
}

// Lê um ficheiro de uploads para servir via rota /uploads/…,
// recusando qualquer tentativa de sair do diretório
export async function lerUpload(nome: string): Promise<Buffer | null> {
  const diretorio = path.join(DATA_DIR, 'uploads');
  const caminho = path.normalize(path.join(diretorio, nome));
  if (!caminho.startsWith(diretorio + path.sep)) return null;
  try {
    return await fs.readFile(caminho);
  } catch {
    return null;
  }
}
