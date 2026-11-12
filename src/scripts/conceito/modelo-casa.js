// Modelo da casa conceito, em metros. Casa térrea em L, 16 × 12 m:
// a ala social (sala e cozinha) a norte, virada ao mar e ao pátio; a ala
// dos quartos a nascente; no ângulo, um pátio a sul e poente, abrigado da
// nortada, com deck, espelho de água, pérgula e uma árvore.
// Eixos: x de poente para nascente, y de norte para sul (norte em cima).
// As paredes são geradas a partir de eixos com vãos; cada troço fica
// um paralelepípedo (planta retangular + cotas z0..z1).

export const ALTURA = 2.9;
export const LARGURA = 16;
export const PROFUNDIDADE = 12;
const EXT = 0.3;
const INT = 0.12;

// Limites das alas
const XS = 6.6; // sala | cozinha
const XA = 10.6; // ala social | ala dos quartos
const XG = 12; // galeria | quartos
const YS = 5.2; // fachada sul da ala social
const YQ = [3.2, 6.4, 9.6]; // suite | quarto | quarto | entrada

// Divisões: retângulo [x0, y0, x1, y1]
export const divisoes = [
  { nome: 'Sala', r: [0, 0, XS, YS] },
  { nome: 'Cozinha', r: [XS, 0, XA, YS] },
  { nome: 'Suite', r: [XA, 0, LARGURA, YQ[0]] },
  { nome: 'Quarto', r: [XG, YQ[0], LARGURA, YQ[1]] },
  { nome: 'Quarto', r: [XG, YQ[1], LARGURA, YQ[2]] },
  { nome: 'Galeria', r: [XA, YQ[0], XG, YQ[2]], semBolha: true },
  { nome: 'Entrada', r: [XA, YQ[2], 13.2, PROFUNDIDADE] },
  { nome: 'I.S.', r: [13.2, YQ[2], LARGURA, PROFUNDIDADE] },
  { nome: 'Pátio', r: [0, YS, XA, PROFUNDIDADE], exterior: true, piso: 'deck', lx: 2.5, ly: 6.5 },
].map((d) => ({
  ...d,
  area: (d.r[2] - d.r[0]) * (d.r[3] - d.r[1]),
  cx: (d.r[0] + d.r[2]) / 2,
  cy: (d.r[1] + d.r[3]) / 2,
}));

// Posição solta das bolhas no diagrama inicial (antes de virarem divisões)
export const bolhas = [
  { i: 0, x: 2.9, y: 2.7 },
  { i: 1, x: 8.3, y: 1.9 },
  { i: 2, x: 13.7, y: 1.3 },
  { i: 3, x: 14.5, y: 5.0 },
  { i: 4, x: 13.3, y: 7.9 },
  { i: 6, x: 11.6, y: 10.9 },
  { i: 7, x: 14.9, y: 10.7 },
  { i: 8, x: 4.9, y: 8.9 },
];

// Ligações do diagrama funcional (índices de divisões)
export const ligacoes = [
  [0, 1],
  [0, 8],
  [1, 8],
  [6, 1],
  [6, 7],
  [6, 4],
  [4, 3],
  [3, 2],
];

// Eixo de parede: (x1,y1)→(x2,y2), espessura, vãos {em, l, tipo, lado}
// em = distância ao início do eixo; tipo = janela | porta | vao
// n = normal exterior da fachada (para o sol e para os vidros)
const eixos = [
  // Exteriores
  { a: [0, 0], b: [LARGURA, 0], e: EXT, ext: true, n: [0, -1], vaos: [
    { em: 1.5, l: 2.0, tipo: 'janela' },
    { em: 7.7, l: 1.8, tipo: 'janela' },
    { em: 12.4, l: 1.8, tipo: 'janela' },
  ] },
  { a: [0, 0], b: [0, YS], e: EXT, ext: true, n: [-1, 0], vaos: [
    { em: 1.1, l: 3.0, tipo: 'janela', grande: true },
  ] },
  { a: [0, YS], b: [XA, YS], e: EXT, ext: true, n: [0, 1], vaos: [
    { em: 0.7, l: 5.2, tipo: 'janela', grande: true },
    { em: 7.0, l: 3.1, tipo: 'janela', grande: true },
  ] },
  { a: [XA, YS], b: [XA, PROFUNDIDADE], e: EXT, ext: true, n: [-1, 0], vaos: [
    { em: 0.5, l: 3.4, tipo: 'janela', grande: true },
    { em: 5.0, l: 1.0, tipo: 'janela' },
  ] },
  { a: [XA, PROFUNDIDADE], b: [LARGURA, PROFUNDIDADE], e: EXT, ext: true, n: [0, 1], vaos: [
    { em: 0.7, l: 1.1, tipo: 'porta', lado: -1 },
    { em: 3.6, l: 0.8, tipo: 'janela' },
  ] },
  { a: [LARGURA, 0], b: [LARGURA, PROFUNDIDADE], e: EXT, ext: true, n: [1, 0], vaos: [
    { em: 0.9, l: 1.5, tipo: 'janela' },
    { em: 4.0, l: 1.6, tipo: 'janela' },
    { em: 7.2, l: 1.6, tipo: 'janela' },
  ] },
  // Interiores
  { a: [XS, 0], b: [XS, YS], e: INT, vaos: [{ em: 1.2, l: 3.6, tipo: 'vao' }] },
  { a: [XA, 0], b: [XA, YS], e: INT, vaos: [{ em: 3.5, l: 1.4, tipo: 'vao' }] },
  { a: [XA, YQ[0]], b: [LARGURA, YQ[0]], e: INT, vaos: [{ em: 0.3, l: 0.85, tipo: 'porta', lado: -1 }] },
  { a: [XG, YQ[0]], b: [XG, YQ[2]], e: INT, vaos: [
    { em: 0.5, l: 0.85, tipo: 'porta', lado: 1 },
    { em: 3.7, l: 0.85, tipo: 'porta', lado: 1 },
  ] },
  { a: [XG, YQ[1]], b: [LARGURA, YQ[1]], e: INT, vaos: [] },
  { a: [XA, YQ[2]], b: [LARGURA, YQ[2]], e: INT, vaos: [{ em: 0.2, l: 1.1, tipo: 'vao' }] },
  { a: [13.2, YQ[2]], b: [13.2, PROFUNDIDADE], e: INT, vaos: [{ em: 0.8, l: 0.8, tipo: 'porta', lado: 1 }] },
];

