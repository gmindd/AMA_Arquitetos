// A planta viva: um único desenho em canvas que acompanha um percurso.
// O scroll define S, a "posição no percurso" (S = k quando o passo k está
// no centro do ecrã). Cada camada do desenho reage a um troço de S.
// Dois roteiros partilham o mesmo motor:
//   processo:     bolhas → esboço → planta → axonometria → obra → entrega
//   reabilitacao: levantamento → manter/demolir/construir → axonometria
//                 → obra (escorar, demolir, construir) → entrega
// Este ficheiro mede, calcula as fases de cada quadro e chama as camadas
// (camadas-desenho.js e camadas-volume.js) pela ordem certa.

import { primeiroNome } from '../estado.js';
import { clamp, seg, lerp, emOut, emInOut, num, NEGRO, OSSO, mistura, rgba } from './util.js';
import { criarTraco } from './traco.js';
import { criarCamara } from './camara.js';
import { criarSolidos } from './solidos.js';
import { criarDesenho } from './camadas-desenho.js';
import { criarVolume } from './camadas-volume.js';

// Fases da obra e o ponto (0–1 do progresso de obra) em que ficam feitas
export const FASES_OBRA = {
  processo: [0.04, 0.16, 0.5, 0.74, 0.86, 0.99],
  reabilitacao: [0.05, 0.2, 0.5, 0.74, 0.86, 0.99],
};

const EXPLODE = 2.8; // afastamento do piso 1 na axonometria explodida
const COTANGENTE = 1.25; // comprimento de sombra por metro de altura

