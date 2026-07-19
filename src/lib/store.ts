// Camada de dados do site: os projetos e obras vivem como ficheiros JSON
// no diretório de dados do servidor (DATA_DIR — em Coolify, um volume
// persistente). As fotografias carregadas pelo backoffice ficam em
// DATA_DIR/uploads. Nada disto é gravado no git.
//
// No primeiro arranque, se o volume estiver vazio, é semeado com o
// conteúdo de exemplo em ./seed (placeholders a substituir no /admin).

import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR ?? path.resolve('./data');
const SEED_DIR = path.resolve('./seed');

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
  nota?: string;
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
  await fs.mkdir(path.join(DATA_DIR, 'uploads'), { recursive: true });
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

export const listarProjetos = () => listar<Projeto>('projetos');
export const listarObras = () => listar<Obra>('reabilitacao');

export async function obterProjeto(slug: string): Promise<Projeto | null> {
  return (await listarProjetos()).find((p) => p.slug === slug) ?? null;
}

export async function obterObra(slug: string): Promise<Obra | null> {
  return (await listarObras()).find((o) => o.slug === slug) ?? null;
}

// Converte um título em slug de URL (sem acentos, minúsculas, hífenes)
export function slugificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'sem-titulo';
}

// Gera um slug único dentro da coleção (acrescenta -2, -3, … se preciso)
export async function slugUnico(colecao: 'projetos' | 'reabilitacao', titulo: string): Promise<string> {
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

// Grava um ficheiro carregado no formulário em DATA_DIR/uploads
// e devolve o URL público (/uploads/…). Nome único e sem caracteres perigosos.
export async function guardarUpload(ficheiro: File): Promise<string> {
  await garantirColecao('projetos');
  const extensao = path.extname(ficheiro.name).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin';
  const base = slugificar(path.basename(ficheiro.name, path.extname(ficheiro.name)));
  const nome = `${Date.now()}-${base}${extensao}`;
  const destino = path.join(DATA_DIR, 'uploads', nome);
  await fs.writeFile(destino, Buffer.from(await ficheiro.arrayBuffer()));
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
