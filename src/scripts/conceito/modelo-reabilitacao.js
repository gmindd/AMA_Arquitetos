// Caso real de reabilitação, em metros, simplificado a partir das peças
// desenhadas de um projeto da AMA (planta do rés-do-chão e planta de
// alterações, esc. 1:100). Mantêm-se as paredes de pedra da casa
// existente (bloco a nascente, onde ficam os quartos); a construção anexa
// é demolida e dá lugar a uma ampliação nova com hall, lavandaria, pátio
// interior e cozinha/sala em open space. O interior é todo redesenhado.
// Eixos: x ao longo do lote (norte = +x), y em profundidade (rua = +y).
// Paredes: estado 'manter' (existentes) ou novas (a construir).

export const ALTURA = 3.0; // pé-direito / altura das paredes
export const LARGURA = 20.66;
export const PROFUNDIDADE = 8.02;
const PEDRA = 0.45; // paredes antigas, em pedra
const NOVA = 0.3; // paredes exteriores da ampliação
const INT = 0.12;

// Pegada construída: casa existente + ampliação [x0, y0, x1, y1]
export const pegadas = [
  [0, 0, 12.25, 7.95],
  [12.1, 1.57, LARGURA, PROFUNDIDADE],
];

// Divisões: retângulo [x0, y0, x1, y1]
export const divisoes = [
  { nome: 'Lavandaria', r: [0.45, 0.45, 2.42, 2.57] },
  { nome: 'Hall', r: [2.42, 0.45, 4.85, 2.57] },
  { nome: 'Pátio', r: [0.45, 2.57, 4.8, 7.5], exterior: true },
  { nome: 'Cozinha e sala', r: [4.85, 0.45, 11.2, 7.5] },
  { nome: 'I.S.', r: [12.25, 1.87, 14.99, 3.52] },
  { nome: 'I.S.', r: [14.99, 1.87, 17.45, 3.52] },
  { nome: 'Arrumos', r: [17.45, 1.87, 20.36, 5.06] },
  { nome: 'Corredor', r: [12.25, 3.52, 17.45, 5.06], semBolha: true },
  { nome: 'Quarto', r: [12.25, 5.06, 16.85, 7.72] },
  { nome: 'Quarto', r: [16.85, 5.06, 20.36, 7.72] },
].map((d) => ({
  ...d,
  area: (d.r[2] - d.r[0]) * (d.r[3] - d.r[1]),
  cx: (d.r[0] + d.r[2]) / 2,
  cy: (d.r[1] + d.r[3]) / 2,
}));

// Posição solta das bolhas no diagrama inicial (antes de virarem divisões)
export const bolhas = [
  { i: 0, x: 1.2, y: 1.1 },
  { i: 1, x: 3.9, y: 1.0 },
  { i: 2, x: 2.3, y: 5.6 },
  { i: 3, x: 8.2, y: 4.3 },
  { i: 4, x: 13.4, y: 2.2 },
  { i: 5, x: 16.1, y: 2.9 },
  { i: 6, x: 19.3, y: 3.0 },
  { i: 8, x: 14.2, y: 6.6 },
  { i: 9, x: 18.9, y: 6.5 },
];

// Ligações do diagrama funcional (índices de divisões)
export const ligacoes = [
  [1, 0],
  [1, 2],
  [1, 3],
  [2, 3],
  [3, 8],
  [3, 9],
  [8, 4],
  [9, 5],
  [9, 6],
];

