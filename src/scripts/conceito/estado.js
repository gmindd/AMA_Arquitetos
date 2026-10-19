// Estado partilhado do visitante: o nome e o programa escolhidos no
// passo 01. Passam para o carimbo, para a planta e para o formulário.
// Guardado em localStorage só por conveniência (pode falhar em modo
// privado, por isso tudo funciona sem ele).

const CHAVE = 'ama-conceito-visitante';
const ouvintes = new Set();

function ler() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) || '{}');
    return { nome: String(bruto.nome || '').slice(0, 32), programa: String(bruto.programa || '') };
  } catch {
    return { nome: '', programa: '' };
  }
}

export const estado = ler();

export function definir(parcial) {
  Object.assign(estado, parcial);
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    /* sem armazenamento: segue só em memória */
  }
  ouvintes.forEach((fn) => fn(estado, parcial));
}

export function ouvir(fn) {
  ouvintes.add(fn);
  fn(estado, estado);
  return () => ouvintes.delete(fn);
}

// Primeiro nome, com a inicial em maiúscula, para usar no desenho
export function primeiroNome() {
  const n = estado.nome.trim().split(/\s+/)[0] || '';
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
}
