// Constrói registos a partir dos formulários do backoffice,
// gravando os ficheiros carregados no volume de dados.

import {
  guardarUpload,
  slugUnico,
  type Projeto,
  type Obra,
} from './store';

const VARIACOES = ['A/MA', 'A/AM', 'MA/A'] as const;

function texto(dados: FormData, campo: string): string {
  return String(dados.get(campo) ?? '').trim();
}

function numero(dados: FormData, campo: string, defeito: number): number {
  const valor = parseInt(texto(dados, campo), 10);
  return Number.isFinite(valor) ? valor : defeito;
}

// Guarda um ficheiro do formulário, se foi enviado; senão devolve o atual
async function ficheiroOuAtual(dados: FormData, campo: string, atual: string): Promise<string> {
  const ficheiro = dados.get(campo);
  if (ficheiro instanceof File && ficheiro.size > 0) {
    return guardarUpload(ficheiro);
  }
  return atual;
}

export async function projetoDeFormulario(
  dados: FormData,
  existente: Projeto | null
): Promise<Projeto> {
  const titulo = texto(dados, 'titulo');
  const variacao = texto(dados, 'variacaoLogo');

  // Galeria: mantém as imagens não marcadas para remoção e junta as novas
  const remover = new Set(dados.getAll('galeria-remover').map(String));
  const galeria = (existente?.galeria ?? []).filter((imagem) => !remover.has(imagem));
  for (const ficheiro of dados.getAll('galeria-novas')) {
    if (ficheiro instanceof File && ficheiro.size > 0) {
      galeria.push(await guardarUpload(ficheiro));
    }
  }

  return {
    slug: existente?.slug ?? (await slugUnico('projetos', titulo)),
    titulo,
    tipologia: texto(dados, 'tipologia'),
    local: texto(dados, 'local'),
    area: texto(dados, 'area'),
    ano: numero(dados, 'ano', new Date().getFullYear()),
    capa: await ficheiroOuAtual(dados, 'capa', existente?.capa ?? ''),
    galeria,
    variacaoLogo: (VARIACOES as readonly string[]).includes(variacao)
      ? (variacao as Projeto['variacaoLogo'])
      : 'A/MA',
    logoClaro: dados.get('logoClaro') === 'on',
    ordem: numero(dados, 'ordem', 0),
    nota: texto(dados, 'nota'),
  };
}

export async function obraDeFormulario(dados: FormData, existente: Obra | null): Promise<Obra> {
  const titulo = texto(dados, 'titulo');
  return {
    slug: existente?.slug ?? (await slugUnico('reabilitacao', titulo)),
    titulo,
    local: texto(dados, 'local'),
    ano: numero(dados, 'ano', new Date().getFullYear()),
    antes: await ficheiroOuAtual(dados, 'antes', existente?.antes ?? ''),
    depois: await ficheiroOuAtual(dados, 'depois', existente?.depois ?? ''),
    ordem: numero(dados, 'ordem', 0),
    nota: texto(dados, 'nota'),
  };
}

// Validação mínima antes de gravar; devolve a lista de problemas
export function validarProjeto(p: Projeto): string[] {
  const erros: string[] = [];
  if (!p.titulo) erros.push('O título é obrigatório.');
  if (!p.tipologia) erros.push('A tipologia é obrigatória.');
  if (!p.local) erros.push('O local é obrigatório.');
  if (!p.area) erros.push('A área é obrigatória.');
  if (!p.capa) erros.push('A fotografia de capa é obrigatória.');
  return erros;
}

export function validarObra(o: Obra): string[] {
  const erros: string[] = [];
  if (!o.titulo) erros.push('O título é obrigatório.');
  if (!o.local) erros.push('O local é obrigatório.');
  if (!o.antes) erros.push('A fotografia de antes é obrigatória.');
  if (!o.depois) erros.push('A fotografia de depois é obrigatória.');
  return erros;
}
