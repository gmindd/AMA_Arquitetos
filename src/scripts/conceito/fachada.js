// Fachada antes/depois: a linha de corte é arrastável (rato, toque ou
// teclado). Ao entrar no ecrã, a reabilitação "varre" a fachada da
// direita para o centro, como uma obra a avançar.

export function iniciarFachada() {
  const raiz = document.querySelector('[data-fachada]');
  if (!raiz) return;
  const svg = raiz.querySelector('svg');
  const corte = raiz.querySelector('[data-corte]');
  const linha = raiz.querySelector('[data-linha]');
  const pega = raiz.querySelector('[data-pega]');
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LARGURA_VB = 760;

  let valor = 50;
  let animacao = 0;

  function definir(v) {
    valor = Math.min(100, Math.max(0, v));
    corte.setAttribute('x', String((valor / 100) * LARGURA_VB));
    linha.style.setProperty('--corte', `${valor}%`);
    pega.setAttribute('aria-valuenow', String(Math.round(valor)));
    pega.setAttribute('aria-valuetext', `${Math.round(100 - valor)}% antes, ${Math.round(valor)}% depois`);
  }

  function deEvento(e) {
    const r = svg.getBoundingClientRect();
    definir(((e.clientX - r.left) / r.width) * 100);
  }

  let arrastar = false;
  raiz.addEventListener('pointerdown', (e) => {
    cancelAnimationFrame(animacao);
    arrastar = true;
    pega.classList.add('arrastar');
    raiz.setPointerCapture(e.pointerId);
    deEvento(e);
  });
  raiz.addEventListener('pointermove', (e) => arrastar && deEvento(e));
  const largar = () => {
    arrastar = false;
    pega.classList.remove('arrastar');
  };
  raiz.addEventListener('pointerup', largar);
  raiz.addEventListener('pointercancel', largar);

  pega.addEventListener('keydown', (e) => {
    const passo = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') definir(valor - passo);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') definir(valor + passo);
    else if (e.key === 'Home') definir(0);
    else if (e.key === 'End') definir(100);
    else return;
    cancelAnimationFrame(animacao);
    e.preventDefault();
  });

  // Varrimento inicial: de "só antes" (100%) até ao meio
  function varrer() {
    if (reduz) return definir(50);
    const inicio = performance.now();
    const dur = 2200;
    const passo = (t) => {
      const k = Math.min(1, (t - inicio) / dur);
      const e = 1 - Math.pow(1 - k, 4);
      definir(100 - 50 * e);
      if (k < 1) animacao = requestAnimationFrame(passo);
    };
    animacao = requestAnimationFrame(passo);
  }

  definir(100);
  const io = new IntersectionObserver(
    ([en]) => {
      if (!en.isIntersecting) return;
      varrer();
      io.disconnect();
    },
    { threshold: 0.45 },
  );
  io.observe(raiz);
}
