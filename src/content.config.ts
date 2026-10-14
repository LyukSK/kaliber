import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Jedna značka = jeden súbor. Telo súboru je text o značke (kto, odkiaľ, prečo).
const znacky = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/znacky' }),
  schema: z.object({
    nazov: z.string(),
    krajina: z.string(),
    mesto: z.string().optional(),
    zalozena: z.number().optional(),
    zakladatel: z.string().optional(),
    web: z.string().url().optional(),
    rss: z.string().url().optional(),
  }),
});

// Jedny hodinky = jeden súbor. Telo súboru je moja poznámka.
// Technické údaje sú v mm, m, h a eurách, bez jednotiek.
const hodinky = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/hodinky' }),
  schema: z.object({
    znacka: reference('znacky'),
    model: z.string(),
    referencia: z.string().optional(),
    stav: z.enum(['inspiracia', 'chcem', 'mam']),
    priorita: z.number().int().min(1).max(5).optional(),
    cena: z.number().optional(),
    styl: z.enum(['Diver', 'Field', 'Chronograf', 'GMT', 'Dress', 'Športové', 'Pilotné', 'Integrovaný náramok', 'Iné']),
    priemer: z.number().optional(),
    hrubka: z.number().optional(),
    lugToLug: z.number().optional(),
    sirkaTahu: z.number().optional(),
    puzdro: z.string().optional(),
    sklicko: z.string().optional(),
    vodotesnost: z.number().optional(),
    strojcek: z.string().optional(),
    pohon: z.enum(['automat', 'ručný nátah', 'kremeň', 'mechakvarc', 'solár']).optional(),
    rezervaChodu: z.number().optional(),
    cifernik: z.string().optional(),
    remienok: z.string().optional(),
    // Farby pre ilustráciu, kým nie je fotka.
    farba: z.string().default('#1B2633'),
    luneta: z.string().optional(),
    fotky: z.array(z.string()).default([]),
    odkaz: z.string().url().optional(),
    // Kde kúpiť: názov obchodu, cena v mene obchodu a dostupnosť k dátumu overenia.
    obchod: z.string().optional(),
    cenaPovodna: z.string().optional(),
    dostupnost: z.enum(['skladom', 'vypredané', 'predobjednávka', 'čoskoro', 'kickstarter']).optional(),
    overene: z.coerce.date().optional(),
    pridane: z.coerce.date(),
  }),
});

export const collections = { znacky, hodinky };
