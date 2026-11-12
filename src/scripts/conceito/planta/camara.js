// Câmara contínua: planta (vista de cima) e axonometria são a mesma
// projeção, com rotação (a), inclinação (b) e extrusão (e) a variar.
// x, y em metros no plano do pavimento; z = altura.

import { lerp } from './util.js';

export function criarCamara(LARGURA, PROFUNDIDADE) {
  const CX = LARGURA / 2;
  const CY = PROFUNDIDADE / 2;
  const c = { a: 0, b: 0, e: 0, s: 30, ox: 0, oy: 0 };
  let ca = 1;
  let sa = 0;
  let cb = 1;
  let sb = 0;

  function definir(n) {
    Object.assign(c, n);
    ca = Math.cos(c.a);
    sa = Math.sin(c.a);
    cb = Math.cos(c.b);
    sb = Math.sin(c.b);
  }

  function projetar(x, y, z = 0) {
    const X = x - CX;
    const Y = y - CY;
    return [c.ox + (X * ca - Y * sa) * c.s, c.oy + ((X * sa + Y * ca) * cb - z * c.e * sb) * c.s];
  }

  // Quanto maior, mais perto do observador
  function prof(x, y, z = 0) {
    return ((x - CX) * sa + (y - CY) * ca) * sb + z * c.e * cb;
  }

  // Inversa no plano do pavimento (z = 0): do ecrã para metros
  function paraModelo(sx, sy) {
    if (cb < 0.2) return null;
    const xr = (sx - c.ox) / c.s;
    const yr = (sy - c.oy) / (c.s * cb);
    return [xr * ca + yr * sa + CX, -xr * sa + yr * ca + CY];
  }

  // Direção do observador em coordenadas do modelo (gradiente de prof)
  const vista = () => [sa * sb, ca * sb, c.e * cb];
  // A mesma direção no espaço em que z já vem multiplicado pela extrusão
  const vistaExtrudida = () => [sa * sb, ca * sb, cb];

  // Uma face vertical com normal (nx, ny) está virada para o observador?
  const ladoVisivel = (nx, ny) => sb > 0.01 && c.e > 0.01 && nx * sa + ny * ca > 0.0001;

  // Ajusta escala e origem para os pontos [x, y, z, peso] caberem na área.
  // Os pontos com peso < 1 puxam o enquadramento só nessa proporção.
  function enquadrar(base, pontos, area) {
    definir({ ...base, s: 1, ox: 0, oy: 0 });
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const parciais = [];
    for (const p of pontos) {
      const w = p[3] ?? 1;
      if (w <= 0) continue;
      const q = projetar(p[0], p[1], p[2]);
      if (w < 1) {
        parciais.push([q, w]);
        continue;
      }
      minX = Math.min(minX, q[0]);
      maxX = Math.max(maxX, q[0]);
      minY = Math.min(minY, q[1]);
      maxY = Math.max(maxY, q[1]);
    }
    for (const [q, w] of parciais) {
      minX = lerp(minX, Math.min(minX, q[0]), w);
      maxX = lerp(maxX, Math.max(maxX, q[0]), w);
      minY = lerp(minY, Math.min(minY, q[1]), w);
      maxY = lerp(maxY, Math.max(maxY, q[1]), w);
    }
    const s = Math.min((area.x1 - area.x0) / (maxX - minX), (area.y1 - area.y0) / (maxY - minY));
    definir({
      s,
      ox: (area.x0 + area.x1) / 2 - (s * (minX + maxX)) / 2,
      oy: (area.y0 + area.y1) / 2 - (s * (minY + maxY)) / 2,
    });
  }

  return { c, definir, projetar, prof, paraModelo, vista, vistaExtrudida, ladoVisivel, enquadrar };
}
