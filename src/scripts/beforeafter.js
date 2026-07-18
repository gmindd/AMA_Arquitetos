// Comparador antes/depois: o input range invisível controla a posição
// da linha de corte via variável CSS --pos. Funciona com rato, toque
// e teclado sem código adicional.

// Liga todos os comparadores [data-ba] da página atual
export function initBeforeAfter() {
  document.querySelectorAll('[data-ba]').forEach((comparador) => {
    const range = comparador.querySelector('.ba__range');
    if (!range) return;

    // Atualiza a posição da linha de corte a partir do valor do range
    const atualizar = () => {
      comparador.style.setProperty('--pos', `${range.value}%`);
    };

    range.addEventListener('input', atualizar);
    atualizar();
  });
}
