// Revelações à entrada no ecrã: títulos palavra a palavra e blocos
// que sobem. Sem JS, o conteúdo fica visível (as classes só existem
// depois de o script correr).

export function partirPalavras(el) {
  const texto = el.textContent.trim();
  el.setAttribute('aria-label', texto);
  el.innerHTML = texto
    .split(/\s+/)
    .map((p, k) => `<span class="palavra" aria-hidden="true"><span style="--k:${k}">${p}</span></span>`)
    .join(' ');
}

export function iniciarRevelar() {
  const titulos = document.querySelectorAll('[data-palavras]');
  titulos.forEach(partirPalavras);

  const alvos = document.querySelectorAll('[data-aparece], [data-palavras]');
  const io = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('visivel');
        io.unobserve(en.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  alvos.forEach((a) => io.observe(a));
}
