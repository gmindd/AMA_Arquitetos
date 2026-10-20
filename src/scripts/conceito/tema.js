// Modo claro / escuro. O tema inicial é decidido antes de pintar (script
// no <head>): a escolha guardada do visitante ou, sem ela, a do dispositivo.
// Enquanto o visitante não escolher, segue as mudanças do dispositivo.

const CHAVE = 'ama-tema';
const COR = { claro: '#e6e4e0', escuro: '#0a0a0a' };

export function temaAtual() {
  return document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro';
}

export function iniciarTema() {
  const raiz = document.documentElement;
  const botao = document.querySelector('[data-tema-botao]');
  const texto = document.querySelector('[data-tema-texto]');
  const meta = document.querySelector('meta[name="theme-color"]');
  const dispositivo = matchMedia('(prefers-color-scheme: dark)');

  const guardado = () => {
    try {
      const t = localStorage.getItem(CHAVE);
      return t === 'claro' || t === 'escuro' ? t : null;
    } catch {
      return null;
    }
  };

  function aplicar(tema) {
    raiz.dataset.tema = tema;
    meta?.setAttribute('content', COR[tema]);
    const outro = tema === 'escuro' ? 'claro' : 'escuro';
    if (texto) texto.textContent = outro === 'escuro' ? 'Escuro' : 'Claro';
    botao?.setAttribute('aria-label', `Mudar para modo ${outro}`);
    window.dispatchEvent(new CustomEvent('ama:tema', { detail: tema }));
  }

  aplicar(temaAtual());

  botao?.addEventListener('click', () => {
    const novo = temaAtual() === 'escuro' ? 'claro' : 'escuro';
    try {
      localStorage.setItem(CHAVE, novo);
    } catch {
      /* sem armazenamento: vale só nesta visita */
    }
    aplicar(novo);
  });

  dispositivo.addEventListener('change', (e) => {
    if (!guardado()) aplicar(e.matches ? 'escuro' : 'claro');
  });
}
