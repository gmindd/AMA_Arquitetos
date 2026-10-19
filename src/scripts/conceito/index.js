// Entrada do site conceito: liga a prancheta, a planta viva, a fachada
// e o formulário ao estado do visitante.

import { estado, ouvir, definir, primeiroNome } from './estado.js';
import { iniciarPrancheta, definirLeitura } from './prancheta.js';
import { iniciarRevelar, partirPalavras } from './revelar.js';
import { iniciarCasa, FASES_OBRA } from './casa.js';
import { iniciarFachada } from './fachada.js';
import { iniciarPedido } from './pedido.js';
import { iniciarIntro } from './intro.js';

iniciarRevelar();
iniciarIntro();
iniciarPrancheta();
iniciarConversa();
iniciarProcesso();
iniciarFachada();
iniciarPedido();
iniciarParalaxe();

// Passo 01: nome e programa do visitante
function iniciarConversa() {
  const nome = document.querySelector('[data-nome]');
  const etiquetas = [...document.querySelectorAll('[data-programa]')];
  if (nome) {
    nome.value = estado.nome;
    nome.addEventListener('input', () => definir({ nome: nome.value }));
    nome.addEventListener('keydown', (e) => e.key === 'Enter' && nome.blur());
  }
  etiquetas.forEach((b) =>
    b.addEventListener('click', () => {
      const escolhido = b.dataset.programa;
      definir({ programa: estado.programa === escolhido ? '' : escolhido });
    }),
  );
  ouvir((e, mudou) => {
    etiquetas.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.programa === e.programa)));
    if (nome && 'nome' in mudou && document.activeElement !== nome) nome.value = e.nome;
  });

  // Passo 06: o título da entrega dirige-se ao visitante pelo nome
  const titulo = document.querySelector('[data-titulo-entrega]');
  if (titulo) {
    let anterior = '';
    ouvir(() => {
      const n = primeiroNome();
      const texto = n ? `A casa é sua, ${n}.` : 'A casa é sua.';
      if (texto === anterior) return;
      anterior = texto;
      titulo.textContent = texto;
      partirPalavras(titulo);
    });
  }
}

// Passos 01–06: a planta viva no canvas
function iniciarProcesso() {
  const seccao = document.querySelector('[data-processo]');
  const tela = document.querySelector('[data-tela]');
  if (!seccao || !tela || !tela.getContext) return;
  const passos = [...seccao.querySelectorAll('[data-passo]')];
  const pct = document.querySelector('[data-obra-pct]');
  const fases = [...document.querySelectorAll('[data-obra-fase]')];

  iniciarCasa({
    seccao,
    tela,
    dica: seccao.querySelector('[data-dica]'),
    passos,
    aoPasso: (i) => passos.forEach((p, k) => p.classList.toggle('ativo', k === i)),
    aoObra: (bp) => {
      if (pct) pct.textContent = String(Math.round(bp * 100));
      fases.forEach((f, k) => f.classList.toggle('feita', bp >= FASES_OBRA[k]));
    },
    aoLeitura: definirLeitura,
  });
}

// Abertura: o alçado só se desenha quando entra no ecrã (depois da
// intro) e acompanha ligeiramente o cursor
function iniciarParalaxe() {
  const alcado = document.querySelector('[data-alcado]');
  const abertura = alcado?.closest('.abertura');
  if (abertura) {
    const io = new IntersectionObserver(
      ([en]) => {
        if (!en.isIntersecting) return;
        abertura.classList.add('em-vista');
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(abertura);
  }
  if (!alcado || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  window.addEventListener(
    'pointermove',
    (e) => {
      const r = abertura?.getBoundingClientRect();
      if (r && (r.bottom < 0 || r.top > window.innerHeight)) return;
      const dx = (e.clientX / window.innerWidth - 0.5) * -18;
      const dy = (e.clientY / window.innerHeight - 0.5) * -10;
      alcado.style.setProperty('--px', `${dx.toFixed(1)}px`);
      alcado.style.setProperty('--py', `${dy.toFixed(1)}px`);
    },
    { passive: true },
  );
}
