# AMA — André Melissa Arquitetos

Website portfólio do gabinete de arquitetura AMA. Fonte de verdade do design e do copy: `AMA_contexto_website.md` (posicionamento, design system, regras duras).

## Stack

- **[Astro](https://astro.build)** — site estático, rápido, sem JavaScript desnecessário no cliente.
- **Content Collections** — cada case study é um ficheiro Markdown com esquema validado (`src/content.config.ts`). Um projeto novo que não respeite a ficha técnica falha o build.
- **[Decap CMS](https://decapcms.org)** — painel de administração em `/admin` para os administradores criarem projetos sem tocar em código. O design não é editável no painel: o conteúdo novo entra sempre nos mesmos templates.

## Desenvolvimento

```bash
npm install
npm run dev        # servidor local em http://localhost:4321
npm run build      # gera o site estático em dist/
```

## Como adicionar um case study

### Opção A — painel de administração (recomendado para os administradores)

1. Aceder a `/admin` no site publicado e iniciar sessão.
2. Escolher **Projetos** (ou **Reabilitação**) → **Novo Projeto**.
3. Preencher os campos: título, tipologia, local, área, ano, capa, galeria.
4. Publicar. O site é reconstruído automaticamente no deploy.

> Requer, no serviço de alojamento, ativação do Netlify Identity + Git Gateway
> (ou outro backend do Decap CMS — ajustar `public/admin/config.yml`).

### Opção B — ficheiro Markdown

Criar um ficheiro em `src/content/projetos/o-meu-projeto.md`:

```markdown
---
titulo: Casa na Amorosa
tipologia: Habitação unifamiliar
local: Praia da Amorosa, Viana do Castelo
area: 214 m²
ano: 2024
capa: /images/projetos/a-minha-capa.jpg
galeria:
  - /images/projetos/imagem-01.jpg
variacaoLogo: A/MA        # A/MA · A/AM · MA/A — sobreposta na capa
logoClaro: true           # true = logótipo branco (foto escura)
ordem: 1                  # posição na grelha
---

Nota breve opcional. Duas ou três frases. O projeto é o protagonista.
```

As imagens vivem em `public/images/`. As obras de reabilitação seguem o mesmo modelo em `src/content/reabilitacao/` com campos `antes` e `depois`.

## Estrutura

```
src/
├── content/            → case studies em Markdown (geríveis por admins)
├── content.config.ts   → esquema validado das coleções
├── layouts/Base.astro  → documento base (meta, cabeçalho, rodapé)
├── components/         → Header, Footer, ProjectCard, BeforeAfter
├── pages/              → Projetos (home) · projeto · Reabilitação · Sobre · Contactos
├── scripts/            → animações (revelação, parallax, menu, antes/depois)
└── styles/global.css   → design system: 3 cores, 1 família, 2 pesos
public/
├── admin/              → Decap CMS (painel de administração)
└── images/             → fotografia dos projetos
```

## Antes de publicar (pendências do brief)

1. Substituir os **placeholders SVG** por fotografia real (6–10 projetos + 2–3 reabilitações antes/depois). Os projetos atuais são exemplos.
2. Confirmar a **fonte licenciada** com a designer (Margarida Olo) e substituir a pilha de sistema em `--font-sans` (`src/styles/global.css`).
3. Foto real dos fundadores em `public/images/sobre/`.
4. Ligar o **formulário de orçamento**: em Netlify funciona sem alterações (`data-netlify`); noutro alojamento, apontar o `action` para um serviço de formulários.
5. Validação final do copy pelo André e pela Melissa.

## Regras duras respeitadas

- Só as 3 cores do sistema (`#0A0A0A`, `#E6E4E0`, `#FFFFFF`); sem gradientes nem cores de destaque.
- Uma família tipográfica, dois pesos (400/700); hierarquia por tamanho e peso.
- Sem emojis, exclamações ou jargão no copy.
- Fichas técnicas com 4 linhas; formulário com 5 campos; página Sobre num ecrã.
- Construção in-house mencionada apenas ligada a reabilitação/fachadas/condomínios.
- Animações subtis com `prefers-reduced-motion` respeitado.
