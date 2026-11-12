// Primitivas de traço sobre um canvas 2D: linha rigorosa, linha parcial
// (para "desenhar" com o scroll), traço à mão (tremido, com as pontas a
// passar dos cantos, como num esboço a lápis), tramas e texto.
// Guarda a ponta do último traço em curso, para o lápis a acompanhar.

import { acaso, ruido, lerp } from './util.js';

const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

export function criarTraco(ctx, medidas) {
  let ponta = null;

  function poligono(pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i) ctx.lineTo(pts[i][0], pts[i][1]);
      else ctx.moveTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
  }

  function linha(p, q) {
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.stroke();
  }

  // Polilinha rigorosa desenhada só até à fração f do comprimento
  function parcial(pts, f, lapis = false) {
    if (f <= 0 || pts.length < 2) return;
    let total = 0;
    const comp = [];
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      comp.push(l);
      total += l;
    }
    let resto = total * Math.min(1, f);
    let fim = pts[0];
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && resto > 0; i++) {
      const l = comp[i - 1] || 1e-6;
      const t = Math.min(1, resto / l);
      fim = [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)];
      ctx.lineTo(fim[0], fim[1]);
      resto -= l;
    }
    ctx.stroke();
    if (lapis && f < 1) ponta = { x: fim[0], y: fim[1] };
  }

  // Traço à mão. pts em píxeis; f = fração desenhada; s = semente (estável
  // de quadro para quadro); tremor = amplitude do tremido; sobra = quanto
  // passa das pontas (px). Os vértices ficam vivos (cantos de um retângulo),
  // a não ser com suave: true, em que toda a linha é uma só curva.
  function mao(pts, { f = 1, s = 1, tremor = 1, sobra = 5, passo = 10, suave = false, lapis = true } = {}) {
    if (f <= 0 || pts.length < 2) return;
    let P = pts;
    if (sobra > 0) {
      const a = P[0];
      const b = P[1];
      const y = P[P.length - 1];
      const z = P[P.length - 2];
      const la = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const lz = Math.hypot(y[0] - z[0], y[1] - z[1]) || 1;
      const s0 = sobra * (0.4 + acaso(1, s));
      const s1 = sobra * (0.4 + acaso(2, s));
      P = [
        [a[0] - ((b[0] - a[0]) / la) * s0, a[1] - ((b[1] - a[1]) / la) * s0],
        ...P.slice(1, -1),
        [y[0] + ((y[0] - z[0]) / lz) * s1, y[1] + ((y[1] - z[1]) / lz) * s1],
      ];
    }
    let total = 0;
    const comp = [];
    for (let i = 1; i < P.length; i++) {
      const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      comp.push(l);
      total += l;
    }
    if (total < 0.5) return;
    const alvo = total * Math.min(1, f);
    const trocos = [];
    let atual = [];
    let acc = 0;
    for (let i = 1; i < P.length; i++) {
      const l = comp[i - 1];
      if (l < 0.01) continue;
      const dx = (P[i][0] - P[i - 1][0]) / l;
      const dy = (P[i][1] - P[i - 1][1]) / l;
      const n = Math.max(1, Math.ceil(l / passo));
      const continua = suave && atual.length > 0;
      if (!continua) {
        atual = [];
        trocos.push(atual);
      }
      let parar = false;
      for (let k = continua ? 1 : 0; k <= n; k++) {
        let d = (l * k) / n;
        if (acc + d >= alvo - 1e-6) {
          d = Math.max(0, alvo - acc);
          parar = true;
        }
        const w = tremor ? ruido((acc + d) / 23, s) * 1.15 * tremor : 0;
        atual.push([P[i - 1][0] + dx * d - dy * w, P[i - 1][1] + dy * d + dx * w]);
        if (parar) break;
      }
      acc += l;
      if (parar) break;
    }
    let u = null;
    ctx.beginPath();
    for (const t of trocos) {
      if (!t.length) continue;
      if (u) ctx.lineTo(t[0][0], t[0][1]);
      else ctx.moveTo(t[0][0], t[0][1]);
      for (let i = 1; i < t.length - 1; i++) {
        ctx.quadraticCurveTo(t[i][0], t[i][1], (t[i][0] + t[i + 1][0]) / 2, (t[i][1] + t[i + 1][1]) / 2);
      }
      u = t[t.length - 1];
      if (t.length > 1) ctx.lineTo(u[0], u[1]);
    }
    if (!u) return;
    ctx.stroke();
    if (lapis && f < 1) ponta = { x: u[0], y: u[1] };
  }

  // Trama de linhas paralelas dentro de um recorte. "construir" acrescenta
  // os polígonos do recorte ao caminho; ancora = ponto por onde passa uma
  // das linhas, para a trama acompanhar o desenho em vez de "nadar".
  function trama(construir, { ang = Math.PI / 4, esp = 6, ancora = [0, 0] } = {}) {
    const { L, A } = medidas();
    ctx.save();
    ctx.beginPath();
    construir();
    ctx.clip();
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const raio = Math.hypot(L, A);
    // distância da âncora ao centro, medida na perpendicular às linhas
    const d0 = (ancora[0] - L / 2) * -s + (ancora[1] - A / 2) * c;
    const fase = ((d0 % esp) + esp) % esp;
    ctx.beginPath();
    for (let d = -raio + fase - ((-raio) % esp); d <= raio; d += esp) {
      const cx = L / 2 - s * d;
      const cy = A / 2 + c * d;
      ctx.moveTo(cx - c * raio, cy - s * raio);
      ctx.lineTo(cx + c * raio, cy + s * raio);
    }
    ctx.stroke();
    ctx.restore();
  }

  function texto(t, x, y, { tam = 11, peso = 400, alinha = 'center', base = 'middle', italico = false, mono = false, cor } = {}) {
    ctx.font = `${italico ? 'italic ' : ''}${peso} ${tam}px ${mono ? MONO : SANS}`;
    ctx.textAlign = alinha;
    ctx.textBaseline = base;
    if (cor) ctx.fillStyle = cor;
    ctx.fillText(t, x, y);
  }

  return {
    poligono,
    linha,
    parcial,
    mao,
    trama,
    texto,
    novoQuadro() {
      ponta = null;
    },
    get ponta() {
      return ponta;
    },
  };
}
