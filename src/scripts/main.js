// AMA — comportamento do site: menu, revelação ao rolar, cabeçalho,
// parallax subtil e comparadores antes/depois.
// Compatível com as transições de página do Astro (astro:page-load).

import { initBeforeAfter } from './beforeafter.js';

const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

// Elementos com parallax na página atual (atualizado a cada navegação)
let alvosParallax = [];
let cabecalhoAtual = null;

// Direção do scroll do cabeçalho (histerese para evitar tremura)
let ultimoScrollY = 0;
let direcaoScroll = 'cima';

// Revela os elementos [data-reveal] à medida que entram no viewport,
// com um pequeno atraso escalonado entre elementos do mesmo lote
function initReveal() {
  const elementos = document.querySelectorAll('[data-reveal]:not(.revelado)');
  if (movimentoReduzido.matches) {
    elementos.forEach((el) => el.classList.add('revelado'));
    return;
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      let atraso = 0;
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.style.setProperty('--reveal-delay', `${atraso}s`);
        entrada.target.classList.add('revelado');
        observador.unobserve(entrada.target);
        atraso += 0.08;
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
  );

  elementos.forEach((el) => observador.observe(el));
}

// Prepara o cabeçalho e o estado de scroll da página atual
function initCabecalho() {
  cabecalhoAtual = document.querySelector('[data-cabecalho]');
  ultimoScrollY = window.scrollY;
  direcaoScroll = 'cima';
  atualizarCabecalho();
}

// Escolhe o fundo do cabeçalho conforme a posição e a direção do scroll:
// - topo da página ou a subir  -> translúcido (fosco, legível, deixa ver as imagens)
// - a descer sobre o hero      -> difuso (transparente, mistura por diferença)
// - a descer passado o hero    -> sólido (como estava)
function atualizarCabecalho() {
  if (!cabecalhoAtual) return;
  const y = window.scrollY;

  // Limite a partir do qual se considera que o hero saiu do ecrã
  const temHero = cabecalhoAtual.classList.contains('cabecalho--difusao');
  let limiteHero = 24;
  if (temHero) {
    const hero = document.querySelector('[data-hero]');
    if (hero) limiteHero = hero.offsetHeight - cabecalhoAtual.offsetHeight;
  }

  // Direção com histerese de 4px para não trocar de estado em micro-scrolls
  const delta = y - ultimoScrollY;
  if (delta > 4) direcaoScroll = 'baixo';
  else if (delta < -4) direcaoScroll = 'cima';
  ultimoScrollY = y;

  let modo;
  if (y <= 4 || direcaoScroll === 'cima') {
    modo = 'translucido';
  } else {
    modo = temHero && y <= limiteHero ? 'difuso' : 'solido';
  }

  cabecalhoAtual.classList.toggle('modo-translucido', modo === 'translucido');
  cabecalhoAtual.classList.toggle('modo-difuso', modo === 'difuso');
  cabecalhoAtual.classList.toggle('modo-solido', modo === 'solido');
}

// Abre e fecha o menu de ecrã inteiro, mantendo aria-expanded coerente
function initMenu() {
  const botao = document.querySelector('[data-botao-menu]');
  if (!botao) return;

  botao.addEventListener('click', () => {
    const aberto = document.body.classList.toggle('menu-aberto');
    botao.setAttribute('aria-expanded', String(aberto));
    botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  });

  // Fechar ao escolher uma ligação do menu
  document.querySelectorAll('[data-menu] a').forEach((ligacao) => {
    ligacao.addEventListener('click', () => fecharMenu());
  });
}

// Fecha o menu de ecrã inteiro, se estiver aberto
function fecharMenu() {
  document.body.classList.remove('menu-aberto');
  const botao = document.querySelector('[data-botao-menu]');
  if (botao) {
    botao.setAttribute('aria-expanded', 'false');
    botao.setAttribute('aria-label', 'Abrir menu');
  }
}

// Identificador da rotação do hero, limpo a cada navegação
let heroIntervalo = null;

// Rotação lenta dos diapositivos do hero da home, com fusão cruzada
function initHero() {
  if (heroIntervalo) {
    clearInterval(heroIntervalo);
    heroIntervalo = null;
  }
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;

  const seta = hero.querySelector('[data-hero-seta]');
  if (seta) {
    seta.addEventListener('click', () => {
      const grelha = document.getElementById('projetos');
      if (grelha) {
        grelha.scrollIntoView({ behavior: movimentoReduzido.matches ? 'auto' : 'smooth' });
      }
    });
  }

  const slides = Array.from(hero.querySelectorAll('[data-hero-slide]'));
  if (slides.length < 2 || movimentoReduzido.matches) return;

  let atual = 0;
  heroIntervalo = setInterval(() => {
    const anterior = slides[atual];
    atual = (atual + 1) % slides.length;
    const proximo = slides[atual];
    anterior.classList.remove('ativo');
    anterior.setAttribute('aria-hidden', 'true');
    anterior.setAttribute('tabindex', '-1');
    proximo.classList.add('ativo');
    proximo.removeAttribute('aria-hidden');
    proximo.removeAttribute('tabindex');
  }, 5200);
}

// Recolhe os alvos de parallax da página atual
function initParallax() {
  alvosParallax = movimentoReduzido.matches
    ? []
    : Array.from(document.querySelectorAll('[data-parallax]'));
  aplicarParallax();
}

// Desloca ligeiramente as imagens marcadas, em função do scroll
function aplicarParallax() {
  alvosParallax.forEach((el) => {
    const caixa = el.parentElement.getBoundingClientRect();
    const progresso = caixa.top / window.innerHeight;
    el.style.transform = `translateY(${progresso * -6}%) scale(1.12)`;
  });
}

// Um único listener de scroll para toda a vida da aplicação,
// limitado por requestAnimationFrame
let aguardaFrame = false;
window.addEventListener(
  'scroll',
  () => {
    if (aguardaFrame) return;
    aguardaFrame = true;
    requestAnimationFrame(() => {
      atualizarCabecalho();
      aplicarParallax();
      aguardaFrame = false;
    });
  },
  { passive: true }
);

// Fechar o menu com a tecla Escape (listener único, verifica o estado no DOM)
document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape' && document.body.classList.contains('menu-aberto')) {
    fecharMenu();
  }
});

// Splash inicial: aparece uma vez por sessão, com hold + crossfade.
// 1.5 s hold em desktop, 1 s em mobile; 0.5 s de fusão para o site.
function initSplash() {
  const splash = document.querySelector('[data-splash]');
  if (!splash) return;

  let visto = false;
  try {
    visto = !!sessionStorage.getItem('ama-splash-visto');
  } catch (_) {}

  if (visto) {
    splash.remove();
    return;
  }

  const emMobile = window.matchMedia('(max-width: 959px)').matches;
  const holdMs = emMobile ? 1000 : 1500;

  document.body.classList.add('splash-ativo');

  setTimeout(() => {
    splash.classList.add('splash--saida');
    // Depois do crossfade, retirar do DOM e libertar o scroll
    setTimeout(() => {
      splash.remove();
      document.body.classList.remove('splash-ativo');
    }, 600);
    try {
      sessionStorage.setItem('ama-splash-visto', '1');
      document.documentElement.classList.add('sem-splash');
    } catch (_) {}
  }, holdMs);
}

// Inicializa tudo a cada carregamento de página (inclui navegações do Astro)
function initPagina() {
  initSplash();
  fecharMenu();
  initCabecalho();
  initMenu();
  initHero();
  initReveal();
  initParallax();
  initBeforeAfter();
}

document.addEventListener('astro:page-load', initPagina);
