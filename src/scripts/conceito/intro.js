// Intro: "André e Melissa Arquitetos" → AMA → logótipo do cabeçalho.
// Com o scroll, em três tempos:
//   1. as minúsculas correm para a esquerda, para trás das maiúsculas;
//   2. as maiúsculas alinham-se em AMA ao centro (em mobile, o nome
//      está empilhado e as letras juntam-se numa linha);
//   3. o AMA encolhe até ao canto e passa a ser o logótipo do cabeçalho.
// O destino de cada letra é medido no próprio logótipo (texto letra a
// letra), por isso a troca final é exata.

const clamp = (v) => Math.min(1, Math.max(0, v));
const seg = (v, a, b) => clamp((v - a) / (b - a));
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

export function iniciarIntro() {
  const seccao = document.querySelector('[data-intro]');
  const nome = document.querySelector('[data-intro-nome]');
  const logo = document.querySelector('[data-logo-ama]');
  if (!seccao || !nome || !logo) return;

  const raiz = document.documentElement;
  const palco = seccao.querySelector('.intro__palco');
  const palavras = [...nome.querySelectorAll('.intro__palavra')];
  const maiusculas = [...nome.querySelectorAll('.intro__maiuscula')];
  const restos = [...nome.querySelectorAll('.intro__resto')];
  const letrasLogo = [...logo.children];

  let base = []; // maiúsculas depois de recolher, relativas ao palco
  let fila = []; // AMA em linha, ao centro do ecrã, à escala da intro
  let destino = []; // letras do logótipo no cabeçalho (coordenadas do ecrã)
  let escala = 1; // tamanho do logótipo / tamanho da intro

  const caixa = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  };

  // Ajusta o corpo de letra para o nome ocupar a largura disponível
  function ajustarTamanho() {
    nome.style.setProperty('--p', '0');
    restos.forEach((r) => r.style.removeProperty('--w'));
    nome.style.fontSize = '100px';
    const empilhado = getComputedStyle(nome).flexDirection === 'column';
    const larguras = palavras.map((p) => p.getBoundingClientRect().width);
    const natural = empilhado ? Math.max(...larguras) : larguras.reduce((a, b) => a + b, 0);
    const disponivel = window.innerWidth * (empilhado ? 0.84 : 0.86);
    nome.style.fontSize = `${Math.min(empilhado ? 120 : 170, (100 * disponivel) / natural)}px`;
    restos.forEach((r) => r.style.setProperty('--w', `${r.firstElementChild.getBoundingClientRect().width}px`));
  }

  function medir() {
    ajustarTamanho();
    maiusculas.forEach((m) => (m.style.transform = ''));
    nome.style.setProperty('--p', '1');
    const p0 = caixa(palco);
    base = maiusculas.map((m) => {
      const c = caixa(m);
      return { ...c, x: c.x - p0.x, y: c.y - p0.y };
    });
    destino = letrasLogo.map(caixa);
    escala = destino[0].h / base[0].h;
    // A fila central reproduz o logótipo à escala da intro
    const k = 1 / escala;
    const x0 = Math.min(...destino.map((d) => d.x));
    const x1 = Math.max(...destino.map((d) => d.x + d.w));
    const y0 = destino[0].y;
    const largura = (x1 - x0) * k;
    const cx = p0.w / 2 - largura / 2;
    const cy = p0.h / 2 - base[0].h / 2;
    fila = destino.map((d) => ({ x: cx + (d.x - x0) * k, y: cy + (d.y - y0) * k }));
    atualizar();
  }

  function atualizar() {
    const alturaUtil = seccao.offsetHeight - window.innerHeight;
    const p = clamp(-seccao.getBoundingClientRect().top / alturaUtil);
    const a = suave(seg(p, 0.02, 0.4)); // recolher as minúsculas
    const b = suave(seg(p, 0.42, 0.6)); // AMA em linha ao centro
    const c = suave(seg(p, 0.62, 0.92)); // AMA para o cabeçalho

    nome.style.setProperty('--p', a.toFixed(4));
    seccao.classList.toggle('intro--a-andar', p > 0.01);

    const topoPalco = palco.getBoundingClientRect().top;
    maiusculas.forEach((m, i) => {
      if (b <= 0 && c <= 0) {
        m.style.transform = '';
        return;
      }
      const bx = base[i].x;
      const by = base[i].y + topoPalco;
      const fx = fila[i].x;
      const fy = fila[i].y + topoPalco;
      const x = lerp(lerp(bx, fx, b), destino[i].x, c);
      const y = lerp(lerp(by, fy, b), destino[i].y, c);
      const s = lerp(1, escala, c);
      m.style.transform = `translate(${(x - bx).toFixed(2)}px, ${(y - by).toFixed(2)}px) scale(${s.toFixed(4)})`;
    });

    raiz.classList.toggle('intro-fim', c >= 0.999);
  }

  let pendente = false;
  window.addEventListener(
    'scroll',
    () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(() => {
        pendente = false;
        atualizar();
      });
    },
    { passive: true },
  );
  window.addEventListener('resize', medir);
  document.fonts?.ready.then(medir);
  medir();
}