// Converte um troço ao longo do eixo em retângulo de planta
function retangulo(eixo, t0, t1) {
  const [x1, y1] = eixo.a;
  const [x2, y2] = eixo.b;
  const h = y1 === y2;
  const m = eixo.e / 2;
  if (h) {
    const ext0 = eixo.ext && t0 === 0 ? m : 0;
    const ext1 = eixo.ext && Math.abs(t1 - (x2 - x1)) < 1e-6 ? m : 0;
    return [x1 + t0 - ext0, y1 - m, x1 + t1 + ext1, y1 + m];
  }
  return [x1 - m, y1 + t0, x1 + m, y1 + t1];
}

export const paredes = []; // { r, z0, z1, ext, ordem }
export const vaos = []; // { tipo, r, h, lado, grande, n, z0, z1 }

eixos.forEach((eixo, ie) => {
  const comp = Math.hypot(eixo.b[0] - eixo.a[0], eixo.b[1] - eixo.a[1]);
  const h = eixo.a[1] === eixo.b[1];
  let t = 0;
  const ordenados = [...eixo.vaos].sort((p, q) => p.em - q.em);
  for (const v of ordenados) {
    if (v.em > t) paredes.push({ r: retangulo(eixo, t, v.em), z0: 0, z1: ALTURA, ext: !!eixo.ext, eixo: ie });
    const r = retangulo(eixo, v.em, v.em + v.l);
    if (v.tipo === 'janela') {
      const peitoril = v.grande ? 0.1 : 0.9;
      paredes.push({ r, z0: 0, z1: peitoril, ext: true, eixo: ie, baixo: true });
      paredes.push({ r, z0: 2.2, z1: ALTURA, ext: true, eixo: ie });
      vaos.push({ tipo: 'janela', r, h, z0: peitoril, z1: 2.2, grande: !!v.grande, n: eixo.n });
    } else {
      paredes.push({ r, z0: 2.1, z1: ALTURA, ext: !!eixo.ext, eixo: ie });
      vaos.push({ tipo: v.tipo, r, h, lado: v.lado || 1, l: v.l });
    }
    t = v.em + v.l;
  }
  if (t < comp - 1e-6) paredes.push({ r: retangulo(eixo, t, comp), z0: 0, z1: ALTURA, ext: !!eixo.ext, eixo: ie });
});

// Ordem de construção: exteriores primeiro, de norte para sul
paredes.forEach((p, i) => {
  p.ordem = (p.ext ? 0 : 0.5) + ((p.r[1] + p.r[3]) / 2 / PROFUNDIDADE) * 0.5 + i * 0.0001;
});
const ordens = [...paredes].sort((a, b) => a.ordem - b.ordem);
ordens.forEach((p, k) => (p.ordem = k / (ordens.length - 1)));

