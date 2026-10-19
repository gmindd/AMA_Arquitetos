// Modelo da casa conceito, em metros. Planta de 14 × 9 m, piso único:
// quartos a norte, sala e cozinha a sul (luz), entrada a nascente.
// As paredes são geradas a partir de eixos com vãos; cada troço fica
// um paralelepípedo (planta retangular + cotas z0..z1).

export const ALTURA = 2.9;
export const LARGURA = 14;
export const PROFUNDIDADE = 9;
const EXT = 0.3;
const INT = 0.12;

// Divisões: retângulo [x0, y0, x1, y1]
export const divisoes = [
  { nome: 'Quarto', r: [0, 0, 4.2, 4] },
  { nome: 'Quarto', r: [4.2, 0, 8.2, 4] },
  { nome: 'Banho', r: [8.2, 0, 10.4, 4] },
  { nome: 'Suite', r: [10.4, 0, 14, 4] },
  { nome: 'Circulação', r: [0, 4, 14, 5.4], semBolha: true },
  { nome: 'Sala', r: [0, 5.4, 7, 9] },
  { nome: 'Cozinha', r: [7, 5.4, 10.4, 9] },
  { nome: 'Entrada', r: [10.4, 5.4, 14, 9] },
].map((d) => ({
  ...d,
  area: (d.r[2] - d.r[0]) * (d.r[3] - d.r[1]),
  cx: (d.r[0] + d.r[2]) / 2,
  cy: (d.r[1] + d.r[3]) / 2,
}));

// Posição solta das bolhas no diagrama inicial (antes de virarem divisões)
export const bolhas = [
  { i: 0, x: 2.4, y: 1.6 },
  { i: 1, x: 6.4, y: 1.2 },
  { i: 2, x: 9.4, y: 2.6 },
  { i: 3, x: 12.6, y: 1.8 },
  { i: 5, x: 3.2, y: 7.4 },
  { i: 6, x: 8.2, y: 7.8 },
  { i: 7, x: 12.4, y: 7.0 },
];

// Ligações do diagrama funcional (índices de divisões)
export const ligacoes = [
  [5, 6],
  [5, 7],
  [6, 7],
  [5, 0],
  [5, 1],
  [7, 3],
  [1, 2],
];

// Eixo de parede: (x1,y1)→(x2,y2), espessura, vãos {em, l, tipo, lado}
// em = distância ao início do eixo; tipo = janela | porta | vao
const eixos = [
  // Exteriores
  { a: [0, 0], b: [14, 0], e: EXT, ext: true, n: [0, -1], vaos: [
    { em: 1.3, l: 1.6, tipo: 'janela' },
    { em: 5.4, l: 1.6, tipo: 'janela' },
    { em: 8.9, l: 0.8, tipo: 'janela' },
    { em: 11.4, l: 1.8, tipo: 'janela' },
  ] },
  { a: [0, 9], b: [14, 9], e: EXT, ext: true, n: [0, 1], vaos: [
    { em: 0.8, l: 5, tipo: 'janela', grande: true },
    { em: 7.8, l: 1.8, tipo: 'janela' },
    { em: 11.6, l: 1.2, tipo: 'porta', lado: -1 },
  ] },
  { a: [0, 0], b: [0, 9], e: EXT, ext: true, n: [-1, 0], vaos: [
    { em: 1.2, l: 1.6, tipo: 'janela' },
    { em: 6.3, l: 1.8, tipo: 'janela' },
  ] },
  { a: [14, 0], b: [14, 9], e: EXT, ext: true, n: [1, 0], vaos: [
    { em: 1.1, l: 1.8, tipo: 'janela' },
    { em: 6.6, l: 1.2, tipo: 'janela' },
  ] },
  // Interiores
  { a: [0, 4], b: [14, 4], e: INT, vaos: [
    { em: 3.0, l: 0.9, tipo: 'porta', lado: -1 },
    { em: 4.5, l: 0.9, tipo: 'porta', lado: -1 },
    { em: 9.2, l: 0.8, tipo: 'porta', lado: -1 },
    { em: 10.7, l: 0.9, tipo: 'porta', lado: -1 },
  ] },
  { a: [4.2, 0], b: [4.2, 4], e: INT, vaos: [] },
  { a: [8.2, 0], b: [8.2, 4], e: INT, vaos: [] },
  { a: [10.4, 0], b: [10.4, 4], e: INT, vaos: [] },
  { a: [5.2, 5.4], b: [14, 5.4], e: INT, vaos: [
    { em: 2.4, l: 0.9, tipo: 'porta', lado: 1 },
    { em: 5.6, l: 2.8, tipo: 'vao' },
  ] },
  { a: [7, 5.4], b: [7, 9], e: INT, vaos: [{ em: 0.9, l: 1.8, tipo: 'vao' }] },
  { a: [10.4, 5.4], b: [10.4, 9], e: INT, vaos: [] },
];

// Converte um troço ao longo do eixo em retângulo de planta
function retangulo(eixo, t0, t1) {
  const [x1, y1] = eixo.a;
  const [x2, y2] = eixo.b;
  const h = y1 === y2;
  const m = eixo.e / 2;
  if (h) {
    const ext0 = eixo.ext && t0 === 0 ? m : 0;
    const ext1 = eixo.ext && t1 === x2 - x1 ? m : 0;
    return [x1 + t0 - ext0, y1 - m, x1 + t1 + ext1, y1 + m];
  }
  return [x1 - m, y1 + t0, x1 + m, y1 + t1];
}

export const paredes = []; // { r, z0, z1, ext, ordem }
export const vaos = []; // { tipo, r, h, eixo, lado, grande }

