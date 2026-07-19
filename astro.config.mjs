import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Configuração do site AMA — André Melissa Arquitetos.
// Modo servidor: o conteúdo (projetos, reabilitações, fotografias) é lido
// em cada pedido a partir do diretório de dados no servidor (DATA_DIR),
// gerido pelo backoffice em /admin — nada é gravado no git.
export default defineConfig({
  site: 'https://www.andremelissaarquitetos.pt',
  trailingSlash: 'ignore',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  security: {
    // Confia no Host/X-Forwarded-Host vindos do proxy (Coolify) para que
    // Astro.url reflita o domínio real; sem isto, todos os POST dos
    // formulários falham a verificação de origem com 403. O padrão vazio
    // aceita qualquer domínio — o proxy do Coolify é quem filtra os hosts.
    allowedDomains: [{}],
  },
});