// Mobiliário: [x0, y0, x1, y1, altura]
export const mobiliario = [
  // Sala: sofá em L virado ao mar, mesa de centro, poltrona
  [2.9, 0.7, 3.8, 3.1, 0.75], [1.2, 0.7, 2.9, 1.55, 0.75], [1.5, 2.1, 2.5, 3.0, 0.35], [0.5, 3.5, 1.3, 4.3, 0.7],
  // Sala: mesa de jantar e cadeiras
  [4.7, 1.5, 5.8, 3.7, 0.75],
  [4.25, 1.75, 4.6, 2.1, 0.45], [4.25, 2.4, 4.6, 2.75, 0.45], [4.25, 3.05, 4.6, 3.4, 0.45],
  [5.9, 1.75, 6.25, 2.1, 0.45], [5.9, 2.4, 6.25, 2.75, 0.45], [5.9, 3.05, 6.25, 3.4, 0.45],
  // Cozinha: bancada, coluna de armários, ilha e bancos
  [6.9, 0.2, 10.4, 0.82, 0.9], [9.85, 0.82, 10.5, 3.1, 2.1], [7.5, 2.2, 9.2, 3.2, 0.9],
  [7.65, 3.35, 8.0, 3.7, 0.65], [8.2, 3.35, 8.55, 3.7, 0.65], [8.75, 3.35, 9.1, 3.7, 0.65],
  // Suite: roupeiro, cama, mesas de cabeceira, poltrona
  [10.75, 0.2, 11.3, 2.2, 2.1], [12.4, 0.25, 14.2, 2.3, 0.5], [11.95, 0.25, 12.3, 0.6, 0.45], [14.3, 0.25, 14.65, 0.6, 0.45],
  [15.0, 2.2, 15.75, 2.95, 0.7],
  // Quarto 1
  [13.5, 3.35, 15.1, 5.35, 0.5], [13.05, 3.35, 13.4, 3.7, 0.45], [15.2, 3.35, 15.55, 3.7, 0.45],
  [12.2, 5.75, 14.6, 6.3, 2.1], [14.9, 5.6, 15.8, 6.25, 0.75],
  // Quarto 2
  [13.5, 6.55, 15.1, 8.55, 0.5], [13.05, 6.55, 13.4, 6.9, 0.45], [15.2, 6.55, 15.55, 6.9, 0.45],
  [12.2, 8.95, 14.6, 9.5, 2.1], [14.9, 8.8, 15.8, 9.45, 0.75],
  // Galeria: estante baixa
  [11.62, 4.8, 11.92, 6.7, 1.1],
  // Entrada: banco e roupeiro
  [10.8, 10.3, 11.15, 11.2, 0.45], [12.55, 9.75, 13.1, 10.3, 2.1],
  // I.S.: lavatório, sanita, base de duche
  [13.9, 9.72, 14.9, 10.2, 0.85], [15.3, 9.8, 15.8, 10.4, 0.4], [14.9, 11.0, 15.85, 11.85, 0.06],
  // Pátio: mesa e bancos sob a pérgula, espreguiçadeiras junto à água
  [7.7, 5.95, 9.7, 6.85, 0.75], [7.7, 5.55, 9.7, 5.85, 0.45], [7.7, 6.95, 9.7, 7.25, 0.45],
  [4.4, 6.2, 5.1, 8.0, 0.3], [5.4, 6.2, 6.1, 8.0, 0.3],
];

// Percurso do visitante: da rua, pela entrada e pela galeria, até à sala
export const percurso = [
  [11.85, 13.6],
  [11.85, 11.9],
  [11.5, 10.4],
  [11.35, 9.2],
  [11.2, 4.6],
  [10.0, 4.3],
  [7.2, 4.3],
  [5.2, 4.4],
  [2.6, 3.9],
];

// Cotas: cadeias de cima e da esquerda, e totais
export const cotas = {
  parciais: [0, XS, XA, LARGURA],
  parciaisY: [0, YS, PROFUNDIDADE],
  total: LARGURA,
  lateral: PROFUNDIDADE,
};

// Volumes construídos (as duas alas), coberturas planas e exteriores
export const pegadas = [
  [0, 0, LARGURA, YS],
  [XA, YS, LARGURA, PROFUNDIDADE],
];
export const escada = [];
export const coberturas = [
  { tipo: 'plana', r: [-0.3, -0.3, LARGURA + 0.3, YS + 0.3] },
  { tipo: 'plana', r: [XA - 0.3, YS + 0.3, LARGURA + 0.3, PROFUNDIDADE + 0.3] },
];
export const arvores = [{ x: 1.8, y: 10.5, r: 1.25, h: 3.2 }];
export const agua = [4.2, 8.5, 9.6, 11.3];
export const pergola = { r: [6.9, 5.35, 10.45, 7.6], z: 2.5 };

// Desenho: margens das notas [esquerda, topo, direita, baixo], linha de
// corte, norte (0 = para cima), rotação da axonometria e lugar "em casa"
export const margens = [2.6, 1.9, 1.6, 2.9];
export const corteY = 2.6;
export const norte = 0;
export const rotacao = -0.62;
export const emCasa = [2.6, 3.9];

// Notas de programa do passo 01
export const notas = [
  { tipo: 'sol', x: 1.0, y: 13.4 },
  { tipo: 'texto', x: 1.9, y: 13.4, t: 'pátio a sul, cheio de luz', alinha: 'left' },
  { tipo: 'linha', pts: [[1.3, 12.8], [2.0, 11.9]] },
  { tipo: 'ondas', x: -1.3, y: 0.9 },
  { tipo: 'texto', x: -2.5, y: 0.35, t: 'mar a poente', alinha: 'left' },
  { tipo: 'seta', de: [4.4, -1.75], para: [4.4, -0.45] },
  { tipo: 'texto', x: 4.8, y: -1.2, t: 'abrigo da nortada', alinha: 'left' },
  { tipo: 'linha', pts: [[10.8, -0.5], [10.8, -0.8], [15.8, -0.8], [15.8, -0.5]] },
  { tipo: 'texto', x: 13.3, y: -1.35, t: 'quartos a nascente' },
];
