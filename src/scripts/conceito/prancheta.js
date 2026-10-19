// Prancheta: réguas, mira do cursor e carimbo da folha.
// O carimbo mostra o cliente (nome do visitante), o programa, a fase
// e o número da folha da secção que está no ecrã.

import { ouvir } from './estado.js';

const raiz = document.documentElement;
const TOTAL_FOLHAS = '09';
let leitor = null; // fornecedor de leitura (ex.: coordenadas na planta)

export function definirLeitura(texto) {
  leitor = texto;
}

export function iniciarPrancheta() {
  iniciarReguas();
  iniciarMira();
  iniciarCarimbo();
}

// ---------- Réguas ----------
function iniciarReguas() {
  const topo = document.querySelector('[data-regua="x"]');
  const lado = document.querySelector('[data-regua="y"]');
  if (!topo || !lado) return;

  const numerosTopo = () => {
    topo.querySelectorAll('.regua__num').forEach((n) => n.remove());
    for (let x = 100; x < window.innerWidth; x += 100) {
      const n = document.createElement('span');
      n.className = 'regua__num';
      n.style.left = `${x + 22}px`;
      n.textContent = x / 10;
      topo.appendChild(n);
    }
  };

  // A régua lateral corre com a página: marca a "cota" do scroll
  const numerosLado = [];
  const prepararLado = () => {
    numerosLado.forEach((n) => n.remove());
    numerosLado.length = 0;
    for (let i = 0; i <= Math.ceil(window.innerHeight / 100) + 1; i++) {
      const n = document.createElement('span');
      n.className = 'regua__num';
      lado.appendChild(n);
      numerosLado.push(n);
    }
    atualizarLado();
  };
  const atualizarLado = () => {
    const y = window.scrollY;
    const desvio = -(y % 100);
    lado.style.setProperty('--desvio', `${desvio}px`);
    const base = Math.floor(y / 100);
    numerosLado.forEach((n, i) => {
      n.style.top = `${desvio + i * 100 + 4}px`;
      n.textContent = (base + i) * 10;
    });
  };

  numerosTopo();
  prepararLado();
  window.addEventListener('resize', () => {
    numerosTopo();
    prepararLado();
  });
  window.addEventListener('scroll', atualizarLado, { passive: true });
}

// ---------- Mira ----------
function iniciarMira() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const mira = document.querySelector('.mira');
  const leitura = mira?.querySelector('.mira__leitura');
  if (!mira || !leitura) return;

  let x = -100;
  let y = -100;
  let pendente = false;

  const pintar = () => {
    pendente = false;
    raiz.style.setProperty('--mx', `${x}px`);
    raiz.style.setProperty('--my', `${y}px`);
    leitura.textContent = leitor || `x ${String(Math.round(x)).padStart(4, '0')} · y ${String(Math.round(y + window.scrollY)).padStart(5, '0')}`;
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      x = e.clientX;
      y = e.clientY;
      // Sobre elementos interativos, a mira recolhe-se para não estorvar
      const alvo = e.target.closest?.('a, button, input, select, textarea, label, [role="slider"]');
      mira.classList.toggle('ativa', !alvo);
      if (!pendente) {
        pendente = true;
        requestAnimationFrame(pintar);
      }
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => mira.classList.remove('ativa'));
}

// ---------- Carimbo ----------
function iniciarCarimbo() {
  const carimbo = document.querySelector('[data-carimbo]');
  if (!carimbo) return;
  const campo = (k) => carimbo.querySelector(`[data-c="${k}"]`);
  const progresso = campo('progresso');

  const definir = (k, valor) => {
    const el = campo(k);
    if (!el || el.textContent === valor) return;
    el.textContent = valor;
    el.classList.remove('pisca');
    void el.offsetWidth;
    el.classList.add('pisca');
  };

  ouvir((e) => {
    const nome = e.nome.trim();
    definir('cliente', nome || 'Por definir');
    definir('projeto', nome ? `Casa ${nome.split(/\s+/)[0]}` : 'A sua casa');
    definir('programa', e.programa || 'Por definir');
  });

  // Folha e fase: secções com data-folha (os passos do processo incluídos)
  const folhas = [...document.querySelectorAll('[data-folha]')];
  const atualizarFolha = (el) => {
    definir('folha', `${el.dataset.folha}/${TOTAL_FOLHAS}`);
    definir('fase', `${el.dataset.folha} · ${el.dataset.fase}`);
  };
  const io = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((en) => {
        if (en.isIntersecting) atualizarFolha(en.target);
      });
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  folhas.forEach((f) => io.observe(f));

  // No contacto o formulário já é uma folha com carimbo: esconde o fixo
  const contacto = document.querySelector('#contacto');
  if (contacto) {
    new IntersectionObserver(
      ([en]) => carimbo.classList.toggle('carimbo--oculto', en.isIntersecting),
      { rootMargin: '0px 0px -30% 0px' },
    ).observe(contacto);
  }

  // Ligação ativa no menu
  const ligacoes = [...document.querySelectorAll('.topo__nav a')];
  const alvos = ligacoes.map((a) => document.querySelector(a.getAttribute('href')));
  const ioNav = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((en) => {
        const i = alvos.indexOf(en.target);
        if (i >= 0 && en.isIntersecting) ligacoes.forEach((a, k) => a.setAttribute('aria-current', String(k === i)));
      });
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  alvos.forEach((a) => a && ioNav.observe(a));

  const atualizarProgresso = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progresso) progresso.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener('scroll', atualizarProgresso, { passive: true });
  atualizarProgresso();
}
