// A planta viva: um único desenho em canvas que acompanha um percurso.
// O scroll define S, a "posição no percurso" (S = k quando o passo k
// está no centro do ecrã). Cada camada do desenho reage a um troço de S.
// Dois roteiros partilham o mesmo motor:
//   processo:     bolhas → esboço → planta → axonometria → obra → entrega
//   reabilitacao: levantamento → manter/demolir/construir → axonometria
//                 → obra (escorar, demolir, construir) → entrega
// A projeção é contínua: planta (vista de cima) e axonometria são a
// mesma câmara com rotação (a), inclinação (b) e extrusão (e) a variar.

import { primeiroNome } from './estado.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (v, a, b) => clamp((v - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const emOut = (t) => 1 - Math.pow(1 - t, 3);
const emInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const num = (v, casas = 2) => v.toFixed(casas).replace('.', ',');

const NEGRO = [10, 10, 10];
const OSSO = [230, 228, 224];
const BRANCO = [255, 255, 255];
const mistura = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// Fases da obra e o ponto (0–1 do progresso de obra) em que ficam feitas
export const FASES_OBRA = {
  processo: [0.04, 0.16, 0.5, 0.74, 0.86, 0.99],
  reabilitacao: [0.05, 0.2, 0.5, 0.74, 0.86, 0.99],
};

