// Utilitários do motor da planta viva: curvas de tempo, cores, ruído
// determinístico (para o traço à mão não tremer de quadro para quadro)
// e fecho convexo (para as sombras).

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const seg = (v, a, b) => clamp((v - a) / (b - a));
export const lerp = (a, b, t) => a + (b - a) * t;
export const emOut = (t) => 1 - Math.pow(1 - t, 3);
export const emInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const num = (v, casas = 2) => v.toFixed(casas).replace('.', ',');

export const NEGRO = [10, 10, 10];
export const OSSO = [230, 228, 224];
export const BRANCO = [255, 255, 255];
export const mistura = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
export const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// Número pseudo-aleatório estável em [0, 1) a partir de um índice e semente
const frac = (x) => x - Math.floor(x);
export const acaso = (n, s = 0) => frac(Math.sin(n * 127.1 + s * 311.7) * 43758.5453);

// Ruído suave a uma dimensão, em [-1, 1]
export function ruido(t, s = 0) {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return lerp(acaso(i, s), acaso(i + 1, s), u) * 2 - 1;
}

// Fecho convexo (cadeia monótona de Andrew). Devolve os pontos por ordem.
export function fecho(pontos) {
  const p = [...pontos].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const vira = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const baixo = [];
  for (const q of p) {
    while (baixo.length >= 2 && vira(baixo[baixo.length - 2], baixo[baixo.length - 1], q) <= 0) baixo.pop();
    baixo.push(q);
  }
  const cima = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (cima.length >= 2 && vira(cima[cima.length - 2], cima[cima.length - 1], q) <= 0) cima.pop();
    cima.push(q);
  }
  cima.pop();
  baixo.pop();
  return baixo.concat(cima);
}
