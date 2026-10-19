// Intro: "André e Melissa Arquitetos" → AMA → logótipo do cabeçalho.
// É uma camada fixa por cima da página (com o scroll bloqueado):
//   · os três primeiros gestos de scroll recolhem as minúsculas para trás
//     das maiúsculas e revelam o lockup AMA / ANDRÉ MELISSA ARCHITECTS;
//   · o gesto seguinte lança a viagem: em meio segundo o AMA voa para o
//     canto superior esquerdo enquanto a página aparece em fade in.
// O destino de cada letra é medido no logótipo do cabeçalho (texto letra a
// letra), por isso a troca final é exata.

const clamp = (v) => Math.min(1, Math.max(0, v));
const seg = (v, a, b) => clamp((v - a) / (b - a));
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

const CURSO = 290; // deslocamento acumulado (px) para recolher: ~3 gestos de roda
const DURACAO_VIAGEM = 500;

export function iniciarIntro() {
  const raiz = document.documentElement;
  const camada = document.querySelector('[data-intro]');
  const nome = document.querySelector('[data-intro-nome]');
  const sub = document.querySelector('[data-intro-sub]');
  const logo = document.querySelector('[data-logo-ama]');
  window.__amaIntro = true;
  if (!camada || !nome || !logo || !raiz.classList.contains('intro-ativa')) {
    raiz.classList.remove('intro-ativa');
    return Promise.resolve();
  }

  let terminar;
  const terminada = new Promise((r) => (terminar = r));
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palavras = [...nome.querySelectorAll('.intro__palavra')];
  const maiusculas = [...nome.querySelectorAll('.intro__maiuscula')];
  const restos = [...nome.querySelectorAll('.intro__resto')];
  const letrasLogo = [...logo.children];

  let base = []; // maiúsculas depois de recolher (coordenadas do ecrã)
  let fila = []; // AMA em linha ao centro, à escala da intro
  let destino = []; // letras do logótipo no cabeçalho
  let escala = 1; // tamanho do logótipo / tamanho da intro
  let acumulado = 0;
  let q = 0; // progresso mostrado (amortecido)
  let cheioDesde = 0;
  let estado = 'recolher'; // recolher → viajar → fim
  let ultimo = 0;

  window.scrollTo(0, 0);

  const caixa = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  };

  // Corpo de letra para o nome ocupar a largura disponível
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
    base = maiusculas.map(caixa);
    destino = letrasLogo.map(caixa);
    escala = destino[0].h / base[0].h;
    const k = 1 / escala;
    const x0 = Math.min(...destino.map((d) => d.x));
    const x1 = Math.max(...destino.map((d) => d.x + d.w));
    const largura = (x1 - x0) * k;
    const h = base[0].h;
    // O lockup (AMA + subtítulo) fica centrado no ecrã
    const alturaLockup = h * 1.02;
    const cx = window.innerWidth / 2 - largura / 2;
    const cy = window.innerHeight / 2 - alturaLockup / 2;
    fila = destino.map((d) => ({ x: cx + (d.x - x0) * k, y: cy + (d.y - destino[0].y) * k }));
    if (sub) {
      // Linha de base real do AMA (varia com a fonte disponível)
      const sonda = document.createElement('span');
      sonda.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      maiusculas[0].appendChild(sonda);
      const linhaBase = sonda.getBoundingClientRect().top - base[0].y;
      sonda.remove();
      sub.style.fontSize = '20px';
      const w = sub.getBoundingClientRect().width;
      const tam = (20 * largura) / w;
      sub.style.fontSize = `${tam}px`;
      sub.style.left = `${cx}px`;
      sub.style.top = `${cy + linhaBase + h * 0.1}px`;
    }
    pintar(q);
  }

  // Desenha o estado de recolha (0 = nome inteiro, 1 = lockup AMA)
  function pintar(t) {
    const a = suave(seg(t, 0, 0.72)); // as minúsculas recolhem
    const b = suave(seg(t, 0.5, 0.95)); // as maiúsculas alinham-se ao centro
    const r = suave(seg(t, 0.72, 1)); // o subtítulo abre do centro
    nome.style.setProperty('--p', a.toFixed(4));
    if (sub) sub.style.setProperty('--r', r.toFixed(4));
    camada.classList.toggle('intro--a-andar', t > 0.02);
    maiusculas.forEach((m, i) => {
      if (b <= 0) return void (m.style.transform = '');
      const dx = (fila[i].x - base[i].x) * b;
      const dy = (fila[i].y - base[i].y) * b;
      m.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
    });
  }

  // Viagem final: fila → logótipo, com a página a aparecer ao mesmo tempo
  function viajar() {
    if (estado !== 'recolher') return;
    estado = 'viajar';
    q = 1;
    pintar(1);
    raiz.classList.add('intro-saida');
    terminar();
    const inicio = performance.now();
    const dur = reduz ? 1 : DURACAO_VIAGEM;
    const passo = (agora) => {
      const t = Math.min(1, (agora - inicio) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      maiusculas.forEach((m, i) => {
        const x = lerp(fila[i].x, destino[i].x, e);
        const y = lerp(fila[i].y, destino[i].y, e);
        const s = lerp(1, escala, e);
        m.style.transform = `translate(${(x - base[i].x).toFixed(2)}px, ${(y - base[i].y).toFixed(2)}px) scale(${s.toFixed(4)})`;
      });
      if (sub) sub.style.opacity = String(1 - Math.min(1, t * 2.2));
      if (t < 1) return requestAnimationFrame(passo);
      estado = 'fim';
      raiz.classList.remove('intro-ativa', 'intro-saida');
      soltar();
    };
    requestAnimationFrame(passo);
  }

  // ---------- Entrada: roda, toque e teclado ----------
  function avancar(delta) {
    if (estado !== 'recolher') return;
    const agora = performance.now();
    if (delta > 0 && acumulado >= CURSO && agora - cheioDesde > 140) return viajar();
    acumulado = Math.min(CURSO, Math.max(0, acumulado + delta));
    if (acumulado >= CURSO && !cheioDesde) cheioDesde = agora;
    if (acumulado < CURSO) cheioDesde = 0;
    if (!ultimo) requestAnimationFrame(ciclo);
  }

  function ciclo(agora) {
    const dt = ultimo ? Math.min(agora - ultimo, 100) : 16;
    ultimo = agora;
    const alvo = acumulado / CURSO;
    q = reduz ? alvo : q + (alvo - q) * (1 - Math.exp(-dt / 90));
    if (Math.abs(alvo - q) < 0.001) q = alvo;
    pintar(q);
    if (estado === 'recolher' && q !== alvo) requestAnimationFrame(ciclo);
    else ultimo = 0;
  }

  const roda = (e) => {
    e.preventDefault();
    const fator = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? window.innerHeight : 1;
    const d = Math.max(-110, Math.min(110, e.deltaY * fator));
    if (Math.abs(d) > 0.5) avancar(d);
  };
  let toqueY = null;
  const toqueInicio = (e) => (toqueY = e.touches[0].clientY);
  const toqueMove = (e) => {
    e.preventDefault();
    if (toqueY === null) return;
    const y = e.touches[0].clientY;
    const d = (toqueY - y) * 1.6;
    toqueY = y;
    if (acumulado >= CURSO && d > 0) {
      if (performance.now() - cheioDesde > 140 && cheioDesde) viajar();
      return;
    }
    avancar(d);
  };
  const toqueFim = () => {
    toqueY = null;
  };
  const teclas = (e) => {
    if (['ArrowDown', 'PageDown', ' ', 'Spacebar', 'Enter'].includes(e.key)) {
      e.preventDefault();
      if (acumulado >= CURSO) viajar();
      else avancar(CURSO / 3 + 1);
    } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
      e.preventDefault();
      avancar(-CURSO / 3);
    } else if (['End', 'Escape', 'Tab'].includes(e.key)) {
      viajar();
    }
  };

  window.addEventListener('wheel', roda, { passive: false });
  window.addEventListener('touchstart', toqueInicio, { passive: true });
  window.addEventListener('touchmove', toqueMove, { passive: false });
  window.addEventListener('touchend', toqueFim);
  window.addEventListener('keydown', teclas);
  camada.querySelector('[data-intro-saltar]')?.addEventListener('click', viajar);
  window.addEventListener('resize', medir);
  document.fonts?.ready.then(() => estado === 'recolher' && medir());

  function soltar() {
    window.removeEventListener('wheel', roda);
    window.removeEventListener('touchstart', toqueInicio);
    window.removeEventListener('touchmove', toqueMove);
    window.removeEventListener('touchend', toqueFim);
    window.removeEventListener('keydown', teclas);
    window.removeEventListener('resize', medir);
  }

  medir();
  return terminada;
}
