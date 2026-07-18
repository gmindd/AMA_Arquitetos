// AMA — comportamento do site: menu, revelação ao rolar, cabeçalho,
// parallax subtil e comparadores antes/depois.
// Compatível com as transições de página do Astro (astro:page-load).

import { initBeforeAfter } from './beforeafter.js';

const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

// Elementos com parallax na página atual (atualizado a cada navegação)
let alvosParallax = [];
let cabecalhoAtual = null;

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

// Marca o cabeçalho como "rolado" depois de passar o topo da página
function initCabecalho() {
  cabecalhoAtual = document.querySelector('[data-cabecalho]');
  atualizarCabecalho();
}

// Aplica o estado do cabeçalho consoante a posição de scroll.
// Sobre o hero da home, o cabeçalho só ganha fundo depois de o hero sair.
function atualizarCabecalho() {
  if (!cabecalhoAtual) return;
  let limite = 24;
  if (cabecalhoAtual.classList.contains('cabecalho--difusao')) {
    const hero = document.querySelector('[data-hero]');
    if (hero) limite = hero.offsetHeight - cabecalhoAtual.offsetHeight;
  }
  cabecalhoAtual.classList.toggle('rolado', window.scrollY > limite);
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

// Inicializa tudo a cada carregamento de página (inclui navegações do Astro)
function initPagina() {
  fecharMenu();
  initCabecalho();
  initMenu();
  initHero();
  initReveal();
  initParallax();
  initBeforeAfter();
}

document.addEventListener('astro:page-load', initPagina);
