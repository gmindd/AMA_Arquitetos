# AMA — André Melissa Arquitetos

Website portfólio do gabinete de arquitetura AMA, com backoffice próprio. Fonte de verdade do design e do copy: `AMA_contexto_website.md` (posicionamento, design system, regras duras).

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