// Completa o modelo com valores por omissão e dados derivados
function normalizar(m) {
  const { LARGURA, PROFUNDIDADE } = m;
  const pegadas = m.pegadas || [[0, 0, LARGURA, PROFUNDIDADE]];
  const norte = m.norte ?? 0;
  // vetor norte no plano do modelo e o poente que lhe corresponde
  const N = [Math.sin(norte), -Math.cos(norte)];
  const W = [N[1], -N[0]];
  // janelas: aresta interior do vão e divisão que iluminam
  const janelas = m.vaos
    .filter((v) => v.tipo === 'janela' && v.n)
    .map((v) => {
      const [x0, y0, x1, y1] = v.r;
      const a = v.h ? [x0, v.n[1] > 0 ? y0 : y1] : [v.n[0] > 0 ? x0 : x1, y0];
      const b = v.h ? [x1, a[1]] : [a[0], y1];
      const cx = (a[0] + b[0]) / 2 - v.n[0] * 0.5;
      const cy = (a[1] + b[1]) / 2 - v.n[1] * 0.5;
      const sala = m.divisoes.findIndex((d) => !d.exterior && cx >= d.r[0] && cx <= d.r[2] && cy >= d.r[1] && cy <= d.r[3]);
      return { ...v, a, b, sala };
    });
  return {
    ...m,
    pegadas,
    bolhas: m.bolhas || [],
    ligacoes: m.ligacoes || [],
    escada: m.escada || [],
    coberturas: m.coberturas || [{ tipo: 'plana', r: [-0.3, -0.3, LARGURA + 0.3, PROFUNDIDADE + 0.3] }],
    arvores: m.arvores || (m.arvore ? [m.arvore] : []),
    agua: m.agua || null,
    pergola: m.pergola || null,
    demolicoes: m.demolicoes || [],
    levantamento: m.levantamento || [],
    notas: m.notas || [],
    margens: m.margens || [2.6, 1.9, 1.6, 2.9],
    piso1: m.piso1 || null,
    cheias: m.paredes.filter((p) => p.z0 === 0 && p.z1 >= 2),
    cantos: pegadas.flatMap(([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]),
    janelas,
    N,
    W,
    solAz: m.solAz ?? 0.8,
    // grua-torre junto ao topo do lote (só no processo)
    grua: { x: LARGURA + 2.3, y: -1.4, altura: 9, lanca: 11 },
  };
}

export function iniciarCasa({ seccao, tela, dica, passos, aoPasso, aoObra, aoLeitura, modelo, roteiro = 'processo' }) {
  const R = roteiro === 'reabilitacao';
  const M = normalizar(modelo);
  const { ALTURA, LARGURA, PROFUNDIDADE, divisoes } = M;
  const ctx = tela.getContext('2d');
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const med = { L: 0, A: 0, dpr: 1 };
  const cam = criarCamara(LARGURA, PROFUNDIDADE);
  const tr = criarTraco(ctx, () => med);
  const g = { ctx, tr, cam, M, R, reduz, med, solidos: criarSolidos(cam), hover: { sala: -1, a: 0 }, f: null };
  const D = criarDesenho(g);
  const V = criarVolume(g);

  let centros = [];
  let S = -1;
  let Sv = -1;
  let ativo = false;
  let passoAtual = -1;
  let dAnterior = -1;
  let ultimoPct = -1;
  let rato = null; // { x, y } em coordenadas da tela
  let limiteTexto = 0; // margem direita dos cartões de texto (desktop)

  // ---------- Medidas ----------
  function medir() {
    const r = tela.getBoundingClientRect();
    med.L = r.width;
    med.A = r.height;
    med.dpr = Math.min(window.devicePixelRatio || 1, 2);
    tela.width = Math.round(med.L * med.dpr);
    tela.height = Math.round(med.A * med.dpr);
    const cartao = seccao.querySelector('.passo__cartao');
    limiteTexto = cartao ? cartao.getBoundingClientRect().right : 0;
    centros = passos.map((el) => {
      const b = el.getBoundingClientRect();
      return b.top + window.scrollY + b.height / 2;
    });
  }

  function calcularS() {
    const c = window.scrollY + window.innerHeight / 2;
    const n = centros.length;
    if (n < 2) return 0;
    if (c <= centros[0]) return (c - centros[0]) / (centros[1] - centros[0]);
    for (let i = 0; i < n - 1; i++) {
      if (c <= centros[i + 1]) return i + (c - centros[i]) / (centros[i + 1] - centros[i]);
    }
    return n - 1 + (c - centros[n - 1]) / (centros[n - 1] - centros[n - 2]);
  }

  // Área do ecrã onde o desenho é enquadrado
  function areaPalco() {
    const { L, A } = med;
    if (L > 900) return { x0: Math.max(L * 0.4, limiteTexto + 40), x1: L - 40, y0: 110, y1: A - 60 };
    return { x0: 18, x1: L - 18, y0: 128, y1: A * 0.5 };
  }

  // ---------- Fases do quadro ----------
  // A reabilitação tem menos um passo no início: a partir do projeto usa
  // os mesmos tempos do processo, um passo antes.
  function fases(sReal, tempo) {
    const r0 = sReal;
    const s = R ? sReal + 1 : sReal;
    const camP = emInOut(seg(s, 2.45, 3.25));
    const d = seg(s, 3.45, 3.75) * (1 - seg(s, 4.4, 4.7));
    const m = seg(s, 3.42, 3.62); // passagem do modelo para a obra
    const bp = s >= 4.45 ? 1 : seg(s, 3.62, 4.45); // progresso da obra
    const levanta = emInOut(seg(s, 4.55, 4.95));
    const poche = seg(s, 1.4, 1.7);
    const desce = m > 0 ? emOut(R && M.piso1 ? seg(bp, 0.76, 0.86) : seg(bp, 0.62, 0.74)) : 0;

    // Cores: o tema escuro troca papel e tinta; a obra inverte o tema
    const tema = document.documentElement.dataset.tema === 'escuro' ? 1 : 0;
    const inv = tema + d - 2 * tema * d;
    const tinta = mistura(NEGRO, OSSO, inv);
    const papel = mistura(OSSO, NEGRO, inv);

    // Sol: de sudoeste, a rodar para poente na entrega (e a respirar devagar)
    const az = M.solAz + seg(s, 4.6, 5.6) * 0.4 + (reduz ? 0 : Math.sin(tempo / 5200) * 0.04);
    const sol = [-Math.cos(az) * M.N[0] + Math.sin(az) * M.W[0], -Math.cos(az) * M.N[1] + Math.sin(az) * M.W[1]];

    return {
      s,
      r0,
      tempo,
      camP,
      d,
      m,
      bp,
      levanta,
      poche,
      desce,
      inv,
      tinta,
      papel,
      T: rgba(tinta),
      cor: (a) => rgba(tinta, a),
      sol, // direção (horizontal) para o sol
      luzD: [-sol[0] * COTANGENTE, -sol[1] * COTANGENTE], // desvio da sombra por metro de altura
      nome: primeiroNome(),
      bolhasP: R ? 0 : seg(s, -0.75, 0.05),
      notasP: R ? seg(r0, -0.45, 0.2) * (1 - seg(r0, 0.85, 1.2)) : seg(s, -0.35, 0.3) * (1 - seg(s, 0.55, 0.95)),
      morph: R ? 1 : emInOut(seg(s, 0.45, 1.0)),
      guias: R ? seg(r0, 0.22, 0.45) * (1 - seg(r0, 0.6, 0.85)) : seg(s, 0.45, 0.85) * (1 - seg(s, 1.3, 1.6)),
      contorno: R ? seg(r0, 0.35, 0.75) : seg(s, 0.8, 1.35),
      firme: R ? seg(r0, 0.45, 0.72) : seg(s, 1.3, 1.6), // o esboço passa a traço rigoroso
      // só na reabilitação: levantamento do existente, legenda e demolições
      levant: R ? seg(r0, -0.7, 0.15) : 0,
      tramaExist: R ? seg(r0, -0.2, 0.35) : 0,
      marcas: R ? seg(r0, -0.1, 0.35) * (1 - seg(r0, 0.55, 0.85)) : 0,
      legenda: R ? seg(r0, 0.4, 0.7) * (1 - seg(r0, 1.45, 1.7)) : 0,
      tracejaDem: R ? seg(r0, 0.4, 0.6) : 0,
      someDem: R ? seg(r0, 0.95, 1.3) : 0,
      simbolos: seg(s, 1.5, 1.9),
      planoMob: seg(s, 1.65, 2.05) * (1 - seg(s, 2.5, 2.8)),
      cotasP: (R ? seg(r0, 1.15, 1.45) : seg(s, 1.5, 1.95)) * (1 - seg(s, 2.4, 2.65)),
      rotulos: seg(s, 1.7, 2.1) * (1 - seg(s, 2.55, 2.85)),
      fimObra: seg(s, 4.4, 4.55),
      moveis: seg(s, 4.6, 5.05),
      luz: seg(s, 4.75, 5.15),
      grua: R ? 0 : m * seg(bp, 0.02, 0.1) * (1 - seg(bp, 0.9, 1)),
      // reabilitação: escoramento das paredes a manter e demolição do anexo
      escora: R ? m * seg(bp, 0.02, 0.07) * (1 - seg(bp, 0.6, 0.7)) : 0,
      demolir: R ? emInOut(seg(bp, 0.07, 0.2)) : 1,
      // na entrega o plano de corte desce a 1,20 m e a cobertura levanta
      corte: lerp(ALTURA, 1.2, levanta),
      aCob: desce * (1 - levanta),
      afasta: M.piso1 ? emInOut(seg(s, 4.55, 5.0)) * EXPLODE : 0,
      // árvores, água e pérgula: em planta e no modelo; na obra, só no fim
      aExt: Math.max(poche, camP) * lerp(1, seg(bp, 0.86, 1), m),
      // altura (0–1) de cada parede nova durante a obra
      altObra: (p) => {
        if (m <= 0 || p.estado === 'manter') return 1;
        const inicio = (R ? 0.22 : 0.16) + p.ordem * (R ? 0.3 : 0.34);
        return lerp(1, emOut(seg(bp, inicio, inicio + 0.16)), m);
      },
    };
  }

  // ---------- Desenho de um quadro ----------
  function desenhar(sReal, tempo) {
    const f = fases(sReal, tempo);
    g.f = f;
    if (Math.abs(f.d - dAnterior) > 0.002) {
      document.documentElement.style.setProperty('--d', f.d.toFixed(3));
      dAnterior = f.d;
    }

    // Câmara: planta → axonometria; na entrega continua a rodar devagar
    const area = areaPalco();
    const base = {
      a: lerp(0, M.rotacao ?? -0.62, f.camP) - seg(f.s, 4.5, 5.4) * 0.22,
      b: lerp(0, 0.98, f.camP),
      e: f.camP,
    };
    // em planta há margem para notas e cotas; em axonometria aperta-se
    const mg = lerp(1, 0.25, base.e);
    const [me, mt, md, mb] = M.margens.map((v) => v * mg);
    const pontos = [
      [-me, -mt, 0],
      [LARGURA + md, -mt, 0],
      [LARGURA + md, PROFUNDIDADE + mb, 0],
      [-me, PROFUNDIDADE + mb, 0],
    ];
    const topo = M.piso1 ? M.piso1.z + M.piso1.altura + f.afasta : ALTURA + 0.4;
    M.cantos.forEach(([x, y]) => pontos.push([x, y, topo]));
    if (f.grua > 0) {
      const { x, y, altura, lanca } = M.grua;
      [[x, y, altura + 1.8], [x + lanca, y, altura], [x - lanca, y, altura], [x, y + lanca, altura], [x, y - lanca, altura]].forEach((p) =>
        pontos.push([...p, f.grua]),
      );
    }
    cam.enquadrar(base, pontos, area);
    f.area = area;
    f.px = clamp(cam.c.s / 36, 0.7, 1.4); // espessura base dos traços

    ctx.setTransform(med.dpr, 0, 0, med.dpr, 0, 0);
    ctx.clearRect(0, 0, med.L, med.A);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    tr.novoQuadro();

    D.titulo();
    D.notas();
    D.levantamento();
    D.legenda();
    V.sombras();
    D.guias();
    D.bolhas();
    D.cotagem();
    V.laje();
    V.pavimento();
    D.mobiliaPlanta();
    D.rotulos();
    D.simbolos();
    D.esbocoParedes();
    V.obraAtras();
    V.volumes();
    V.obraFrente();
    D.etiquetasPisos();
    D.visitante();
    D.norte();
    D.escala();
    D.lapis();

    // Comunicação com o resto da página
    const passo = clamp(Math.round(f.r0), 0, passos.length - 1);
    if (passo !== passoAtual) {
      passoAtual = passo;
      aoPasso(passo);
    }
    const pct = Math.round(f.bp * 100);
    if (pct !== ultimoPct) {
      ultimoPct = pct;
      aoObra(f.bp);
    }
  }

  // ---------- Interação: visitar divisões com o cursor ----------
  function limparHover() {
    g.hover.sala = -1;
    dica?.classList.remove('visivel');
    aoLeitura?.(null);
  }

  function atualizarHover() {
    if (!rato) return;
    const p = cam.paraModelo(rato.x, rato.y);
    const Sp = R ? Sv + 1 : Sv;
    const pode = (R ? Sp > 1.4 : Sp > 0.9) && (Sp < 3.4 || Sp > 4.6);
    if (!p || !pode) {
      limparHover();
      return;
    }
    const [x, y] = p;
    aoLeitura?.(`x ${num(x)} m · y ${num(y)} m`);
    const i = divisoes.findIndex((dv) => x >= dv.r[0] && x <= dv.r[2] && y >= dv.r[1] && y <= dv.r[3]);
    g.hover.sala = i;
    if (i >= 0 && dica) {
      const dv = divisoes[i];
      dica.innerHTML = `<strong>${dv.nome}</strong>${num(dv.area)} m² · ${num(dv.r[2] - dv.r[0])} × ${num(dv.r[3] - dv.r[1])} m`;
      dica.style.transform = `translate(${rato.x + 16}px, ${rato.y + 16}px)`;
      dica.classList.add('visivel');
    } else {
      dica?.classList.remove('visivel');
    }
  }

  tela.addEventListener('pointermove', (e) => {
    const r = tela.getBoundingClientRect();
    rato = { x: e.clientX - r.left, y: e.clientY - r.top };
    atualizarHover();
  });
  tela.addEventListener('pointerleave', () => {
    rato = null;
    limparHover();
  });

  // ---------- Ciclo ----------
  // Amortecimento dependente do tempo (igual a 60 Hz, 120 Hz ou com quebras)
  let tempoAnterior = 0;
  function quadro(tempo) {
    if (!ativo) return;
    const dt = tempoAnterior ? Math.min(tempo - tempoAnterior, 1000) : 16;
    tempoAnterior = tempo;
    S = calcularS();
    Sv = reduz ? S : Sv + (S - Sv) * (1 - Math.exp(-dt / 140));
    if (Math.abs(S - Sv) < 0.0005) Sv = S;
    desenhar(Sv, tempo);
    requestAnimationFrame(quadro);
  }

  // Redimensionar a tela apaga-a: volta sempre a desenhar logo a seguir
  function remedir() {
    medir();
    desenhar(Sv, performance.now());
  }

  medir();
  S = Sv = calcularS();
  window.addEventListener('resize', remedir);
  window.addEventListener('ama:tema', () => desenhar(Sv, performance.now()));
  // As fontes podem mudar a altura dos passos: volta a medir quando carregam
  document.fonts?.ready.then(remedir);
  window.addEventListener('load', remedir);

  new IntersectionObserver(
    ([entrada]) => {
      const estava = ativo;
      ativo = entrada.isIntersecting;
      if (ativo && !estava) {
        tempoAnterior = 0;
        requestAnimationFrame(quadro);
      }
      if (!ativo) {
        // fora do processo: garante papel claro
        document.documentElement.style.setProperty('--d', '0');
        dAnterior = 0;
      }
    },
    { rootMargin: '20% 0px' },
  ).observe(seccao);

  desenhar(Sv, 0);
  return { redesenhar: () => desenhar(Sv, performance.now()) };
}
