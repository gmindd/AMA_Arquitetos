// Folha de esboço do formulário: o visitante desenha à mão livre (lápis)
// ou com a régua, que endireita a linha (0°, 45°, 90° quando está perto)
// e mostra o comprimento em metros (malha de 25 px = 1 m, escala 1:100).
// Na submissão, o esboço é exportado em PNG e enviado como anexo.

const MALHA = 25; // px por metro na folha
const NEGRO = '#0a0a0a';
const OSSO = '#e6e4e0';

export function iniciarEsboco() {
  const raiz = document.querySelector('[data-esboco]');
  const tela = raiz?.querySelector('[data-esboco-tela]');
  if (!raiz || !tela?.getContext) return null;
  const ctx = tela.getContext('2d');
  const vazio = raiz.querySelector('[data-esboco-vazio]');
  const botoesFerramenta = [...raiz.querySelectorAll('[data-ferramenta]')];

  let tracos = []; // { tipo: 'lapis' | 'regua', pts: [[x, y], ...] } em px CSS
  let atual = null;
  let ferramenta = 'lapis';
  let ativo = true;
  let L = 0;
  let A = 0;
  let dpr = 1;

  function medir() {
    const r = tela.getBoundingClientRect();
    const escalaX = L ? r.width / L : 1;
    const escalaY = A ? r.height / A : 1;
    // mantém o desenho ao redimensionar
    if (L && (escalaX !== 1 || escalaY !== 1)) {
      tracos.forEach((t) => (t.pts = t.pts.map(([x, y]) => [x * escalaX, y * escalaY])));
    }
    L = r.width;
    A = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    tela.width = Math.round(L * dpr);
    tela.height = Math.round(A * dpr);
    pintar();
  }

  // Comprimento em metros, à escala da malha
  const metros = (a, b, malha = MALHA) => (Math.hypot(b[0] - a[0], b[1] - a[1]) / malha).toFixed(2).replace('.', ',');

  // Régua: endireita para 0°, 45° ou 90° quando o ângulo está a menos de 7°
  function endireitar(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const ang = Math.atan2(dy, dx);
    const passo = Math.PI / 4;
    const alvo = Math.round(ang / passo) * passo;
    if (Math.abs(ang - alvo) > (7 * Math.PI) / 180) return b;
    const d = Math.hypot(dx, dy);
    return [a[0] + Math.cos(alvo) * d, a[1] + Math.sin(alvo) * d];
  }

  function desenharTraco(c, t, k = 1, malha = MALHA) {
    c.strokeStyle = NEGRO;
    c.fillStyle = NEGRO;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const pts = t.pts.map(([x, y]) => [x * k, y * k]);
    if (t.tipo === 'lapis') {
      c.lineWidth = 2 * k;
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      if (pts.length === 1) c.lineTo(pts[0][0] + 0.1, pts[0][1]);
      c.stroke();
      return;
    }
    // régua: linha com traços de cota nas pontas e o comprimento a meio
    const [a, b] = [pts[0], pts[pts.length - 1]];
    c.lineWidth = 2.4 * k;
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    c.lineWidth = 1.2 * k;
    [a, b].forEach(([x, y]) => {
      c.beginPath();
      c.moveTo(x - Math.cos(ang + Math.PI / 4) * 6 * k, y - Math.sin(ang + Math.PI / 4) * 6 * k);
      c.lineTo(x + Math.cos(ang + Math.PI / 4) * 6 * k, y + Math.sin(ang + Math.PI / 4) * 6 * k);
      c.stroke();
    });
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 30 * k) {
      c.save();
      c.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      let r = ang;
      if (r > Math.PI / 2 || r < -Math.PI / 2) r += Math.PI;
      c.rotate(r);
      c.font = `${11 * k}px ui-monospace, Menlo, Consolas, monospace`;
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.fillText(`${metros(a, b, malha * k)} m`, 0, -5 * k);
      c.restore();
    }
  }

  function pintar() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, L, A);
    tracos.forEach((t) => desenharTraco(ctx, t));
    if (atual) desenharTraco(ctx, atual);
    vazio?.classList.toggle('escondido', tracos.length > 0 || !!atual);
  }

  const ponto = (e) => {
    const r = tela.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  tela.addEventListener('pointerdown', (e) => {
    if (!ativo || e.button > 0) return;
    e.preventDefault();
    tela.setPointerCapture(e.pointerId);
    const p = ponto(e);
    atual = { tipo: ferramenta, pts: [p, p] };
    if (ferramenta === 'lapis') atual.pts = [p];
    pintar();
  });
  tela.addEventListener('pointermove', (e) => {
    if (!atual) return;
    const p = ponto(e);
    if (atual.tipo === 'lapis') atual.pts.push(p);
    else atual.pts[1] = e.shiftKey ? p : endireitar(atual.pts[0], p);
    pintar();
  });
  const fim = () => {
    if (!atual) return;
    const [a, b] = [atual.pts[0], atual.pts[atual.pts.length - 1]];
    if (atual.tipo === 'lapis' || Math.hypot(b[0] - a[0], b[1] - a[1]) > 3) tracos.push(atual);
    atual = null;
    pintar();
  };
  tela.addEventListener('pointerup', fim);
  tela.addEventListener('pointercancel', fim);

  botoesFerramenta.forEach((b) =>
    b.addEventListener('click', () => {
      ferramenta = b.dataset.ferramenta;
      botoesFerramenta.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    }),
  );
  raiz.querySelector('[data-acao="desfazer"]')?.addEventListener('click', () => {
    tracos.pop();
    pintar();
  });
  raiz.querySelector('[data-acao="limpar"]')?.addEventListener('click', () => {
    tracos = [];
    pintar();
  });

  new ResizeObserver(medir).observe(tela);
  medir();

  return {
    temDesenho: () => tracos.length > 0,
    bloquear: () => {
      ativo = false;
      raiz.classList.add('esboco--bloqueado');
    },
    // Exporta a folha em PNG: papel, malha, traços e legenda
    exportar(legenda) {
      if (!tracos.length) return Promise.resolve(null);
      const k = Math.max(2, 1600 / L);
      const c = document.createElement('canvas');
      const rodape = 46 * k;
      c.width = Math.round(L * k);
      c.height = Math.round(A * k + rodape);
      const g = c.getContext('2d');
      g.fillStyle = OSSO;
      g.fillRect(0, 0, c.width, c.height);
      g.strokeStyle = 'rgba(10,10,10,0.09)';
      g.lineWidth = 1;
      for (let x = 0; x <= L; x += MALHA) {
        g.beginPath();
        g.moveTo(x * k + 0.5, 0);
        g.lineTo(x * k + 0.5, A * k);
        g.stroke();
      }
      for (let y = 0; y <= A; y += MALHA) {
        g.beginPath();
        g.moveTo(0, y * k + 0.5);
        g.lineTo(c.width, y * k + 0.5);
        g.stroke();
      }
      tracos.forEach((t) => desenharTraco(g, t, k));
      // legenda (carimbo simples)
      g.fillStyle = NEGRO;
      g.fillRect(0, A * k, c.width, 1.5 * k);
      g.font = `700 ${13 * k}px Helvetica, Arial, sans-serif`;
      g.textBaseline = 'middle';
      g.fillText('AMA', 14 * k, A * k + rodape / 2);
      g.font = `${10.5 * k}px ui-monospace, Menlo, Consolas, monospace`;
      g.fillText(legenda.toUpperCase(), 64 * k, A * k + rodape / 2);
      return new Promise((r) => c.toBlob(r, 'image/png'));
    },
  };
}