// Eixo de parede: (x1,y1)→(x2,y2), espessura e, vãos {em, l, tipo, lado}
// n = normal exterior da fachada (para saber que caixilhos se veem)
const eixos = [
  // Ampliação nova: paredes exteriores
  { a: [0, 0.22], b: [12.25, 0.22], e: PEDRA, ext: true, n: [0, -1], vaos: [
    { em: 0.8, l: 1.0, tipo: 'janela' },
    { em: 7.6, l: 1.6, tipo: 'janela' },
  ] },
  { a: [0, 7.72], b: [12.25, 7.72], e: PEDRA, ext: true, n: [0, 1], vaos: [
    { em: 3.2, l: 0.9, tipo: 'porta', lado: -1 },
    { em: 6.6, l: 1.4, tipo: 'janela' },
    { em: 9.3, l: 1.4, tipo: 'janela' },
  ] },
  { a: [0.22, 0], b: [0.22, 7.95], e: PEDRA, ext: true, n: [-1, 0], vaos: [] },
  // Casa existente: paredes de pedra a manter
  { a: [12.1, 1.72], b: [LARGURA, 1.72], e: NOVA, ext: true, n: [0, -1], estado: 'manter', vaos: [
    { em: 1.3, l: 0.6, tipo: 'janela' },
    { em: 3.9, l: 0.6, tipo: 'janela' },
    { em: 6.6, l: 1.0, tipo: 'janela' },
  ] },
  { a: [12.1, 7.87], b: [LARGURA, 7.87], e: NOVA, ext: true, n: [0, 1], estado: 'manter', vaos: [
    { em: 1.6, l: 1.6, tipo: 'janela' },
    { em: 6.1, l: 1.4, tipo: 'janela' },
  ] },
  { a: [20.51, 1.72], b: [20.51, 7.87], e: NOVA, ext: true, n: [1, 0], estado: 'manter', vaos: [
    { em: 2.0, l: 0.9, tipo: 'janela' },
  ] },
  // Empena da casa existente, a manter, com a passagem para o corredor
  { a: [12.1, 1.72], b: [12.1, 7.87], e: NOVA, estado: 'manter', vaos: [{ em: 2.4, l: 0.82, tipo: 'vao' }] },
  // Interiores da ampliação
  { a: [2.42, 0.45], b: [2.42, 2.57], e: INT, vaos: [{ em: 1.2, l: 0.8, tipo: 'porta', lado: 1 }] },
  { a: [0.45, 2.57], b: [4.85, 2.57], e: 0.2, vaos: [{ em: 2.75, l: 0.9, tipo: 'porta', lado: -1 }] },
  { a: [4.85, 0.45], b: [4.85, 2.57], e: 0.2, vaos: [{ em: 0.4, l: 0.9, tipo: 'porta', lado: 1 }] },
  // Envidraçado entre o pátio e a sala
  { a: [4.8, 2.57], b: [4.8, 7.5], e: 0.15, n: [-1, 0], vaos: [{ em: 0.25, l: 4.5, tipo: 'janela', grande: true }] },
  // Caixa de escada
  { a: [11.2, 0.45], b: [11.2, 7.5], e: INT, vaos: [{ em: 3.67, l: 0.82, tipo: 'vao' }] },
  // Interiores da casa existente (redesenhados)
  { a: [12.25, 3.52], b: [17.45, 3.52], e: INT, vaos: [
    { em: 0.9, l: 0.75, tipo: 'porta', lado: -1 },
    { em: 3.5, l: 0.75, tipo: 'porta', lado: -1 },
  ] },
  { a: [14.99, 1.87], b: [14.99, 3.52], e: INT, vaos: [] },
  { a: [17.45, 1.87], b: [17.45, 5.06], e: INT, vaos: [{ em: 2.05, l: 0.8, tipo: 'porta', lado: 1 }] },
  { a: [12.25, 5.06], b: [20.36, 5.06], e: INT, vaos: [
    { em: 3.1, l: 0.85, tipo: 'porta', lado: 1 },
    { em: 5.4, l: 0.85, tipo: 'porta', lado: 1 },
  ] },
  { a: [16.85, 5.06], b: [16.85, 7.72], e: INT, vaos: [] },
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
export const vaos = []; // { tipo, r, h, lado, grande, n }

eixos.forEach((eixo, ie) => {
  const comp = Math.hypot(eixo.b[0] - eixo.a[0], eixo.b[1] - eixo.a[1]);
  let t = 0;
  const ordenados = [...eixo.vaos].sort((p, q) => p.em - q.em);
  for (const v of ordenados) {
    if (v.em > t) paredes.push({ r: retangulo(eixo, t, v.em), z0: 0, z1: ALTURA, ext: !!eixo.ext, eixo: ie, estado: eixo.estado });
    const r = retangulo(eixo, v.em, v.em + v.l);
    if (v.tipo === 'janela') {
      const peitoril = v.grande ? 0.05 : 0.9;
      paredes.push({ r, z0: 0, z1: peitoril, ext: true, eixo: ie, baixo: true, estado: eixo.estado });
      paredes.push({ r, z0: 2.25, z1: ALTURA, ext: true, eixo: ie, estado: eixo.estado });
      vaos.push({ tipo: 'janela', r, h: eixo.a[1] === eixo.b[1], z0: peitoril, z1: 2.25, grande: !!v.grande, n: eixo.n });
    } else {
      paredes.push({ r, z0: 2.15, z1: ALTURA, ext: !!eixo.ext, eixo: ie, estado: eixo.estado });
      vaos.push({ tipo: v.tipo, r, h: eixo.a[1] === eixo.b[1], lado: v.lado || 1, l: v.l });
    }
    t = v.em + v.l;
  }
  if (t < comp - 1e-6) paredes.push({ r: retangulo(eixo, t, comp), z0: 0, z1: ALTURA, ext: !!eixo.ext, eixo: ie, estado: eixo.estado });
});

// Ordem de construção das paredes novas: exteriores primeiro, de poente
// para nascente (as paredes a manter já lá estão)
paredes.forEach((p, i) => {
  const cx = (p.r[0] + p.r[2]) / 2;
  p.ordem = (p.ext ? 0 : 0.5) + (cx / LARGURA) * 0.5 + i * 0.0001;
});
const ordens = [...paredes].sort((a, b) => a.ordem - b.ordem);
ordens.forEach((p, k) => (p.ordem = k / (ordens.length - 1)));

// Escada (caixa entre a casa e a ampliação): degraus [x0, y0, x1, y1, z]
export const escada = Array.from({ length: 11 }, (_, i) => [11.27, 4.1 - (i + 1) * 0.22, 12.03, 4.1 - i * 0.22, (i + 1) * 0.19]);

// Coberturas: duas águas (cumeeira ao longo do lote) e uma laje plana
export const coberturas = [
  { tipo: 'duas-aguas', x0: 4.6, x1: LARGURA + 0.15, y0: -0.2, y1: PROFUNDIDADE + 0.2, subida: 2.4 },
  { tipo: 'plana', r: [-0.1, -0.1, 4.85, 2.75] },
];

// Mobiliário: [x0, y0, x1, y1, altura]
export const mobiliario = [
  // Lavandaria
  [0.6, 0.6, 1.25, 1.2, 0.85], [1.35, 0.6, 2.0, 1.2, 0.85],
  // Hall: roupeiro
  [4.1, 1.7, 4.72, 2.45, 2.0],
  // Cozinha: bancada ao longo da fachada e ilha
  [6.6, 0.5, 11.1, 1.1, 0.9], [6.05, 2.78, 10.49, 3.68, 0.9],
  // Sala: mesa de jantar e cadeiras, sofá em L e móvel
  [5.9, 4.85, 7.0, 7.25, 0.75],
  [5.45, 5.0, 5.8, 5.4, 0.45], [5.45, 5.85, 5.8, 6.25, 0.45], [5.45, 6.7, 5.8, 7.1, 0.45],
  [7.1, 5.0, 7.45, 5.4, 0.45], [7.1, 5.85, 7.45, 6.25, 0.45], [7.1, 6.7, 7.45, 7.1, 0.45],
  [9.75, 4.6, 10.6, 7.35, 0.8], [8.1, 6.5, 9.75, 7.35, 0.8], [8.4, 5.1, 9.3, 5.9, 0.4],
  // Instalações sanitárias
  [12.45, 1.95, 12.95, 2.55, 0.4], [13.4, 1.95, 14.25, 2.4, 0.85], [13.95, 2.6, 14.9, 3.45, 0.06],
  [15.15, 1.95, 15.65, 2.55, 0.4], [16.25, 1.95, 17.1, 2.4, 0.85], [16.45, 2.6, 17.4, 3.45, 0.06],
  // Arrumos
  [17.6, 1.95, 20.3, 2.45, 2.0],
  // Quartos: camas e roupeiros
  [14.6, 5.4, 16.4, 7.4, 0.5], [12.3, 5.15, 12.9, 7.65, 2.0],
  [18.2, 5.3, 19.95, 7.3, 0.5], [16.95, 5.15, 17.5, 6.5, 2.0],
  // Pátio: lajetas do caminho e floreira
  [3.25, 2.78, 4.0, 3.42, 0.03], [3.25, 3.56, 4.0, 4.2, 0.03], [3.25, 4.34, 4.0, 4.98, 0.03],
  [3.25, 5.12, 4.0, 5.76, 0.03], [3.25, 5.9, 4.0, 6.54, 0.03], [3.25, 6.68, 4.0, 7.32, 0.03],
  [4.1, 2.75, 4.65, 7.45, 0.4],
];

// Árvore do pátio: centro, raio da copa e altura
export const arvore = { x: 1.55, y: 6.35, r: 0.9, h: 3.6 };

// Manchas de sol no pavimento: pelo envidraçado do pátio e pelos quartos
export const sol = [
  [[4.87, 3.1], [4.87, 7.2], [7.3, 6.5], [7.3, 3.7]],
  [[13.7, 7.7], [15.3, 7.7], [15.65, 6.5], [14.05, 6.5]],
  [[18.3, 7.7], [19.7, 7.7], [20.0, 6.6], [18.6, 6.6]],
];

// Percurso do visitante: da rua, pelo portão e pelo pátio, até à sala
export const percurso = [
  [3.65, 9.4],
  [3.65, 7.6],
  [3.65, 3.0],
  [3.65, 1.6],
  [5.5, 1.0],
  [7.4, 4.3],
  [8.7, 5.6],
];

// Cotas: cadeia superior e totais
export const cotas = {
  parciais: [0, 4.85, 12.1, 14.99, 17.45, LARGURA],
  total: LARGURA,
  lateral: PROFUNDIDADE,
};

// Construção anexa existente, a demolir: [x0, y0, x1, y1, altura]
export const demolicoes = [
  [3.6, 0.08, 11.4, 0.42, ALTURA],
  [3.7, 0.42, 4.02, 7.6, ALTURA],
  [4.02, 3.05, 11.4, 3.37, ALTURA],
  [11.22, 0.42, 11.54, 3.05, ALTURA],
  [9.6, 5.15, 12.0, 5.45, ALTURA],
  [0.35, 2.4, 0.65, 7.6, 2.2],
  [0.65, 7.42, 3.7, 7.72, 2.2],
  [14.35, 3.3, 14.5, 4.6, ALTURA],
  [15.5, 4.55, 17.0, 4.7, ALTURA],
];

// Levantamento: pontos assinalados no existente, com a nota na rua
export const levantamento = [
  { n: 1, x: 16.3, y: 7.87, tx: 16.9, ty: PROFUNDIDADE + 1.1, t: 'paredes de pedra, a manter' },
  { n: 2, x: 7.6, y: 3.2, tx: 7.6, ty: PROFUNDIDADE + 1.9, t: 'construção anexa, a demolir' },
  { n: 3, x: 2.0, y: 5.0, tx: 1.2, ty: PROFUNDIDADE + 1.1, t: 'logradouro' },
];

// Desenho: margens das notas [esquerda, topo, direita, baixo], linha de
// corte, norte (+x), rotação da axonometria e lugar "em casa"
export const margens = [4.4, 1.9, 1.4, 2.6];
export const corteY = 4.5;
export const norte = Math.PI / 2;
export const rotacao = -0.42;
export const emCasa = [8.6, 5.7];

// Notas do levantamento: o que existe e o que vai mudar
export const notas = [
  { tipo: 'linha', pts: [[12.25, -0.45 + 1.57], [12.25, -0.8 + 1.57], [LARGURA - 0.2, -0.8 + 1.57], [LARGURA - 0.2, -0.45 + 1.57]] },
  { tipo: 'texto', x: (12.25 + LARGURA) / 2, y: -1.35 + 1.57, t: 'casa existente' },
  { tipo: 'linha', pts: [[0.3, -0.45], [0.3, -0.8], [12.0, -0.8], [12.0, -0.45]] },
  { tipo: 'texto', x: 6.15, y: -1.35, t: 'construção anexa e logradouro' },
];
