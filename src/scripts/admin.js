// Comportamento do backoffice: pedir confirmação antes de ações destrutivas.

// Liga a confirmação aos formulários marcados com data-confirmar
function initConfirmacoes() {
  document.querySelectorAll('form[data-confirmar]').forEach((formulario) => {
    formulario.addEventListener('submit', (evento) => {
      const mensagem = formulario.getAttribute('data-confirmar');
      if (!window.confirm(mensagem)) {
        evento.preventDefault();
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initConfirmacoes);
