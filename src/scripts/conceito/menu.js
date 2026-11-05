// Menu em ecrã inteiro para ecrãs estreitos (onde o menu do cabeçalho
// não cabe): abre e fecha pelo botão "Menu", fecha com Escape ou ao
// escolher uma ligação, e bloqueia o scroll da página enquanto está aberto.

export function iniciarMenu() {
  const botao = document.querySelector('[data-menu-botao]');
  const menu = document.querySelector('[data-menu]');
  const texto = document.querySelector('[data-menu-texto]');
  if (!botao || !menu) return;
  const raiz = document.documentElement;

  function definir(aberto) {
    botao.setAttribute('aria-expanded', String(aberto));
    if (texto) texto.textContent = aberto ? 'Fechar' : 'Menu';
    raiz.classList.toggle('menu-aberto', aberto);
    if (aberto) {
      menu.hidden = false;
      // deixa o navegador pintar o menu antes de o animar
      requestAnimationFrame(() => menu.classList.add('aberto'));
      menu.querySelector('a')?.focus({ preventScroll: true });
    } else {
      menu.classList.remove('aberto');
      setTimeout(() => {
        if (!menu.classList.contains('aberto')) menu.hidden = true;
      }, 350);
    }
  }

  botao.addEventListener('click', () => definir(botao.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) definir(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && botao.getAttribute('aria-expanded') === 'true') {
      definir(false);
      botao.focus();
    }
  });
  // se o ecrã alargar até mostrar o menu do cabeçalho, fecha este
  matchMedia('(min-width: 1101px)').addEventListener('change', (e) => e.matches && definir(false));
}
