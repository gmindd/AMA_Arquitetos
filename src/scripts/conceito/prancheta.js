// Prancheta: réguas, mira do cursor e ligação ativa no menu.

const raiz = document.documentElement;
let leitor = null; // fornecedor de leitura (ex.: coordenadas na planta)

export function definirLeitura(texto) {
  leitor = texto;
}

export function iniciarPrancheta() {
  iniciarLockups();
  iniciarReguas();
  iniciarMira();
  iniciarMenu();
}

// ---------- Lockups AMA: subtítulo com a largura exata do AMA ----------
function iniciarLockups() {
  const lockups = [...document.querySelectorAll('[data-lockup]')];
  if (!lockups.length) return;
  const ajustar = () =>
    lockups.forEach((l) => {
      const ama = l.querySelector('.lockup__ama');
      const sub = l.querySelector('.lockup__sub');
      sub.style.fontSize = '10px';
      const w = sub.getBoundingClientRect().width;
      if (w > 0) sub.style.fontSize = `${(10 * ama.getBoundingClientRect().width) / w}px`;
    });
  ajustar();
  document.fonts?.ready.then(ajustar);
  window.addEventListener('resize', ajustar);
}

// ---------- Réguas ----------
function iniciarReguas() {
  const topo = document.querySelector('[data-regua="x"]');
  const lado = document.querySelector('[data-regua="y"]');
  if (!topo || !lado) return;

  const numerosTopo = () => {
    topo.querySelectorAll('.regua__num').forEach((n) => n.remove());
    for (let x = 100; x < window.innerWidth; x += 100) {
      const n = document.createElement('span');
      n.className = 'regua__num';
      n.style.left = `${x + 22}px`;
      n.textContent = x / 10;
      topo.appendChild(n);
    }
  };

  // A régua lateral corre com a página: marca a "cota" do scroll
  const numerosLado = [];
  const prepararLado = () => {
    numerosLado.forEach((n) => n.remove());
    numerosLado.length = 0;
    for (let i = 0; i <= Math.ceil(window.innerHeight / 100) + 1; i++) {
      const n = document.createElement('span');
      n.className = 'regua__num';
      lado.appendChild(n);
      numerosLado.push(n);
    }
    atualizarLado();
  };
  const atualizarLado = () => {
    const y = window.scrollY;
    const desvio = -(y % 100);
    lado.style.setProperty('--desvio', `${desvio}px`);
    const base = Math.floor(y / 100);
    numerosLado.forEach((n, i) => {
      n.style.top = `${desvio + i * 100 + 4}px`;
      n.textContent = (base + i) * 10;
    });
  };

  numerosTopo();
  prepararLado();
  window.addEventListener('resize', () => {
    numerosTopo();
    prepararLado();
  });
  window.addEventListener('scroll', atualizarLado, { passive: true });
}

// ---------- Mira ----------
function iniciarMira() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const mira = document.querySelector('.mira');
  const leitura = mira?.querySelector('.mira__leitura');
  if (!mira || !leitura) return;

  let x = -100;
  let y = -100;
  let pendente = false;

  const pintar = () => {
    pendente = false;
    raiz.style.setProperty('--mx', `${x}px`);
    raiz.style.setProperty('--my', `${y}px`);
    leitura.textContent = leitor || `x ${String(Math.round(x)).padStart(4, '0')} · y ${String(Math.round(y + window.scrollY)).padStart(5, '0')}`;
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      x = e.clientX;
      y = e.clientY;
      // Sobre elementos interativos, a mira recolhe-se para não estorvar
      const alvo = e.target.closest?.('a, button, input, select, textarea, label, [role="slider"]');
      mira.classList.toggle('ativa', !alvo);
      if (!pendente) {
        pendente = true;
        requestAnimationFrame(pintar);
      }
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => mira.classList.remove('ativa'));
}

// ---------- Ligação ativa no menu ----------
function iniciarMenu() {
  // (só as ligações para secções desta mesma página; as outras páginas
  // marcam a ligação ativa no HTML com aria-current="page")
  const ligacoes = [...document.querySelectorAll('.topo__nav a')].filter((a) => {
    const u = new URL(a.href);
    return u.pathname === location.pathname && u.hash;
  });
  const alvos = ligacoes.map((a) => document.querySelector(new URL(a.href).hash));
  const ioNav = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((en) => {
        if (!en.isIntersecting) return;
        // Secções fora do menu (intro, abertura) limpam a ligação ativa
        const i = alvos.indexOf(en.target);
        ligacoes.forEach((a, k) => a.setAttribute('aria-current', String(k === i)));
      });
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  [...alvos, document.querySelector('[data-intro]'), document.querySelector('.abertura')].forEach((a) => a && ioNav.observe(a));
}
