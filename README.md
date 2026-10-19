# AMA · André Melissa Arquitetos · site conceito

> **Branch `claude/site-conceito-planta`**: website conceito, sem fotografias. O site portfólio (com projetos e reabilitações geridos no backoffice) continua nos branches `claude/architecture-firm-design-animations-9r4h5z` e `claude/lateral-menu-logo-update-r8qtpl`.

## Conceito: "Tudo começa com uma linha"

O cliente da AMA é como as obras: nasce de uma planta e é acompanhado até ao fim. O site é uma prancheta de arquiteto (papel milimétrico, réguas e mira de CAD) e o visitante percorre o projeto de uma casa do primeiro traço à entrega da chave:

Abre com a intro "André e Melissa Arquitetos": três gestos de scroll recolhem as minúsculas para trás das maiúsculas e formam o lockup AMA / ANDRÉ MELISSA ARCHITECTS; o gesto seguinte leva o AMA ao canto superior esquerdo em meio segundo, com a página a entrar em fade in. A intro corre ao abrir o site (não ao voltar de outra página do site).

| Folha | Fase | O que acontece no desenho |
| --- | --- | --- |
| 00 | Folha em branco | Um alçado desenha-se traço a traço |
| 01 | Programa | Diagrama de bolhas e notas à mão (luz a sul, mar a poente). O visitante escreve o nome e escolhe o programa |
| 02 | Estudo prévio | As bolhas transformam-se em divisões e as paredes são traçadas |
| 03 | Projeto e licenciamento | Planta rigorosa: poché, vãos, portas, cotas, áreas, corte A-A' e norte. O cursor visita cada divisão |
| 04 | Modelo | A planta levanta-se em axonometria (a mesma câmara, em contínuo) |
| 05 | Obra | O papel inverte para negro, o modelo vira projeto fantasma e a obra cresce dentro dele |
| 06 | Entrega | A cobertura levanta, o plano de corte desce, o mobiliário e a luz entram ("A casa é sua, Ana.") |
| 07 | Equipa | André Machado e Melissa Fazendeiro, as duas assinaturas da folha |
| 08 | Pedido | Formulário em forma de quadro de legenda. Ao enviar, recebe o carimbo "Recebido" |

Outras páginas: **`/reabilitacao`** (caso real em cinco fases sobre a planta de um projeto AMA, equipa de construção própria, antes/depois da fachada, tipologias e pormenor construtivo de cobertura), **`/legal`** (identificação, habilitações, Livro de Reclamações, RAL) e **`/privacidade`** (RGPD e cookies).

### Dados legais por preencher

Em `src/lib/legal.ts`: firma, NIPC, conservatória, capital social, n.º de inscrição na Ordem dos Arquitectos de cada arquiteto e alvará/certificado IMPIC. Enquanto estiverem vazios aparecem no site assinalados como "A preencher".

O nome e o programa do visitante acompanham tudo: título do desenho, etiqueta do visitante dentro da casa, título da entrega e formulário (guardados só em `localStorage`, por conveniência).

Paleta e regras da marca mantidas: só `#0A0A0A`, `#E6E4E0` e `#FFFFFF` (o branco é a luz), uma família tipográfica (com uma mono de sistema para cotas e anotações), sem fotografias. `prefers-reduced-motion` respeitado.

### Ficheiros do conceito

```
src/pages/index.astro                 → início: intro + 9 folhas
src/pages/reabilitacao.astro          → página de reabilitação
src/pages/legal.astro, privacidade.astro → informação legal e política de privacidade
src/pages/api/pedido.ts               → recebe o formulário (email via lib/email.ts, recuo para DATA_DIR/mensagens)
src/lib/legal.ts                      → dados legais da empresa
src/layouts/Conceito.astro            → prancheta: réguas, mira, moldura e cabeçalho
src/components/conceito/Fachada*.astro → alçado antes/depois (SVG)
src/components/conceito/Pormenor.astro → pormenor construtivo de cobertura (SVG animado)
src/components/conceito/Rodape.astro, LogoLockup.astro → rodapé com informação legal e lockup AMA em texto
src/scripts/conceito/
├── modelo-casa.js         → a casa do processo (início), em metros
├── modelo-reabilitacao.js → caso real de reabilitação (simplificado de um projeto AMA): paredes a manter, demolições, ampliação, escada, telhado de duas águas
├── casa.js       → a planta viva (canvas), partilhada pelos dois percursos: processo e reabilitação (levantamento → manter/demolir/construir → axonometria → obra → entrega)
├── prancheta.js  → réguas, mira e menu
├── estado.js     → nome e programa do visitante
├── intro.js      → intro André e Melissa Arquitetos → AMA
├── fachada.js    → linha de corte arrastável
├── pedido.js     → envio do formulário
└── revelar.js    → títulos palavra a palavra
src/styles/conceito.css               → estilos do site (o backoffice continua em global.css + admin.css)
```