export function iniciarCasa({ seccao, tela, dica, passos, aoPasso, aoObra, aoLeitura, modelo, roteiro = 'processo' }) {
  const {
    divisoes, bolhas = [], ligacoes = [], paredes, vaos, mobiliario, sol, percurso, cotas,
    ALTURA, LARGURA, PROFUNDIDADE,
  } = modelo;
  const pegadas = modelo.pegadas || [[0, 0, LARGURA, PROFUNDIDADE]];
  const escada = modelo.escada || [];
  const coberturas = modelo.coberturas || [{ tipo: 'plana', r: [-0.3, -0.3, LARGURA + 0.3, PROFUNDIDADE + 0.3] }];
  const arvore = modelo.arvore || null;
  const demolicoes = modelo.demolicoes || [];
  const levantamento = modelo.levantamento || [];
  const notasModelo = modelo.notas || [];
  const margens = modelo.margens || [2.6, 1.9, 1.6, 2.9];
  const piso1 = modelo.piso1 || null;
  const EXPLODE = 2.8; // afastamento do piso 1 na axonometria explodida da entrega
  const R = roteiro === 'reabilitacao';
  // Cantos de cada volume construído
  const CANTOS = pegadas.flatMap(([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  // Grua: base junto ao topo norte do lote (só no processo)
  const GRUA = { x: LARGURA + 2.3, y: -1.4, altura: 9, lanca: 11 };

  const ctx = tela.getContext('2d');
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let L = 0; // largura CSS
  let A = 0; // altura CSS
  let dpr = 1;
  let centros = [];
  let S = -1;
  let Sv = -1;
  let ativo = false;
  let passoAtual = -1;
  let dAnterior = -1;
  let cam = { a: 0, b: 0, e: 0, s: 30, ox: 0, oy: 0 };
  let rato = null; // { x, y } em coordenadas da tela
  let salaHover = -1;
  let hoverA = 0;
  let ultimoPct = -1;
  let limiteTexto = 0; // margem direita dos cartões de texto (desktop)

  // ---------- Medidas ----------
  function medir() {
    const r = tela.getBoundingClientRect();
    L = r.width;
    A = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    tela.width = Math.round(L * dpr);
    tela.height = Math.round(A * dpr);
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
    if (L > 900) return { x0: Math.max(L * 0.4, limiteTexto + 40), x1: L - 40, y0: 110, y1: A - 60 };
    return { x0: 18, x1: L - 18, y0: 116, y1: A * 0.5 };
  }

  // ---------- Projeção ----------
  const CX = LARGURA / 2;
  const CY = PROFUNDIDADE / 2;

  function projetar(x, y, z = 0, c = cam) {
    const X = x - CX;
    const Y = y - CY;
    const ca = Math.cos(c.a);
    const sa = Math.sin(c.a);
    const xr = X * ca - Y * sa;
    const yr = X * sa + Y * ca;
    return [c.ox + xr * c.s, c.oy + (yr * Math.cos(c.b) - z * c.e * Math.sin(c.b)) * c.s];
  }

  function profundidade(x, y, z) {
    const X = x - CX;
    const Y = y - CY;
    const yr = X * Math.sin(cam.a) + Y * Math.cos(cam.a);
    return yr * Math.sin(cam.b) + z * cam.e * Math.cos(cam.b);
  }

  // Inversa no plano do pavimento (z = 0): da tela para metros
  function paraModelo(sx, sy) {
    if (Math.cos(cam.b) < 0.2) return null;
    const xr = (sx - cam.ox) / cam.s;
    const yr = (sy - cam.oy) / (cam.s * Math.cos(cam.b));
    const ca = Math.cos(cam.a);
    const sa = Math.sin(cam.a);
    return [xr * ca + yr * sa + CX, -xr * sa + yr * ca + CY];
  }

  // Enquadra a caixa da casa (e da grua, quando existe) na área do palco
  function enquadrar(c, grua, afasta = 0) {
    const area = areaPalco();
    const pts = [];
    // Em planta há margem para notas e cotas; em axonometria aperta-se
    const mg = lerp(1, 0.25, c.e);
    const [me, mt, md, mb] = margens.map((v) => v * mg);
    const caixa = [[-me, -mt], [LARGURA + md, -mt], [LARGURA + md, PROFUNDIDADE + mb], [-me, PROFUNDIDADE + mb]];
    caixa.forEach(([x, y]) => pts.push([x, y, 0]));
    const topo = piso1 ? piso1.z + piso1.altura + afasta : ALTURA + 0.4;
    CANTOS.forEach(([x, y]) => pts.push([x, y, topo]));
    const base = { ...c, s: 1, ox: 0, oy: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y, z] of pts) {
      const [px, py] = projetar(x, y, z, base);
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
    if (grua > 0) {
      const { x: gx, y: gy, altura: ga, lanca: gl } = GRUA;
      for (const [x, y, z] of [[gx, gy, ga + 1.8], [gx + gl, gy, ga], [gx - gl, gy, ga], [gx, gy + gl, ga], [gx, gy - gl, ga]]) {
        const [px, py] = projetar(x, y, z, base);
        minX = lerp(minX, Math.min(minX, px), grua); maxX = lerp(maxX, Math.max(maxX, px), grua);
        minY = lerp(minY, Math.min(minY, py), grua); maxY = lerp(maxY, Math.max(maxY, py), grua);
      }
    }
    const w = area.x1 - area.x0;
    const h = area.y1 - area.y0;
    const s = Math.min(w / (maxX - minX), h / (maxY - minY));
    return {
      ...c,
      s,
      ox: (area.x0 + area.x1) / 2 - s * (minX + maxX) / 2,
      oy: (area.y0 + area.y1) / 2 - s * (minY + maxY) / 2,
    };
  }

  // ---------- Primitivas de desenho ----------
  function poligono(pts) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }

  function linha(p, q) {
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.stroke();
  }

  // Polilinha desenhada só até à fração f do comprimento total
  function polilinhaParcial(pts, f) {
    if (f <= 0) return;
    let total = 0;
    const segs = [];
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      segs.push(l);
      total += l;
    }
    let resto = total * f;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && resto > 0; i++) {
      const l = segs[i - 1];
      const t = Math.min(1, resto / l);
      ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t));
      resto -= l;
    }
    ctx.stroke();
  }

  function texto(t, x, y, { tam = 11, peso = 400, alinha = 'center', base = 'middle', italico = false, mono = false, cor } = {}) {
    ctx.font = `${italico ? 'italic ' : ''}${peso} ${tam}px ${mono ? 'ui-monospace, Menlo, Consolas, monospace' : '"Helvetica Neue", Helvetica, Arial, sans-serif'}`;
    ctx.textAlign = alinha;
    ctx.textBaseline = base;
    if (cor) ctx.fillStyle = cor;
    ctx.fillText(t, x, y);
  }

  // Pequena variação determinística para o traço "à mão" das bolhas
  const ruido = (i, k) => Math.sin(i * 12.9898 + k * 78.233) * 0.5;

  // ---------- Caixas (paredes, laje, cobertura, móveis) ----------
  // Devolve as faces visíveis de um paralelepípedo, já projetadas
  function faces(r, z0, z1, estilo, lista) {
    if (z1 - z0 <= 0.001 && estilo.topo !== 'poche') return;
    const [x0, y0, x1, y1] = r;
    const topo = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const lados = [
      { n: [0, 1], p: [[x0, y1], [x1, y1]] },
      { n: [0, -1], p: [[x1, y0], [x0, y0]] },
      { n: [1, 0], p: [[x1, y1], [x1, y0]] },
      { n: [-1, 0], p: [[x0, y0], [x0, y1]] },
    ];
    const sa = Math.sin(cam.a);
    const ca = Math.cos(cam.a);
    if (cam.b > 0.01 && cam.e > 0.01) {
      for (const lado of lados) {
        const nyr = lado.n[0] * sa + lado.n[1] * ca;
        if (nyr <= 0.0001) continue;
        const nxr = lado.n[0] * ca - lado.n[1] * sa;
        const [a, b] = lado.p;
        const pts = [projetar(a[0], a[1], z0), projetar(b[0], b[1], z0), projetar(b[0], b[1], z1), projetar(a[0], a[1], z1)];
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        lista.push({
          pts,
          prof: profundidade(mx, my, (z0 + z1) / 2) - 0.001,
          sombra: 0.05 + 0.13 * clamp(nxr),
          estilo,
          lado: true,
        });
      }
    }
    lista.push({
      pts: topo.map(([x, y]) => projetar(x, y, z1)),
      prof: profundidade((x0 + x1) / 2, (y0 + y1) / 2, z1),
      estilo,
      lado: false,
    });
  }

  // Face plana qualquer (ex.: águas e empenas do telhado). Os vértices vêm
  // por ordem anti-horária vistos de fora; só se desenha se estiver virada
  // para o observador. "linhas" são traços a desenhar sobre a face.
  function poliFace(p3, estilo, lista, linhas = []) {
    const q = p3.map(([x, y, z]) => [x, y, z * cam.e]);
    const u = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]];
    const v = [q[2][0] - q[0][0], q[2][1] - q[0][1], q[2][2] - q[0][2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const sa = Math.sin(cam.a);
    const ca = Math.cos(cam.a);
    const vista = n[0] * sa * Math.sin(cam.b) + n[1] * ca * Math.sin(cam.b) + n[2] * Math.cos(cam.b);
    if (vista <= 1e-6) return;
    const c = p3.reduce((acc, p) => [acc[0] + p[0] / p3.length, acc[1] + p[1] / p3.length, acc[2] + p[2] / p3.length], [0, 0, 0]);
    const len = Math.hypot(...n) || 1;
    lista.push({
      pts: p3.map((p) => projetar(...p)),
      prof: profundidade(...c),
      sombra: 0.04 + 0.14 * (1 - Math.abs(n[2]) / len) + (n[1] < 0 ? 0.06 : 0),
      estilo,
      lado: true,
      linhas: linhas.map(([a, b]) => [projetar(...a), projetar(...b)]),
    });
  }

  // Telhado de duas águas com cumeeira ao longo de x
  function duasAguas(t, zb, estilo, lista) {
    const { x0, x1, y0, y1, subida } = t;
    const ym = t.cumeeira ?? (y0 + y1) / 2;
    const zt = zb + subida;
    const juntas = (ya) => {
      const l = [];
      for (let x = x0 + 0.5; x < x1 - 0.2; x += 0.55) l.push([[x, ya, zb], [x, ym, zt]]);
      return l;
    };
    poliFace([[x0, y0, zb], [x1, y0, zb], [x1, ym, zt], [x0, ym, zt]], estilo, lista, juntas(y0));
    poliFace([[x1, y1, zb], [x0, y1, zb], [x0, ym, zt], [x1, ym, zt]], estilo, lista, juntas(y1));
    poliFace([[x0, y1, zb], [x0, y0, zb], [x0, ym, zt]], estilo, lista);
    poliFace([[x1, y0, zb], [x1, y1, zb], [x1, ym, zt]], estilo, lista);
  }

  // ---------- Desenho principal ----------
  function desenhar(sReal, tempo) {
    // Variáveis de fase. A reabilitação tem menos um passo no início: a
    // partir do projeto usa os mesmos tempos do processo, um passo antes.
    const r0 = sReal;
    const s = R ? sReal + 1 : sReal;
    const bolhasP = R ? 0 : seg(s, -0.75, 0.05);
    const notasP = R ? seg(r0, -0.45, 0.2) * (1 - seg(r0, 0.85, 1.2)) : seg(s, -0.35, 0.3) * (1 - seg(s, 0.55, 0.95));
    const morph = R ? 1 : emInOut(seg(s, 0.45, 1.0));
    const contorno = R ? seg(r0, 0.35, 0.75) : seg(s, 0.8, 1.35);
    // só na reabilitação: levantamento do existente, legenda e demolições
    const levant = R ? seg(r0, -0.7, 0.15) : 0;
    const tramaExist = R ? seg(r0, -0.2, 0.35) : 0;
    const marcas = R ? seg(r0, -0.1, 0.35) * (1 - seg(r0, 0.55, 0.85)) : 0;
    const legenda = R ? seg(r0, 0.4, 0.7) * (1 - seg(r0, 1.45, 1.7)) : 0;
    const tracejaDem = R ? seg(r0, 0.4, 0.6) : 0;
    const someDem = R ? seg(r0, 0.95, 1.3) : 0;
    const poche = seg(s, 1.4, 1.7);
    const simbolos = seg(s, 1.5, 1.9);
    const cotasP = R ? seg(r0, 1.15, 1.45) * (1 - seg(s, 2.4, 2.65)) : seg(s, 1.5, 1.95) * (1 - seg(s, 2.4, 2.65));
    const rotulos = seg(s, 1.7, 2.1) * (1 - seg(s, 2.55, 2.85));
    const camP = emInOut(seg(s, 2.45, 3.25));
    const d = seg(s, 3.45, 3.75) * (1 - seg(s, 4.4, 4.7));
    const m = seg(s, 3.42, 3.62); // passagem do modelo para a obra
    const bp = s >= 4.45 ? 1 : seg(s, 3.62, 4.45); // progresso da obra
    const fimObra = seg(s, 4.4, 4.55);
    const levanta = emInOut(seg(s, 4.55, 4.95));
    const moveis = seg(s, 4.6, 5.05);
    const luz = seg(s, 4.75, 5.15);
    const grua = R ? 0 : m * seg(bp, 0.02, 0.1) * (1 - seg(bp, 0.9, 1));
    // reabilitação: escoramento das paredes a manter e demolição do anexo
    const escora = R ? m * seg(bp, 0.02, 0.07) * (1 - seg(bp, 0.6, 0.7)) : 0;
    const demolir = R ? emInOut(seg(bp, 0.07, 0.2)) : 1;

    // Cores (papel e tinta trocam durante a obra)
    // Tema escuro troca papel e tinta; a obra inverte o tema (tema XOR d)
    const tema = document.documentElement.dataset.tema === 'escuro' ? 1 : 0;
    const inv = tema + d - 2 * tema * d;
    const tinta = mistura(NEGRO, OSSO, inv);
    const papel = mistura(OSSO, NEGRO, inv);
    if (Math.abs(d - dAnterior) > 0.002) {
      document.documentElement.style.setProperty('--d', d.toFixed(3));
      dAnterior = d;
    }

    // Câmara: planta → axonometria; na entrega continua a rodar devagar
    const orbita = seg(s, 4.5, 5.4) * 0.22;
    const afasta = piso1 ? emInOut(seg(s, 4.55, 5.0)) * EXPLODE : 0;
    cam = enquadrar({ a: lerp(0, modelo.rotacao ?? -0.62, camP) - orbita, b: lerp(0, 0.98, camP), e: camP }, grua, afasta);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, L, A);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const T = rgba(tinta);
    const cor = (a) => rgba(tinta, a);
    const area = areaPalco();
    const px = clamp(cam.s / 36, 0.7, 1.4); // espessura base dos traços

    // Título do desenho, no canto da área
    const nome = primeiroNome();
    const pct = Math.round(bp * 100);
    let titulo = 'Diagrama de espaços';
    if (s > 0.5) titulo = 'Esboço · estudo prévio';
    if (s > 1.5) titulo = R ? 'Planta de alterações · esc. 1:100' : 'Planta do piso 0 · esc. 1:100';
    if (R && r0 < 0.45) titulo = 'Levantamento do existente';
    if (s > 2.6) titulo = 'Axonometria';
    if (s > 3.5) titulo = `Obra · ${pct}%`;
    if (s > 4.55) titulo = 'Entrega';
    if (s > -0.6) {
      ctx.globalAlpha = R ? seg(r0, -0.6, -0.2) : seg(s, -0.6, -0.2);
      texto(`${R ? 'Caso real · reabilitação e ampliação' : nome ? `Casa ${nome}` : 'A sua casa'} · ${titulo}`.toUpperCase(), area.x0, area.y0 - 34, { tam: 10, alinha: 'left', mono: true, cor: T });
      ctx.fillStyle = T;
      ctx.fillRect(area.x0, area.y0 - 22, 28, 1);
      ctx.globalAlpha = 1;
    }

    // --- Notas de programa (passo 01) ---
    if (notasP > 0) {
      ctx.strokeStyle = cor(0.8);
      ctx.fillStyle = cor(0.85);
      ctx.lineWidth = px;
      ctx.globalAlpha = notasP;
      notasModelo.forEach((nt) => {
        if (nt.tipo === 'sol') {
          const c = projetar(nt.x, nt.y);
          const r = 0.42 * cam.s;
          ctx.beginPath();
          ctx.arc(c[0], c[1], r, 0, Math.PI * 2 * notasP);
          ctx.stroke();
          for (let k = 0; k < 8; k++) {
            const ang = (k / 8) * Math.PI * 2;
            linha([c[0] + Math.cos(ang) * r * 1.4, c[1] + Math.sin(ang) * r * 1.4], [c[0] + Math.cos(ang) * r * 1.9, c[1] + Math.sin(ang) * r * 1.9]);
          }
        } else if (nt.tipo === 'texto') {
          const c = projetar(nt.x, nt.y);
          texto(nt.t, c[0], c[1], { tam: 13, italico: true, alinha: nt.alinha || 'center' });
        } else if (nt.tipo === 'linha') {
          if (nt.tracejado) ctx.setLineDash([6, 6]);
          polilinhaParcial(nt.pts.map(([x, y]) => projetar(x, y)), notasP);
          ctx.setLineDash([]);
        } else if (nt.tipo === 'ondas') {
          for (let k = 0; k < 3; k++) {
            const pts = [];
            for (let j = 0; j <= 16; j++) pts.push(projetar(nt.x - k * 0.45 + Math.sin(j * 0.9 + k) * 0.12, nt.y + j * 0.22));
            polilinhaParcial(pts, notasP);
          }
        }
      });
      ctx.globalAlpha = 1;
    }

    // --- Reabilitação: levantamento do existente e demolições em planta ---
    if (R && camP === 0) {
      const contornar = (r, f) => {
        const [x0, y0, x1, y1] = r;
        polilinhaParcial([projetar(x0, y0), projetar(x1, y0), projetar(x1, y1), projetar(x0, y1), projetar(x0, y0)], f);
      };
      // paredes a demolir: cinzento no levantamento, depois tracejado e somem
      const aDem = levant * (1 - someDem);
      if (aDem > 0) {
        demolicoes.forEach((dm, i) => {
          const r = dm.slice(0, 4);
          ctx.fillStyle = rgba(mistura(papel, tinta, 0.4), tramaExist * (1 - tracejaDem) * aDem);
          poligono([projetar(r[0], r[1]), projetar(r[2], r[1]), projetar(r[2], r[3]), projetar(r[0], r[3])]);
          ctx.fill();
          ctx.strokeStyle = cor(0.85 * aDem);
          ctx.lineWidth = px * 0.8;
          if (tracejaDem > 0) ctx.setLineDash([4, 3]);
          contornar(r, clamp(levant * demolicoes.length * 0.4 - i * 0.4 + 0.4));
          ctx.setLineDash([]);
        });
      }
      // paredes a manter: contorno traçado no levantamento
      if (tramaExist < 1) {
        ctx.strokeStyle = T;
        ctx.lineWidth = px;
        paredes.filter((p) => p.estado === 'manter' && p.z0 === 0 && p.z1 >= 2).forEach((p, i, arr) => {
          contornar(p.r, clamp(levant * arr.length * 0.4 - i * 0.4 + 0.4));
        });
      }
      // marcas numeradas do levantamento, com a nota do lado da rua
      if (marcas > 0) {
        ctx.globalAlpha = marcas;
        ctx.strokeStyle = cor(0.8);
        ctx.lineWidth = px * 0.7;
        levantamento.forEach((lv) => {
          const p = projetar(lv.x, lv.y);
          const t = projetar(lv.tx, lv.ty ?? PROFUNDIDADE + 1.25);
          linha(p, [t[0], t[1] - 12]);
          ctx.fillStyle = T;
          ctx.beginPath();
          ctx.arc(p[0], p[1], 9, 0, Math.PI * 2);
          ctx.fill();
          texto(String(lv.n), p[0], p[1] + 0.5, { tam: 10, mono: true, peso: 700, cor: rgba(papel) });
          texto(`${lv.n} · ${lv.t}`, t[0], t[1], { tam: 12, italico: true, cor: T });
        });
        ctx.globalAlpha = 1;
      }
    }
    // Legenda das plantas de alterações: manter, demolir, construir
    if (legenda > 0) {
      ctx.globalAlpha = legenda;
      const x = area.x0;
      const y = area.y1 - 54;
      [['a manter', 'manter'], ['a demolir', 'demolir'], ['a construir', 'construir']].forEach(([t, k], i) => {
        const yy = y + i * 18;
        if (k === 'manter') {
          ctx.fillStyle = rgba(mistura(papel, tinta, 0.4));
          ctx.fillRect(x, yy - 5, 22, 10);
        } else if (k === 'construir') {
          ctx.fillStyle = T;
          ctx.fillRect(x, yy - 5, 22, 10);
        } else {
          ctx.strokeStyle = T;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(x + 0.5, yy - 4.5, 21, 9);
          ctx.setLineDash([]);
        }
        texto(t.toUpperCase(), x + 30, yy, { tam: 10, mono: true, alinha: 'left', cor: T });
      });
      ctx.globalAlpha = 1;
    }

    // --- Bolhas do programa e ligações ---
    const aBolhas = bolhasP * (1 - poche);
    if (aBolhas > 0) {
      const centrosB = bolhas.map((bl) => {
        const dv = divisoes[bl.i];
        return [lerp(bl.x, dv.cx, morph), lerp(bl.y, dv.cy, morph)];
      });
      ctx.lineWidth = px * 0.9;
      ctx.strokeStyle = cor(0.55 * aBolhas * (1 - morph));
      ctx.setLineDash([4, 5]);
      ligacoes.forEach(([i, j]) => {
        const bi = bolhas.findIndex((b) => b.i === i);
        const bj = bolhas.findIndex((b) => b.i === j);
        if (bi < 0 || bj < 0) return;
        polilinhaParcial([projetar(...centrosB[bi]), projetar(...centrosB[bj])], seg(bolhasP, 0.4, 1));
      });
      ctx.setLineDash([]);

      bolhas.forEach((bl, k) => {
        const dv = divisoes[bl.i];
        const r0 = Math.sqrt(dv.area / Math.PI) * 0.82;
        const w = lerp(2 * r0, dv.r[2] - dv.r[0], morph) * cam.s;
        const h = lerp(2 * r0, dv.r[3] - dv.r[1], morph) * cam.s;
        const raio = Math.min(lerp(r0 * cam.s, 0, morph), w / 2, h / 2);
        const [cx, cy] = projetar(...centrosB[k]);
        const pk = seg(bolhasP, k * 0.08, k * 0.08 + 0.45);
        for (let passe = 0; passe < 2; passe++) {
          const j = passe ? (1 - morph) * 2.2 : 0;
          ctx.strokeStyle = cor((passe ? 0.35 : 0.9) * aBolhas);
          ctx.lineWidth = px * (passe ? 0.7 : 1.1);
          ctx.beginPath();
          if (morph < 0.001) {
            ctx.ellipse(cx + ruido(k, passe) * j, cy + ruido(k + 3, passe) * j, raio + j, raio - j * 0.5, ruido(k, 7), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pk);
          } else {
            ctx.roundRect(cx - w / 2 + ruido(k, passe) * j, cy - h / 2 + ruido(k + 3, passe) * j, w, h, raio);
          }
          ctx.stroke();
        }
        const aRot = pk * (1 - seg(s, 1.55, 1.85));
        if (aRot > 0) {
          ctx.globalAlpha = aRot * aBolhas;
          texto(dv.nome.toLowerCase(), cx, cy, { tam: clamp(cam.s * 0.42, 11, 16), italico: true, cor: T });
          ctx.globalAlpha = 1;
        }
      });
    }

    // --- Cotas (passo 03) ---
    if (cotasP > 0) {
      ctx.strokeStyle = cor(0.75);
      ctx.fillStyle = T;
      ctx.lineWidth = px * 0.7;
      const yC = -0.9;
      const p0 = projetar(0, yC);
      const p1 = projetar(LARGURA, yC);
      polilinhaParcial([p0, p1], cotasP);
      cotas.parciais.forEach((x, i) => {
        const v = seg(cotasP, i * 0.12, i * 0.12 + 0.3);
        if (v <= 0) return;
        linha(projetar(x, -0.2), projetar(x, yC - 0.18 * v));
        const t = projetar(x, yC);
        linha([t[0] - 4, t[1] + 4], [t[0] + 4, t[1] - 4]);
        if (i > 0) {
          const xa = cotas.parciais[i - 1];
          const c = projetar((x + xa) / 2, yC - 0.28);
          texto(num((x - xa) * v), c[0], c[1], { tam: 10, mono: true, cor: T });
        }
      });
      const t2 = projetar(LARGURA / 2, -1.55);
      polilinhaParcial([projetar(0, -1.3), projetar(LARGURA, -1.3)], cotasP);
      texto(num(cotas.total * cotasP), t2[0], t2[1], { tam: 11, mono: true, peso: 700, cor: T });
      const q0 = projetar(-0.9, 0);
      const q1 = projetar(-0.9, PROFUNDIDADE);
      polilinhaParcial([q0, q1], cotasP);
      [0, PROFUNDIDADE].forEach((y) => {
        const t = projetar(-0.9, y);
        linha([t[0] - 4, t[1] + 4], [t[0] + 4, t[1] - 4]);
        linha(projetar(-0.2, y), projetar(-1.05, y));
      });
      const ql = projetar(-1.25, PROFUNDIDADE / 2);
      ctx.save();
      ctx.translate(ql[0], ql[1]);
      ctx.rotate(-Math.PI / 2);
      texto(num(cotas.lateral * cotasP), 0, 0, { tam: 11, mono: true, peso: 700, cor: T });
      ctx.restore();
      // Corte A-A'
      ctx.setLineDash([10, 4, 2, 4]);
      const yc = modelo.corteY ?? PROFUNDIDADE * 0.8;
      polilinhaParcial([projetar(-1.8, yc), projetar(LARGURA + 1.8, yc)], cotasP);
      ctx.setLineDash([]);
      if (cotasP > 0.6) {
        [[-2.1, yc, 'A'], [LARGURA + 2.1, yc, "A'"]].forEach(([x, y, l]) => {
          const p = projetar(x, y);
          ctx.beginPath();
          ctx.arc(p[0], p[1], 9, 0, Math.PI * 2);
          ctx.stroke();
          texto(l, p[0], p[1] + 0.5, { tam: 9, mono: true, peso: 700, cor: T });
        });
      }
    }

    // Pinta faces por ordem de profundidade (algoritmo do pintor)
    function pintarFaces(lista) {
      lista.sort((p, q) => p.prof - q.prof);
      for (const f of lista) {
        const st = f.estilo;
        const alfa = st.alfa ?? 1;
        if (f.lado) {
          ctx.fillStyle = rgba(mistura(papel, tinta, f.sombra), alfa);
          ctx.strokeStyle = cor(0.9 * alfa);
        } else if (st.tipo === 'parede') {
          // Topo cortado: poché negro (em planta e em axonometria seccionada)
          const preenche = st.recorte ? (camP > 0 ? 1 : st.preenche ?? poche) : 0.15;
          const corte = st.manter ? mistura(papel, tinta, 0.4) : tinta;
          ctx.fillStyle = rgba(st.recorte ? corte : mistura(papel, tinta, 0.15), preenche * alfa);
          ctx.strokeStyle = cor(alfa);
        } else if (st.tipo === 'movel') {
          ctx.fillStyle = rgba(mistura(papel, BRANCO, 0.7), alfa);
          ctx.strokeStyle = cor(0.85 * alfa);
        } else {
          ctx.fillStyle = rgba(st.tipo === 'laje' ? mistura(papel, tinta, 0.08) : papel, alfa);
          ctx.strokeStyle = cor(alfa);
        }
        ctx.lineWidth = px * (f.lado ? 0.7 : 0.9);
        poligono(f.pts);
        ctx.fill();
        ctx.stroke();
        if (f.linhas?.length) {
          ctx.lineWidth = px * 0.4;
          f.linhas.forEach(([a, b]) => linha(a, b));
        }
      }
    }

    // --- Laje de fundação: fica sempre por baixo de tudo ---
    if (camP > 0) {
      const laje = lerp(1, emOut(seg(bp, 0.04, 0.16)), m);
      const listaLaje = [];
      if (laje > 0) {
        pegadas.forEach(([x0, y0, x1, y1]) =>
          faces([x0 - 0.2, y0 - 0.2, x1 + 0.2, y1 + 0.2], -0.4, -0.4 + 0.4 * laje, { tipo: 'laje' }, listaLaje),
        );
      }
      pintarFaces(listaLaje);
    }

    // --- Pavimento, sol e divisão sob o cursor ---
    const aPav = Math.max(poche, camP);
    if (aPav > 0) {
      ctx.fillStyle = rgba(papel, aPav);
      pegadas.forEach(([x0, y0, x1, y1]) => {
        poligono([projetar(x0, y0), projetar(x1, y0), projetar(x1, y1), projetar(x0, y1)]);
        ctx.fill();
      });
      // Pátio a céu aberto: tracejado de jardim
      ctx.save();
      ctx.strokeStyle = cor(0.22 * aPav);
      ctx.lineWidth = px * 0.6;
      divisoes.filter((dv) => dv.exterior).forEach(({ r: [x0, y0, x1, y1] }) => {
        poligono([projetar(x0, y0), projetar(x1, y0), projetar(x1, y1), projetar(x0, y1)]);
        ctx.clip();
        for (let c = x0 + y0 - (y1 - y0); c < x1 + y1; c += 0.35) linha(projetar(c - y0, y0), projetar(c - y1, y1));
      });
      ctx.restore();
    }
    hoverA += ((salaHover >= 0 ? 1 : 0) - hoverA) * 0.2;
    if (salaHover >= 0 && hoverA > 0.01) {
      const r = divisoes[salaHover].r;
      ctx.fillStyle = rgba(d > 0.5 ? mistura(papel, BRANCO, 0.12) : BRANCO, 0.9 * hoverA);
      poligono([projetar(r[0], r[1]), projetar(r[2], r[1]), projetar(r[2], r[3]), projetar(r[0], r[3])]);
      ctx.fill();
    }
    if (luz > 0) {
      ctx.fillStyle = rgba(BRANCO, 0.95 * luz);
      sol.forEach((pol) => {
        poligono(pol.map(([x, y]) => projetar(x, y)));
        ctx.fill();
      });
    }

    // --- Rótulos das divisões ---
    if (rotulos > 0) {
      divisoes.forEach((dv, i) => {
        const v = seg(rotulos, i * 0.05, i * 0.05 + 0.5);
        if (v <= 0) return;
        const [x, y] = projetar(dv.cx, dv.cy);
        ctx.globalAlpha = v;
        // Corpo de letra que cabe na largura da divisão (mín. 7 px)
        const larguraSala = (dv.r[2] - dv.r[0]) * cam.s * 0.9;
        ctx.font = `700 12px ui-monospace, Menlo, Consolas, monospace`;
        const caber = (larguraSala / ctx.measureText(dv.nome.toUpperCase()).width) * 12;
        const t = Math.max(7, Math.min(clamp(cam.s * 0.3, 9, 12), caber));
        if (dv.semBolha) {
          texto(dv.nome.toUpperCase(), x, y, { tam: t * 0.85, mono: true, cor: cor(0.6) });
        } else {
          texto(dv.nome.toUpperCase(), x, y - t * 0.7, { tam: t, mono: true, peso: 700, cor: T });
          texto(`${num(dv.area)} m²`, x, y + t * 0.7, { tam: t * 0.9, mono: true, cor: cor(0.7) });
        }
        ctx.globalAlpha = 1;
      });
    }

    // --- Símbolos de vãos em planta (portas e janelas) ---
    const aSimb = simbolos * (1 - seg(camP, 0, 0.5));
    if (aSimb > 0) {
      ctx.strokeStyle = cor(aSimb);
      ctx.lineWidth = px * 0.8;
      // Escada em planta: degraus e seta no sentido da subida
      escada.forEach(([x0, y0, x1]) => linha(projetar(x0, y0), projetar(x1, y0)));
    }
    if (aSimb > 0 && escada.length) {
      const ex = (escada[0][0] + escada[0][2]) / 2;
      const ultimo = escada[escada.length - 1];
      const sobe = Math.sign(ultimo[1] - escada[0][1]) || 1;
      const yi = sobe > 0 ? escada[0][1] + 0.1 : escada[0][3] - 0.1;
      const yf = sobe > 0 ? ultimo[3] - 0.15 : ultimo[1] + 0.15;
      polilinhaParcial([projetar(ex, yi), projetar(ex, yf)], simbolos);
      const ponta = projetar(ex, yf);
      linha(ponta, projetar(ex - 0.15, yf - sobe * 0.25));
      linha(ponta, projetar(ex + 0.15, yf - sobe * 0.25));
    }
    if (aSimb > 0) {
      vaos.forEach((v) => {
        const [x0, y0, x1, y1] = v.r;
        if (v.tipo === 'janela') {
          poligono([projetar(x0, y0), projetar(x1, y0), projetar(x1, y1), projetar(x0, y1)]);
          ctx.stroke();
          if (v.h) linha(projetar(x0, (y0 + y1) / 2), projetar(x1, (y0 + y1) / 2));
          else linha(projetar((x0 + x1) / 2, y0), projetar((x0 + x1) / 2, y1));
        } else if (v.tipo === 'porta') {
          const l = v.l;
          const pts = [];
          if (v.h) {
            const yc = (y0 + y1) / 2;
            const dobr = [x0, yc];
            for (let k = 0; k <= 14; k++) {
              const ang = (k / 14) * (Math.PI / 2);
              pts.push(projetar(dobr[0] + Math.cos(ang) * l, dobr[1] + v.lado * Math.sin(ang) * l));
            }
            linha(projetar(dobr[0], dobr[1]), projetar(dobr[0], dobr[1] + v.lado * l));
          } else {
            const xc = (x0 + x1) / 2;
            const dobr = [xc, y0];
            for (let k = 0; k <= 14; k++) {
              const ang = (k / 14) * (Math.PI / 2);
              pts.push(projetar(dobr[0] + v.lado * Math.sin(ang) * l, dobr[1] + Math.cos(ang) * l));
            }
            linha(projetar(dobr[0], dobr[1]), projetar(dobr[0] + v.lado * l, dobr[1]));
          }
          ctx.setLineDash([3, 3]);
          polilinhaParcial(pts, simbolos);
          ctx.setLineDash([]);
        }
      });
    }

    // --- Esboço das paredes (contorno a ser traçado) ---
    const cheias = paredes.filter((p) => p.z0 === 0 && p.z1 >= 2);
    const novasCheias = cheias.filter((p) => p.estado !== 'manter');
    if (contorno > 0 && poche < 1 && camP === 0) {
      ctx.strokeStyle = T;
      ctx.lineWidth = px;
      novasCheias.forEach((p, i) => {
        const f = clamp(contorno * novasCheias.length * 0.35 - i * 0.35 + 0.35, 0, 1);
        if (f <= 0) return;
        const [x0, y0, x1, y1] = p.r;
        polilinhaParcial([projetar(x0, y0), projetar(x1, y0), projetar(x1, y1), projetar(x0, y1), projetar(x0, y0)], f);
      });
    }

    // --- Andaimes e grua (só em obra) ---
    const aAnd = m * seg(bp, 0.14, 0.24) * (1 - seg(bp, 0.84, 0.94));
    const hAnd = 0.8 + (ALTURA + 0.6) * seg(bp, 0.14, 0.62);
    const ladosAndaime = [
      { a: [-0.6, -0.6], b: [LARGURA + 0.6, -0.6], n: [0, -1] },
      { a: [LARGURA + 0.6, -0.6], b: [LARGURA + 0.6, PROFUNDIDADE + 0.6], n: [1, 0] },
      { a: [LARGURA + 0.6, PROFUNDIDADE + 0.6], b: [-0.6, PROFUNDIDADE + 0.6], n: [0, 1] },
      { a: [-0.6, PROFUNDIDADE + 0.6], b: [-0.6, -0.6], n: [-1, 0] },
    ];
    function andaimes(frente) {
      if (aAnd <= 0) return;
      ctx.strokeStyle = cor(0.55 * aAnd);
      ctx.lineWidth = px * 0.6;
      const sa = Math.sin(cam.a);
      const ca = Math.cos(cam.a);
      ladosAndaime.forEach((ld) => {
        const visivel = ld.n[0] * sa + ld.n[1] * ca > 0;
        if (visivel !== frente) return;
        const comp = Math.hypot(ld.b[0] - ld.a[0], ld.b[1] - ld.a[1]);
        const nP = Math.round(comp / 2);
        const ponto = (t) => [lerp(ld.a[0], ld.b[0], t), lerp(ld.a[1], ld.b[1], t)];
        for (let k = 0; k <= nP; k++) {
          const [x, y] = ponto(k / nP);
          linha(projetar(x, y, 0), projetar(x, y, hAnd));
          if (k < nP && k % 2 === 0) {
            const [x2, y2] = ponto((k + 1) / nP);
            linha(projetar(x, y, 0), projetar(x2, y2, Math.min(hAnd, 1.6)));
          }
        }
        for (let z = 1; z <= hAnd; z += 1.2) linha(projetar(...ld.a, z), projetar(...ld.b, z));
      });
    }
    andaimes(false);

    // Escoramento: escoras inclinadas contra as fachadas a manter
    if (escora > 0) {
      ctx.strokeStyle = cor(0.6 * escora);
      ctx.lineWidth = px * 0.7;
      paredes.filter((p) => p.estado === 'manter' && p.ext && p.z0 === 0 && p.z1 >= 2).forEach((p) => {
        const [x0, y0, x1, y1] = p.r;
        const h = x1 - x0 > y1 - y0;
        const comp = h ? x1 - x0 : y1 - y0;
        const nx = h ? 0 : x0 > LARGURA / 2 ? 1 : -1;
        const ny = h ? (y0 > PROFUNDIDADE / 2 ? 1 : -1) : 0;
        for (let t = 0.6; t < comp - 0.3; t += 1.6) {
          const bx = h ? x0 + t : nx > 0 ? x1 : x0;
          const by = h ? (ny > 0 ? y1 : y0) : y0 + t;
          linha(projetar(bx + nx * 1.6, by + ny * 1.6, 0), projetar(bx, by, 2.4));
          linha(projetar(bx + nx * 1.6, by + ny * 1.6, 0), projetar(bx + nx * 0.2, by + ny * 0.2, 0));
        }
      });
    }

    if (grua > 0) {
      ctx.strokeStyle = cor(0.7 * grua);
      ctx.lineWidth = px * 0.7;
      const bx = GRUA.x;
      const by = GRUA.y;
      const H = GRUA.altura;
      for (const dx of [-0.25, 0.25]) linha(projetar(bx + dx, by, 0), projetar(bx + dx, by, H * grua));
      for (let z = 0; z < H * grua - 0.6; z += 0.6) linha(projetar(bx - 0.25, by, z), projetar(bx + 0.25, by, z + 0.6));
      if (grua > 0.6) {
        const ang = -0.9 + bp * 2.6;
        const dir = [Math.cos(ang), Math.sin(ang)];
        const ponta = [bx + dir[0] * 11, by + dir[1] * 11];
        const contra = [bx - dir[0] * 3.5, by - dir[1] * 3.5];
        linha(projetar(contra[0], contra[1], H), projetar(ponta[0], ponta[1], H));
        linha(projetar(bx, by, H + 1.6), projetar(ponta[0], ponta[1], H));
        linha(projetar(bx, by, H + 1.6), projetar(contra[0], contra[1], H));
        linha(projetar(bx, by, H), projetar(bx, by, H + 1.6));
        const car = 4 + 5 * (0.5 + 0.5 * Math.sin(bp * 9));
        const cpos = [bx + dir[0] * car, by + dir[1] * car];
        const zc = 3.4 + Math.sin(bp * 14) * 0.8;
        linha(projetar(cpos[0], cpos[1], H), projetar(cpos[0], cpos[1], zc));
        ctx.fillStyle = cor(0.7 * grua);
        const pc = projetar(cpos[0], cpos[1], zc);
        ctx.fillRect(pc[0] - 4, pc[1], 8, 6);
        const pb = projetar(contra[0], contra[1], H);
        ctx.fillRect(pb[0] - 5, pb[1], 10, 8);
      }
    }

    // --- Projeto fantasma (a obra cresce dentro do desenho) ---
    const aFant = m * (1 - fimObra);
    if (aFant > 0 && camP > 0.5) {
      ctx.strokeStyle = cor(0.4 * aFant);
      ctx.lineWidth = px * 0.6;
      ctx.setLineDash([3, 4]);
      cheias.forEach((p) => {
        const [x0, y0, x1, y1] = p.r;
        poligono([projetar(x0, y0, ALTURA), projetar(x1, y0, ALTURA), projetar(x1, y1, ALTURA), projetar(x0, y1, ALTURA)]);
        ctx.stroke();
      });
      CANTOS.forEach(([x, y]) => linha(projetar(x, y, 0), projetar(x, y, ALTURA)));
      ctx.setLineDash([]);
    }

    // --- Volumes: laje, paredes, cobertura e móveis, por profundidade ---
    const lista = [];
    const altObra = (p) => {
      if (m <= 0 || p.estado === 'manter') return 1;
      const inicio = (R ? 0.22 : 0.16) + p.ordem * (R ? 0.3 : 0.34);
      const sobe = emOut(seg(bp, inicio, inicio + 0.16));
      return lerp(1, sobe, m);
    };
    // Na entrega o plano de corte desce: axonometria seccionada a 1,20 m,
    // para se ver o interior mobilado e a luz no pavimento
    const corte = lerp(ALTURA, 1.2, levanta);
    if (poche > 0 || camP > 0 || levant > 0) {
      paredes.forEach((p) => {
        const cheia = p.z0 === 0 && p.z1 >= 2;
        const manter = p.estado === 'manter';
        if (!cheia && camP <= 0) return;
        // em planta: existentes com a trama do levantamento, novas com o poché
        if (camP <= 0 && (manter ? tramaExist <= 0 : poche <= 0)) return;
        const topoMax = Math.min(ALTURA * altObra(p), corte);
        if (topoMax <= p.z0 + 0.001) return;
        const z1 = Math.min(p.z1, topoMax);
        // Topo negro só onde a parede é cortada (o topo pleno ou o plano de corte)
        const recorte = (z1 >= ALTURA - 0.001) || (corte < p.z1 && z1 >= corte - 0.001);
        faces(p.r, p.z0, z1, { tipo: 'parede', alfa: cheia ? 1 : seg(camP, 0, 0.35), recorte, manter, preenche: manter ? tramaExist : poche }, lista);
      });
    }
    // Reabilitação: a construção anexa existe no início da obra e é demolida
    if (R && m > 0 && demolir < 1) {
      demolicoes.forEach(([x0, y0, x1, y1, h]) => {
        const z1 = Math.min(h * (1 - demolir), corte);
        if (z1 > 0.02) faces([x0, y0, x1, y1], 0, z1, { tipo: 'parede', alfa: m * (1 - demolir * 0.6), recorte: true, manter: true, preenche: 1 }, lista);
      });
    }
    const desce = m > 0 ? emOut(R && piso1 ? seg(bp, 0.76, 0.86) : seg(bp, 0.62, 0.74)) : 0;
    const aCob = desce * (1 - levanta);
    if (aCob > 0.01) {
      const zc = ALTURA + (1 - desce) * 6 + levanta * 7;
      coberturas.forEach((c) => {
        if (c.tipo === 'duas-aguas') duasAguas(c, zc, { tipo: 'cobertura', alfa: aCob }, lista);
        else faces(c.r, zc, zc + 0.3, { tipo: 'cobertura', alfa: aCob }, lista);
      });
    }
    // Escada: os degraus sobem com a obra
    if (camP > 0) {
      const sobe = m > 0 ? lerp(1, emOut(seg(bp, 0.45, 0.6)), m) : 1;
      escada.forEach(([x0, y0, x1, y1, z]) => {
        if (z * sobe > 0.01) faces([x0, y0, x1, y1], 0, Math.min(z * sobe, corte), { tipo: 'movel', alfa: seg(camP, 0, 0.4) }, lista);
      });
    }
    if (piso1 && camP > 0) {
      const zP = piso1.z + afasta;
      const fLaje = m > 0 ? lerp(1, emOut(seg(bp, 0.62, 0.68)), m) : 1;
      const fPar = m > 0 ? lerp(1, emOut(seg(bp, 0.66, 0.76)), m) : 1;
      const aP = seg(camP, 0.3, 0.8);
      const corteP = lerp(piso1.altura, 1.2, levanta);
      if (fLaje > 0.01) {
        faces(piso1.laje, zP - 0.22 * fLaje, zP, { tipo: 'laje', alfa: aP * fLaje }, lista);
      }
      piso1.paredes.forEach((p) => {
        const z1 = Math.min(p.z1, piso1.altura * fPar, corteP);
        if (z1 <= p.z0 + 0.001) return;
        const recorte = z1 >= p.z1 - 0.001 || corteP < p.z1;
        faces(p.r, zP + p.z0, zP + z1, { tipo: 'parede', alfa: aP, recorte }, lista);
      });
      if (moveis > 0) {
        piso1.mobiliario.forEach((mv, i) => {
          const v = emOut(seg(moveis, 0.3 + (i / piso1.mobiliario.length) * 0.4, 0.7 + (i / piso1.mobiliario.length) * 0.3));
          if (v > 0) faces(mv.slice(0, 4), zP, zP + Math.min(mv[4], corteP) * v, { tipo: 'movel', alfa: v }, lista);
        });
      }
    }
    if (moveis > 0) {
      mobiliario.forEach((mv, i) => {
        const v = emOut(seg(moveis, (i / mobiliario.length) * 0.6, (i / mobiliario.length) * 0.6 + 0.4));
        if (v <= 0) return;
        faces(mv.slice(0, 4), 0, Math.min(mv[4], corte) * v, { tipo: 'movel', alfa: v }, lista);
      });
    }
    pintarFaces(lista);

    andaimes(true);

    if (piso1 && camP > 0) {
      const aEt = Math.max(seg(camP, 0.7, 1) * (1 - m), seg(levanta, 0.5, 1));
      if (aEt > 0) {
        // etiquetas na ponta poente, fora do volume
        const ym = (piso1.laje[1] + piso1.laje[3]) / 2;
        const p0 = projetar(-0.4, ym, piso1.z + afasta + 0.6);
        ctx.globalAlpha = aEt;
        texto('PISO 1 · SÓTÃO', p0[0] - 8, p0[1], { tam: 10, mono: true, peso: 700, alinha: 'right', cor: T });
        if (afasta > 0.5) {
          const p1 = projetar(-0.4, ym + 1.5, 0.6);
          texto('RÉS-DO-CHÃO', p1[0] - 8, p1[1], { tam: 10, mono: true, peso: 700, alinha: 'right', cor: T });
        }
        ctx.globalAlpha = 1;
      }
    }

    // Árvore do pátio: copa em planta; em axonometria, tronco e copa no ar
    const aArv = !arvore ? 0 : Math.max(poche, camP) * (1 - levanta * 0) * (m > 0 ? lerp(1, seg(bp, 0.86, 1), m) : 1);
    if (aArv > 0) {
      ctx.save();
      ctx.globalAlpha = aArv;
      ctx.strokeStyle = T;
      ctx.lineWidth = px * 0.8;
      const base = projetar(arvore.x, arvore.y, 0);
      const copa = projetar(arvore.x, arvore.y, cam.e > 0.05 ? arvore.h : 0);
      if (cam.e > 0.05) linha(base, copa);
      ctx.fillStyle = rgba(mistura(papel, BRANCO, 0.4), 0.85);
      ctx.beginPath();
      ctx.arc(copa[0], copa[1], arvore.r * cam.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(copa[0], copa[1], arvore.r * cam.s * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Caixilharia: a moldura dos vãos de janela em 3D
    const aCaix = camP > 0.3 ? (m > 0 ? lerp(seg(camP, 0.3, 1), seg(bp, 0.74, 0.86), m) : seg(camP, 0.3, 1)) : 0;
    if (aCaix > 0) {
      ctx.strokeStyle = cor(0.8 * aCaix);
      ctx.lineWidth = px * 0.6;
      const sa = Math.sin(cam.a);
      const ca = Math.cos(cam.a);
      vaos.forEach((v) => {
        if (v.tipo !== 'janela') return;
        const [x0, y0, x1, y1] = v.r;
        // só os vãos das fachadas viradas para o observador, na face exterior
        const n = v.n || [0, 1];
        if (n[0] * sa + n[1] * ca <= 0) return;
        const ym = v.h ? (n[1] > 0 ? y1 : y0) : (y0 + y1) / 2;
        const xm = v.h ? (x0 + x1) / 2 : n[0] > 0 ? x1 : x0;
        const p = v.h
          ? [[x0, ym, v.z0], [x1, ym, v.z0], [x1, ym, v.z1], [x0, ym, v.z1]]
          : [[xm, y0, v.z0], [xm, y1, v.z0], [xm, y1, v.z1], [xm, y0, v.z1]];
        poligono(p.map((q) => projetar(...q)));
        ctx.stroke();
        const meio = v.h ? [[(x0 + x1) / 2, ym, v.z0], [(x0 + x1) / 2, ym, v.z1]] : [[xm, (y0 + y1) / 2, v.z0], [xm, (y0 + y1) / 2, v.z1]];
        linha(projetar(...meio[0]), projetar(...meio[1]));
      });
    }

    // --- O visitante dentro do projeto ---
    const aV1 = seg(s, 1.2, 1.5) * (1 - seg(s, 3.35, 3.45));
    const aV2 = seg(s, 3.5, 3.62) * (1 - seg(s, 4.45, 4.55));
    const aV3 = seg(s, 4.6, 4.8);
    let pos = null;
    let rotulo = '';
    let aV = 0;
    if (aV1 > 0) {
      const anda = emInOut(seg(s, 2.0, 2.5));
      const total = percurso.length - 1;
      const k = Math.min(total - 1, Math.floor(anda * total));
      const t = anda * total - k;
      pos = [lerp(percurso[k][0], percurso[k + 1][0], t), lerp(percurso[k][1], percurso[k + 1][1], t)];
      rotulo = s < 2.0 ? 'Você está aqui' : nome || 'Você';
      aV = aV1;
    } else if (aV2 > 0) {
      pos = [LARGURA + 1.2, PROFUNDIDADE + 1.4];
      rotulo = 'Visita à obra';
      aV = aV2;
    } else if (aV3 > 0) {
      pos = modelo.emCasa || [LARGURA / 2, PROFUNDIDADE / 2];
      rotulo = R ? 'Em casa' : nome ? `${nome}, em casa` : 'Em casa';
      aV = aV3;
    }
    if (pos) {
      const chao = projetar(pos[0], pos[1], 0);
      const pulso = reduz ? 0.5 : (tempo / 1400) % 1;
      ctx.globalAlpha = aV;
      ctx.strokeStyle = cor(1 - pulso);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(chao[0], chao[1], 6 + pulso * 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = T;
      ctx.beginPath();
      ctx.arc(chao[0], chao[1], 4.5, 0, Math.PI * 2);
      ctx.fill();
      let topo = chao;
      if (cam.e > 0.05) {
        // figura à escala: 1,70 m
        const cabeca = projetar(pos[0], pos[1], 1.55);
        ctx.strokeStyle = T;
        ctx.lineWidth = 1.4;
        linha(chao, cabeca);
        ctx.beginPath();
        ctx.arc(cabeca[0], cabeca[1] - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        topo = [cabeca[0], cabeca[1] - 8];
      }
      ctx.font = '700 11px ui-monospace, Menlo, Consolas, monospace';
      const w = ctx.measureText(rotulo.toUpperCase()).width + 12;
      // A etiqueta vira para a esquerda quando não cabe à direita
      const esquerda = topo[0] + 12 + w > L - 10;
      const lx = esquerda ? topo[0] - 12 - w : topo[0] + 12;
      const ly = topo[1] - 14;
      ctx.strokeStyle = T;
      ctx.lineWidth = 0.8;
      linha([topo[0] + (esquerda ? -3 : 3), topo[1] - 3], [esquerda ? lx + w : lx, ly]);
      ctx.fillStyle = T;
      ctx.fillRect(lx, ly - 10, w, 20);
      texto(rotulo.toUpperCase(), lx + 6, ly, { tam: 11, peso: 700, alinha: 'left', mono: true, cor: rgba(papel) });
      ctx.globalAlpha = 1;
    }

    // --- Rosa dos ventos (norte) ---
    const aNorte = (R ? seg(r0, -0.3, 0.1) : seg(s, 1.6, 2.0)) * (1 - seg(s, 2.5, 2.8));
    if (aNorte > 0) {
      // o norte do projeto aponta para o topo do lote (+x)
      const c = [area.x1 - 34, area.y0 + 30];
      ctx.globalAlpha = aNorte;
      ctx.strokeStyle = T;
      ctx.fillStyle = T;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(c[0], c[1], 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.translate(c[0], c[1]);
      ctx.rotate((modelo.norte ?? 0) + cam.a);
      poligono([[0, -18], [6, 8], [0, 3], [-6, 8]]);
      ctx.fill();
      ctx.restore();
      texto('N', c[0] + 26, c[1] + 0.5, { tam: 10, mono: true, peso: 700, cor: T });
      ctx.globalAlpha = 1;
    }

    // --- Comunicação com o resto da página ---
    const passo = clamp(Math.round(r0), 0, passos.length - 1);
    if (passo !== passoAtual) {
      passoAtual = passo;
      aoPasso(passo);
    }
    if (pct !== ultimoPct) {
      ultimoPct = pct;
      aoObra(bp);
    }
  }

  // ---------- Interação: visitar divisões com o cursor ----------
  tela.addEventListener('pointermove', (e) => {
    const r = tela.getBoundingClientRect();
    rato = { x: e.clientX - r.left, y: e.clientY - r.top };
    atualizarHover();
  });
  tela.addEventListener('pointerleave', () => {
    rato = null;
    salaHover = -1;
    dica.classList.remove('visivel');
    aoLeitura(null);
  });

  function atualizarHover() {
    if (!rato) return;
    const p = paraModelo(rato.x, rato.y);
    const Sp = R ? Sv + 1 : Sv;
    const pode = (R ? Sp > 1.4 : Sp > 0.9) && (Sp < 3.4 || Sp > 4.6);
    if (!p || !pode) {
      salaHover = -1;
      dica.classList.remove('visivel');
      aoLeitura(null);
      return;
    }
    const [x, y] = p;
    aoLeitura(`x ${num(x)} m · y ${num(y)} m`);
    const i = divisoes.findIndex((dv) => x >= dv.r[0] && x <= dv.r[2] && y >= dv.r[1] && y <= dv.r[3]);
    salaHover = i;
    if (i >= 0) {
      const dv = divisoes[i];
      dica.innerHTML = `<strong>${dv.nome}</strong>${num(dv.area)} m² · ${num(dv.r[2] - dv.r[0])} × ${num(dv.r[3] - dv.r[1])} m`;
      dica.style.transform = `translate(${rato.x + 16}px, ${rato.y + 16}px)`;
      dica.classList.add('visivel');
    } else {
      dica.classList.remove('visivel');
    }
  }

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
