import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Cada projeto é um ficheiro Markdown em src/content/projetos.
// O esquema garante que qualquer case study novo respeita a ficha técnica
// de 4 linhas: Tipologia · Local · Área · Ano.
const projetos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projetos' }),
  schema: z.object({
    titulo: z.string(),
    tipologia: z.string(),
    local: z.string(),
    area: z.string(),
    ano: z.number(),
    capa: z.string(),
    galeria: z.array(z.string()).default([]),
    variacaoLogo: z.enum(['A/MA', 'A/AM', 'MA/A']).default('A/MA'),
    logoClaro: z.boolean().default(true),
    ordem: z.number().default(0),
  }),
});

// Obras de reabilitação executadas pela equipa de construção própria:
// registo documental antes/depois.
const reabilitacao = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reabilitacao' }),
  schema: z.object({
    titulo: z.string(),
    local: z.string(),
    ano: z.number(),
    antes: z.string(),
    depois: z.string(),
    ordem: z.number().default(0),
  }),
});

export const collections = { projetos, reabilitacao };