Neste branch as páginas públicas antigas (Projetos, Reabilitação, Sobre, Contactos) foram retiradas; o backoffice (`/admin`) e o envio de email ficam como estavam.

---

## Stack

- **[Astro](https://astro.build) em modo servidor** (adaptador Node, standalone) — as páginas são geradas no servidor a partir do conteúdo em disco; sem rebuilds a cada alteração.
- **Backoffice próprio em `/admin`** — os administradores criam, editam e apagam projetos e obras de reabilitação em formulários simples. O design não é editável no painel: o conteúdo novo entra sempre nos mesmos templates.
- **Conteúdo no servidor, fora do git** — os registos (JSON) e as fotografias carregadas vivem no diretório `DATA_DIR` (por omissão `./data`), que em produção é um volume persistente do Coolify.

## Desenvolvimento

```bash
npm install
ADMIN_PASSWORD=uma-senha npm run dev    # http://localhost:4321 e /admin
npm run build && ADMIN_PASSWORD=uma-senha npm start
```

No primeiro arranque, se o `DATA_DIR` estiver vazio, é semeado com o conteúdo de exemplo em `./seed` (placeholders SVG a substituir no painel).

## Backoffice

- `/admin` — entrada com a palavra-passe definida em `ADMIN_PASSWORD`.
- **Projetos** — título, tipologia, local, área, ano (a ficha técnica de 4 linhas), fotografia de capa, galeria, variação do logótipo (A/MA · A/AM · MA/A), tinta clara ou escura, ordem na grelha, visibilidade e nota breve.
- **Reabilitação** — título, local, ano, fotografias antes e depois, ordem, visibilidade e nota.
- **Ocultar / mostrar** — cada projeto e obra tem um interruptor de visibilidade (e um botão rápido Ocultar/Mostrar na lista). Ocultar remove o item do site (grelha, hero e página própria dão 404) sem o apagar — é assim que se reduz ou aumenta o número de projetos visíveis.
- **Marca e logótipos** (`/admin/marca`) — carregar os logótipos reais (lockup principal, ícone/favicon e variações compostas A/MA · A/AM · MA/A). Passam a ser usados em todo o site — cabeçalho, rodapé, favicon e capas dos projetos — com recuo ao lettering tipográfico quando não há ficheiro. Use SVG ou PNG com fundo transparente: cada logótipo é recolorido automaticamente para branco ou preto conforme o fundo.
- **Compressão automática** — cada imagem carregada é reduzida no servidor até, no máximo, **1 MB** (fotografia convertida para WebP com dimensão/qualidade decrescentes; logótipos SVG/PNG mantêm nitidez e transparência).
- **Definições** (`/admin/definicoes`) — escolher **para quem seguem os pedidos** do formulário: um ou vários emails, um por linha; todos recebem cópia do mesmo pedido. As credenciais de envio **não** se configuram aqui — são variáveis de ambiente do servidor (ver abaixo), para a chave de API nunca ficar guardada no site. Se o envio falhar ou não estiver configurado, cada pedido é guardado em `DATA_DIR/mensagens` para não se perder.
- As fotografias e logótipos ficam em `DATA_DIR/uploads` e são servidos em `/uploads/…` com cache longa; as definições da marca em `DATA_DIR/definicoes.json`.
- Substituir um placeholder = editar o registo e carregar a fotografia real; o site reflete a alteração de imediato.

## Deploy no Coolify

1. Criar uma aplicação a partir deste repositório; o **Dockerfile** na raiz é detetado automaticamente.
2. Definir a variável de ambiente **`ADMIN_PASSWORD`** (sem ela o backoffice fica desativado).
3. Montar um **volume persistente em `/app/data`** — é aqui que ficam os projetos, as fotografias e os pedidos de orçamento; sem o volume, o conteúdo criado no painel perde-se em cada redeploy.
4. A aplicação escuta na porta **4321**.

### Envio de email (formulário de contactos)

A separação é: **quem envia** vive nas variáveis de ambiente do servidor; **para quem vai** escolhe-se no backoffice. Assim a chave de API nunca fica no volume de dados nem editável a partir do site.

**1. Credenciais — variáveis de ambiente (Coolify → Environment Variables)**

Via [Resend](https://resend.com) (recomendado):

| Variável | Obrigatória | Exemplo |
| --- | --- | --- |
| `RESEND_API_KEY` | sim | `re_...` (criada em **API Keys** no Resend) |
| `RESEND_FROM` | não | `AMA <obras@andremelissaarquitetos.pt>` |

Sem `RESEND_FROM` usa-se o remetente de teste `onboarding@resend.dev`; nesse caso o Resend só entrega ao email com que a conta foi criada. Para enviar de um endereço próprio e para qualquer destinatário, verificar o domínio no Resend (registos DNS) e definir `RESEND_FROM`.

Alternativa por SMTP: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (e opcionais `SMTP_PORT`, `SMTP_FROM`, `SMTP_SECURE`). Se ambos estiverem definidos, o Resend tem precedência.

**2. Destinatários — backoffice (`/admin/definicoes`)**

Um email por linha; todos recebem cópia de cada pedido. O `reply-to` é preenchido com o contacto de quem submeteu, quando é um email válido, para se responder directamente.

Sem credenciais, sem destinatários, ou se o envio falhar, os pedidos ficam guardados em `DATA_DIR/mensagens` para não se perderem.

O `Astro.url` confia no `Host`/`X-Forwarded-Host` do proxy (ver `security.allowedDomains` em `astro.config.mjs`); a proteção contra POST de outras origens continua ativa, juntamente com o cookie de sessão `SameSite=Lax`.

## Estrutura

```
seed/                   → conteúdo inicial (copiado para o volume no 1.º arranque)
src/
├── lib/store.ts        → leitura/escrita do conteúdo no DATA_DIR + uploads
├── lib/auth.ts         → sessão do backoffice (ADMIN_PASSWORD)
├── lib/forms.ts        → formulários → registos validados
├── middleware.ts       → proteção das rotas /admin
├── layouts/            → Base (site) e Admin (backoffice)
├── components/         → Header, Footer, ProjectCard, BeforeAfter, admin/…
├── pages/              → Projetos (home) · projeto · Reabilitação · Sobre · Contactos
│   ├── admin/          → painel, entrar/sair, formulários
│   └── uploads/        → serve as fotografias do volume
├── scripts/            → animações do site + confirmações do backoffice
└── styles/             → global.css (design system) e admin.css
Dockerfile              → imagem de produção para o Coolify
```

## Antes de publicar (pendências do brief)

1. Substituir os **placeholders SVG** por fotografia real no `/admin` (6–10 projetos + 2–3 reabilitações antes/depois). Os projetos atuais são exemplos.
2. Confirmar a **fonte licenciada** com a designer (Margarida Olo) e substituir a pilha de sistema em `--font-sans` (`src/styles/global.css`).
3. Foto real dos fundadores (página Sobre usa `public/images/sobre/`).
4. Ligar o **formulário de orçamento** a um serviço de envio (o atributo Netlify não se aplica no Coolify — apontar o `action` para um serviço de formulários ou pedir um endpoint próprio).
5. Validação final do copy pelo André e pela Melissa.

## Regras duras respeitadas

- Só as 3 cores do sistema (`#0A0A0A`, `#E6E4E0`, `#FFFFFF`); sem gradientes nem cores de destaque.
- Uma família tipográfica, dois pesos (400/700); hierarquia por tamanho e peso.
- Sem emojis, exclamações ou jargão no copy.
- Fichas técnicas com 4 linhas; formulário com 5 campos; página Sobre num ecrã.
- Construção in-house mencionada apenas ligada a reabilitação/fachadas/condomínios.
- Animações subtis com `prefers-reduced-motion` respeitado.