eixos.forEach((eixo, ie) => {
  const comp = Math.hypot(eixo.b[0] - eixo.a[0], eixo.b[1] - eixo.a[1]);
  let t = 0;
  const ordenados = [...eixo.vaos].sort((p, q) => p.em - q.em);
  for (const v of ordenados) {
    if (v.em > t) paredes.push({ r: retangulo(eixo, t, v.em), z0: 0, z1: ALTURA, ext: !!eixo.ext, eixo: ie });
    const r = retangulo(eixo, v.em, v.em + v.l);
    if (v.tipo === 'janela') {
      const peitoril = v.grande ? 0.1 : 0.9;
      paredes.push({ r, z0: 0, z1: peitoril, ext: true, eixo: ie, baixo: true });
      paredes.push({ r, z0: 2.2, z1: ALTURA, ext: true, eixo: ie });
      vaos.push({ tipo: 'janela', r, h: eixo.a[1] === eixo.b[1], z0: peitoril, z1: 2.2, grande: !!v.grande, n: eixo.n });
    } else {
      paredes.push({ r, z0: 2.1, z1: ALTURA, ext: !!eixo.ext, eixo: ie });
      vaos.push({ tipo: v.tipo, r, h: eixo.a[1] === eixo.b[1], lado: v.lado || 1, l: v.l });
    }
    t = v.em + v.l;
  }
  if (t < comp) paredes.push({ r: retangulo(eixo, t, comp), z0: 0, z1: ALTURA, ext: !!eixo.ext, eixo: ie });
});

// Ordem de construção: exteriores primeiro, de norte para sul
paredes.forEach((p, i) => {
  p.ordem = (p.ext ? 0 : 0.5) + (p.r[1] + p.r[3]) / 2 / PROFUNDIDADE * 0.5 + i * 0.0001;
});
const ordens = [...paredes].sort((a, b) => a.ordem - b.ordem);
ordens.forEach((p, k) => (p.ordem = k / (ordens.length - 1)));

// Mobiliário: [x0, y0, x1, y1, altura]
export const mobiliario = [
  // Quarto 1
  [1.3, 0.4, 2.9, 2.4, 0.5], [0.7, 0.4, 1.15, 0.85, 0.5], [3.05, 0.4, 3.5, 0.85, 0.5], [0.35, 3.25, 2.4, 3.85, 2.0],
  // Quarto 2
  [5.3, 0.4, 6.9, 2.4, 0.5], [7.25, 0.4, 8.05, 1.6, 0.75],
  // Banho
  [8.5, 0.35, 9.0, 0.95, 0.4], [9.5, 0.35, 10.2, 0.85, 0.85], [8.4, 2.6, 10.2, 3.8, 0.06],
  // Suite
  [11.4, 0.4, 13.2, 2.4, 0.5], [13.25, 2.6, 13.8, 3.85, 2.0],
  // Sala
  [0.5, 6.0, 1.4, 8.4, 0.8], [2.0, 6.7, 3.0, 7.7, 0.4], [4.4, 6.3, 6.2, 7.4, 0.75],
  [4.6, 5.85, 5.05, 6.2, 0.45], [5.6, 5.85, 6.05, 6.2, 0.45], [4.6, 7.5, 5.05, 7.85, 0.45], [5.6, 7.5, 6.05, 7.85, 0.45],
  // Cozinha
  [7.3, 8.1, 10.25, 8.75, 0.9], [9.6, 5.6, 10.25, 8.1, 0.9], [7.9, 6.3, 9.0, 7.3, 0.9],
  // Entrada
  [13.2, 5.9, 13.75, 6.5, 0.45],
];

// Manchas de sol no pavimento, a entrar pelos vãos a sul
export const sol = [
  [[0.8, 8.85], [5.8, 8.85], [5.0, 6.6], [0.35, 6.6]],
  [[7.8, 8.85], [9.6, 8.85], [9.0, 7.6], [7.4, 7.6]],
];

// Percurso do visitante: da rua até à sala
export const percurso = [
  [12.2, 10.6],
  [12.2, 8.6],
  [12.2, 4.7],
  [6.0, 4.7],
  [3.6, 7.2],
];

// Cotas: cadeia superior e totais
export const cotas = {
  parciais: [0, 4.2, 8.2, 10.4, 14],
  total: 14,
  lateral: 9,
};

// Volume construído, escada, coberturas e árvore (esta casa: um volume,
// cobertura plana, sem escada nem pátio)
export const pegadas = [[0, 0, LARGURA, PROFUNDIDADE]];
export const escada = [];
export const coberturas = [{ tipo: 'plana', r: [-0.3, -0.3, LARGURA + 0.3, PROFUNDIDADE + 0.3] }];
export const arvore = null;

// Desenho: margens das notas [esquerda, topo, direita, baixo], linha de
// corte, norte (0 = para cima), rotação da axonometria e lugar "em casa"
export const margens = [2.6, 1.9, 1.6, 2.9];
export const corteY = 7.2;
export const norte = 0;
export const rotacao = -0.62;
export const emCasa = [3.0, 7.6];

// Notas de programa do passo 01
export const notas = [
  { tipo: 'sol', x: 3.5, y: 11.2 },
  { tipo: 'texto', x: 4.4, y: 11.2, t: 'luz a sul na sala', alinha: 'left' },
  { tipo: 'linha', pts: [[3.5, 10.4], [3.5, 9.4]] },
  { tipo: 'ondas', x: -1.2, y: 5.6 },
  { tipo: 'texto', x: -2.4, y: 5.1, t: 'mar a poente', alinha: 'left' },
  { tipo: 'linha', pts: [[0.4, -0.5], [0.4, -0.8], [13.6, -0.8], [13.6, -0.5]] },
  { tipo: 'texto', x: 7, y: -1.35, t: 'quartos a norte, em sossego' },
];
