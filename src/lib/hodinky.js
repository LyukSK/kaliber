import { getCollection } from 'astro:content';

export const STAVY = {
  chcem: 'Chcem',
  inspiracia: 'Inšpirácia',
  mam: 'Mám',
};

// Načíta hodinky aj so značkou, zoradené od najnovších.
export async function nacitajHodinky() {
  const znacky = new Map((await getCollection('znacky')).map((z) => [z.id, z]));
  const hodinky = await getCollection('hodinky');
  return hodinky
    .map((h) => ({ ...h, znacka: znacky.get(h.data.znacka.id) }))
    .sort((a, b) => b.data.pridane - a.data.pridane);
}

export const DOSTUPNOST = {
  skladom: 'Skladom',
  'vypredané': 'Vypredané',
  'predobjednávka': 'Predobjednávka',
  'čoskoro': 'Čoskoro v predaji',
  kickstarter: 'Kampaň na Kickstarteri',
};

export function cislo(n) {
  return String(n).replace('.', ',');
}

export function cena(n) {
  if (n == null) return null;
  return n.toLocaleString('sk-SK').replace(/\s/g, ' ') + '€';
}

// Krátky riadok pre kartu: 39mm · 200m · automat
export function kratkeUdaje(d) {
  return [
    d.priemer && cislo(d.priemer) + 'mm',
    d.vodotesnost && d.vodotesnost + 'm',
    d.pohon,
  ].filter(Boolean).join(' · ');
}

// Celá tabuľka technických údajov, prázdne polia sa vynechajú.
export function technickeUdaje(d) {
  return [
    ['Referencia', d.referencia],
    ['Priemer', d.priemer && cislo(d.priemer) + 'mm'],
    ['Hrúbka', d.hrubka && cislo(d.hrubka) + 'mm'],
    ['Lug-to-lug', d.lugToLug && cislo(d.lugToLug) + 'mm'],
    ['Šírka ťahu', d.sirkaTahu && d.sirkaTahu + 'mm'],
    ['Puzdro', d.puzdro],
    ['Sklíčko', d.sklicko],
    ['Vodotesnosť', d.vodotesnost && d.vodotesnost + 'm'],
    ['Strojček', [d.strojcek, d.pohon].filter(Boolean).join(', ')],
    ['Rezerva chodu', d.rezervaChodu && d.rezervaChodu + 'h'],
    ['Ciferník', d.cifernik],
    ['Remienok', d.remienok],
  ].filter(([, v]) => v);
}

// Svetlý ciferník potrebuje tmavé ručičky.
export function farbaRuciciek(hex) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1C1F1E' : '#F3F3F0';
}

export function hodiniek(n) {
  if (n === 1) return '1 hodinky';
  if (n >= 2 && n <= 4) return n + ' hodinky';
  return n + ' hodiniek';
}

export function znaciek(n) {
  if (n === 1) return '1 značka';
  if (n >= 2 && n <= 4) return n + ' značky';
  return n + ' značiek';
}
