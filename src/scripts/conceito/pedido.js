// Formulário de pedido: herda o nome e o programa escolhidos no início,
// envia por fetch para /api/pedido e, quando o pedido segue, a folha
// recebe a primeira linha do projeto e o carimbo "Recebido".

import { estado, ouvir, definir } from './estado.js';

export function iniciarPedido() {
  const form = document.querySelector('[data-pedido]');
  if (!form) return;
  const nome = form.querySelector('[data-campo-nome]');
  const tipo = form.querySelector('[data-campo-tipo]');
  const estadoEl = form.querySelector('[data-estado]');
  const botao = form.querySelector('button[type="submit"]');
  const titulo = form.querySelector('[data-folha-titulo]');

  // Pré-preenche só enquanto o visitante não escreveu no próprio campo
  let nomeTocado = false;
  nome.addEventListener('input', () => {
    nomeTocado = true;
    definir({ nome: nome.value });
  });
  tipo.addEventListener('change', () => definir({ programa: tipo.value }));
  ouvir((e) => {
    if (!nomeTocado && document.activeElement !== nome) nome.value = e.nome;
    if (e.programa && [...tipo.options].some((o) => o.value === e.programa)) tipo.value = e.programa;
    const n = e.nome.trim().split(/\s+/)[0];
    if (titulo) titulo.textContent = `${n ? `Casa ${n}` : 'A sua casa'}${e.programa ? ` · ${e.programa}` : ''} · Folha 01`;
  });

  // Pedido enviado sem JS: o servidor volta com ?enviado=1
  if (new URLSearchParams(location.search).has('enviado')) marcarEnviado();

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    form.querySelectorAll('.celula.erro').forEach((c) => c.classList.remove('erro'));
    const obrigatorios = [...form.querySelectorAll('[required]')].filter((c) => !c.value.trim());
    if (obrigatorios.length) {
      obrigatorios.forEach((c) => c.closest('.celula')?.classList.add('erro'));
      estadoEl.textContent = 'Faltam campos por preencher.';
      obrigatorios[0].focus();
      return;
    }

    botao.disabled = true;
    estadoEl.textContent = 'A enviar…';
    try {
      const resposta = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok || !dados.ok) throw new Error(dados.erro || 'Falha no envio');
      marcarEnviado();
    } catch {
      estadoEl.textContent = 'Não foi possível enviar agora. Contacte-nos por email ou telefone.';
      botao.disabled = false;
    }
  });

  function marcarEnviado() {
    form.classList.add('enviado');
    form.querySelectorAll('input, select, textarea, button').forEach((c) => (c.disabled = true));
    const n = estado.nome.trim().split(/\s+/)[0];
    estadoEl.textContent = `Pedido recebido${n ? `, ${n}` : ''}. Respondemos em 24 a 48 horas úteis.`;
  }
}
