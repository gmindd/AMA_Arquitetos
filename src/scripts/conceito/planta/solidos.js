// Sólidos da axonometria: caixas (paredes, lajes, móveis, vidros) e
// telhados de duas águas. Cada sólido devolve as faces viradas para o
// observador, já projetadas. A ordem de pintura é calculada entre sólidos
// (não entre faces): duas caixas que não se intersetam têm sempre um plano
// que as separa, e a que fica do lado do observador pinta-se depois.

export function criarSolidos(cam) {
  const P = cam.projetar;

  function caixa(r, z0, z1, estilo) {
    return { x0: r[0], y0: r[1], x1: r[2], y1: r[3], z0, z1, r, estilo };
  }

  // Lados visíveis e topo de uma caixa
  function facesCaixa(it) {
    const { x0, y0, x1, y1, z0, z1 } = it;
    const out = [];
    if (z1 - z0 > 0.001) {
      const lados = [
        [[0, 1], [x0, y1], [x1, y1]],
        [[0, -1], [x1, y0], [x0, y0]],
        [[1, 0], [x1, y1], [x1, y0]],
        [[-1, 0], [x0, y0], [x0, y1]],
      ];
      for (const [n, a, b] of lados) {
        if (!cam.ladoVisivel(n[0], n[1])) continue;
        out.push({
          lado: true,
          n,
          a,
          b,
          z0,
          z1,
          pts: [P(a[0], a[1], z0), P(b[0], b[1], z0), P(b[0], b[1], z1), P(a[0], a[1], z1)],
        });
      }
    }
    out.push({
      lado: false,
      n: [0, 0],
      r: it.r,
      z: z1,
      pts: [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)],
    });
    return out;
  }

  // Face plana qualquer (águas e empenas). Vértices por ordem anti-horária
  // vistos de fora; só entra se estiver virada para o observador.
  function facePlana(p3, linhas, out) {
    const e = cam.c.e;
    const q = p3.map(([x, y, z]) => [x, y, z * e]);
    const u = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]];
    const v = [q[2][0] - q[0][0], q[2][1] - q[0][1], q[2][2] - q[0][2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const V = cam.vistaExtrudida();
    if (n[0] * V[0] + n[1] * V[1] + n[2] * V[2] <= 1e-6) return;
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    out.push({
      lado: true,
      inclinada: true,
      n: [n[0] / len, n[1] / len],
      pts: p3.map((p) => P(p[0], p[1], p[2])),
      linhas: linhas.map(([a, b]) => [P(a[0], a[1], a[2]), P(b[0], b[1], b[2])]),
    });
  }

  // Telhado de duas águas com a cumeeira ao longo de x
  function duasAguas(t, zb, estilo) {
    const { x0, x1, y0, y1, subida } = t;
    const ym = t.cumeeira ?? (y0 + y1) / 2;
    const zt = zb + subida;
    return {
      x0,
      y0,
      x1,
      y1,
      z0: zb,
      z1: zt,
      estilo,
      faces() {
        const out = [];
        const juntas = (ya) => {
          const l = [];
          for (let x = x0 + 0.5; x < x1 - 0.2; x += 0.55) l.push([[x, ya, zb], [x, ym, zt]]);
          return l;
        };
        facePlana([[x0, y0, zb], [x1, y0, zb], [x1, ym, zt], [x0, ym, zt]], juntas(y0), out);
        facePlana([[x1, y1, zb], [x0, y1, zb], [x0, ym, zt], [x1, ym, zt]], juntas(y1), out);
        facePlana([[x0, y1, zb], [x0, y0, zb], [x0, ym, zt]], [], out);
        facePlana([[x1, y0, zb], [x1, y1, zb], [x1, ym, zt]], [], out);
        return out;
      },
    };
  }

  // Ordena os sólidos de trás para a frente. Para cada par procura um eixo
  // que os separe; se só um deles fica do lado do observador, esse vem
  // depois. Sem eixo (intersetam-se), decide o centro. Ordenação topológica,
  // com o mais distante primeiro entre os que estão livres.
  function ordenar(itens) {
    const n = itens.length;
    if (n < 2 || cam.c.e < 0.01) return itens;
    const V = cam.vista();
    const eixos = [
      ['x0', 'x1', V[0]],
      ['y0', 'y1', V[1]],
      ['z0', 'z1', V[2]],
    ].filter((e) => Math.abs(e[2]) > 1e-4);
    const EPS = 0.012;
    for (const it of itens) it.prof = cam.prof((it.x0 + it.x1) / 2, (it.y0 + it.y1) / 2, (it.z0 + it.z1) / 2);
    const grau = new Int32Array(n);
    const depois = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
      const A = itens[i];
      for (let j = i + 1; j < n; j++) {
        const B = itens[j];
        let aFrente = false;
        let bFrente = false;
        let separados = false;
        for (const [mn, mx, v] of eixos) {
          if (A[mx] <= B[mn] + EPS) {
            separados = true;
            if (v > 0) bFrente = true;
            else aFrente = true;
          } else if (B[mx] <= A[mn] + EPS) {
            separados = true;
            if (v > 0) aFrente = true;
            else bFrente = true;
          }
        }
        let aPrimeiro = null;
        if (!separados) aPrimeiro = A.prof <= B.prof;
        else if (bFrente && !aFrente) aPrimeiro = true;
        else if (aFrente && !bFrente) aPrimeiro = false;
        if (aPrimeiro === true) {
          depois[i].push(j);
          grau[j]++;
        } else if (aPrimeiro === false) {
          depois[j].push(i);
          grau[i]++;
        }
      }
    }
    const feito = new Uint8Array(n);
    const livres = [];
    for (let i = 0; i < n; i++) if (grau[i] === 0) livres.push(i);
    const out = [];
    while (out.length < n) {
      let k = -1;
      if (livres.length) {
        let m = 0;
        for (let q = 1; q < livres.length; q++) if (itens[livres[q]].prof < itens[livres[m]].prof) m = q;
        k = livres[m];
        livres[m] = livres[livres.length - 1];
        livres.pop();
      } else {
        // ciclo: avança com o mais distante dos que faltam
        for (let i = 0; i < n; i++) if (!feito[i] && (k < 0 || itens[i].prof < itens[k].prof)) k = i;
      }
      if (feito[k]) continue;
      feito[k] = 1;
      out.push(itens[k]);
      for (const j of depois[k]) if (--grau[j] === 0 && !feito[j]) livres.push(j);
    }
    return out;
  }

  return { caixa, facesCaixa, duasAguas, ordenar };
}
