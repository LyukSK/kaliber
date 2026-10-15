// Týždenné návrhy: podľa zbierky nájde 5 konkrétnych hodiniek, hlavne od
// európskych značiek, ktoré v zbierke ešte nie sú. Claude hľadá cez web search,
// skript potom overí odkazy, doplní fotky a zapíše src/data/vkus.json.
//
//   npm run navrhy              (potrebuje ANTHROPIC_API_KEY)
//   npm run navrhy -- --skuska  iba vypíše zadanie zo zbierky

import { readFile, writeFile, readdir } from 'node:fs/promises';
import Anthropic from '@anthropic-ai/sdk';

const KOREN = new URL('../', import.meta.url);
const SUBOR_VKUSU = new URL('src/data/vkus.json', KOREN);
const MODEL = process.env.KALIBER_MODEL ?? 'claude-sonnet-5-5';
const POCET = 5;
const MAX_POKRACOVANI = 6;
const UA = 'Mozilla/5.0 (compatible; KaliberBot/1.0; +https://kaliber.kucerka.sk)';

// Jednoduché čítanie frontmatteru: stačia riadky "kľúč: hodnota".
function frontmatter(obsah) {
  const blok = obsah.match(/^---\n([\s\S]*?)\n---/m)?.[1] ?? '';
  return Object.fromEntries(
    blok.split('\n').map((r) => r.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^"|"$/g, '')]),
  );
}

async function nacitaj(priecinok) {
  const cesta = new URL(priecinok, KOREN);
  const subory = (await readdir(cesta)).filter((s) => s.endsWith('.md'));
  return Promise.all(subory.map(async (s) => ({ id: s.replace(/\.md$/, ''), ...frontmatter((await readFile(new URL(s, cesta), 'utf8')).replace(/\r\n/g, '\n')) })));
}

async function opisZbierky() {
  const znacky = new Map((await nacitaj('src/content/znacky/')).map((z) => [z.id, z]));
  const hodinky = await nacitaj('src/content/hodinky/');
  const riadky = hodinky.map((h) => {
    const z = znacky.get(h.znacka);
    return [
      `${z?.nazov ?? h.znacka} ${h.model}`,
      `stav ${h.stav}`,
      h.styl,
      h.priemer && `${h.priemer}mm`,
      h.pohon,
      h.cifernik && `ciferník ${h.cifernik}`,
      h.cena && `cca ${h.cena}€`,
      z?.krajina,
    ].filter(Boolean).join(', ');
  });
  return { riadky, znacky: [...znacky.values()].map((z) => z.nazov) };
}

// Overí, že odkaz žije, a skúsi z neho vytiahnuť hlavnú fotku.
async function overOdkaz(url) {
  try {
    const odpoved = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000), redirect: 'follow' });
    if (!odpoved.ok) return null;
    const html = await odpoved.text();
    const og = html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
    const obrazok = og ? new URL(og.replace(/&amp;/g, '&'), url).href.replace(/^http:/, 'https:') : null;
    return { obrazok };
  } catch {
    return null;
  }
}

const bezPomlciek = (s) => (s ? s.replace(/\s*[–—]\s*/g, ' - ') : s);

const SYSTEM = `Si poradca pre osobný slovenský web o hodinkách Kaliber. Majiteľ zbiera hodinky mikroznačiek a nezávislých výrobcov. Tvojou úlohou je raz za týždeň nájsť konkrétne hodinky, ktoré by sa mu podľa zbierky mohli páčiť.

Pravidlá výberu:
- Hľadaj aktuálne predávané konkrétne modely, nie iba značky. Každý návrh musí mať funkčný odkaz na produktovú stránku výrobcu alebo oficiálneho predajcu.
- Prednostne európske značky (napríklad Francúzsko, Nemecko, Švajčiarsko, Veľká Británia, Dánsko, Taliansko, Česko, Poľsko). Najviac jeden návrh smie byť mimo Európy.
- Nenavrhuj značky, ktoré už sú v zbierke, ani modely zo zoznamu predchádzajúcich návrhov.
- Každá značka smie byť v návrhoch najviac raz, chcem pestrý výber.
- Drž sa vkusu podľa zbierky: veľkosti, štýly, farby ciferníkov, typ strojčeka a cenové pásmo. Jeden návrh môže byť odvážnejší, ale stále zdôvodnený.
- Údaje (cena, priemer, strojček) over na stránke cez web_fetch. Čo neoveríš, nepíš.

Na konci vráť iba JSON v značkách <json></json> v tomto tvare:
{"skratka": "...", "zhrnutie": "...", "navrhy": [{"znacka": "...", "krajina": "...", "model": "...", "styl": "...", "priemer": 39, "pohon": "automat", "cena": 650, "cenaPovodna": "£560", "odkaz": "https://...", "preco": "..."}]}

- skratka: jeden riadok o vkuse (veľkosť, štýl, strojček, typická cena).
- zhrnutie: 3 až 4 vety po slovensky o vkuse podľa celej zbierky, v druhej osobe (napríklad: Páčia sa ti kompaktné hodinky...).
- navrhy: presne ${POCET + 2} kandidátov zoradených od najlepšieho. cena je približne v eurách (číslo), cenaPovodna v mene obchodu, krajina po slovensky, pohon jedno z: automat, ručný nátah, kremeň, mechakvarc, solár. preco sú 1 až 2 vety po slovensky, prečo sa hodia k zbierke, pokojne s odkazom na konkrétne hodinky v nej. Nepíš o majiteľovi v tretej osobe, píš bez oslovenia (napríklad: Sadne k Beaucroft The Arc...).

Píš prirodzenou slovenčinou, bez pomlčiek (iba spojovník, ak je nutný), bez emoji, jednotky bez medzery (39mm, 200m).`;

async function main() {
  const vkus = JSON.parse(await readFile(SUBOR_VKUSU, 'utf8'));
  const historia = vkus.historiaNavrhov ?? [];
  const { riadky, znacky } = await opisZbierky();

  const zadanie = [
    '<zbierka>',
    ...riadky.map((r) => `- ${r}`),
    '</zbierka>',
    `<znacky_v_zbierke>${znacky.join(', ')}</znacky_v_zbierke>`,
    `<predchadzajuce_navrhy>${historia.slice(-60).join('; ') || 'žiadne'}</predchadzajuce_navrhy>`,
    `Nájdi ${POCET + 2} kandidátov na tento týždeň.`,
  ].join('\n');

  if (process.argv.includes('--skuska')) {
    console.log(zadanie);
    return;
  }

  const client = new Anthropic();
  const tools = [
    { type: 'web_search_20260209', name: 'web_search', max_uses: 20 },
    { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 20 },
  ];
  const messages = [{ role: 'user', content: zadanie }];

  let odpoved;
  for (let i = 0; i <= MAX_POKRACOVANI; i++) {
    odpoved = await client.messages
      .stream({ model: MODEL, max_tokens: 32000, output_config: { effort: 'medium' }, system: SYSTEM, tools, messages })
      .finalMessage();
    if (odpoved.stop_reason !== 'pause_turn') break;
    // Server preruší dlhé vyhľadávanie, pokračuje sa poslaním jeho rozpracovanej odpovede.
    if (messages.length > 1) messages.pop();
    messages.push({ role: 'assistant', content: odpoved.content });
  }
  if (odpoved.stop_reason !== 'end_turn') {
    throw new Error(`Hľadanie sa nedokončilo (stop_reason: ${odpoved.stop_reason}).`);
  }

  const text = odpoved.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const json = text.match(/<json>([\s\S]*?)<\/json>/)?.[1];
  if (!json) throw new Error('V odpovedi chýba JSON s návrhmi.');
  const vysledok = JSON.parse(json);

  const vZbierke = new Set(znacky.map((z) => z.toLowerCase()));
  const navrhy = [];
  for (const n of vysledok.navrhy ?? []) {
    if (navrhy.length >= POCET) break;
    if (!n.znacka || !n.model || !/^https:\/\//.test(n.odkaz ?? '')) continue;
    if (vZbierke.has(n.znacka.toLowerCase())) continue;
    if (navrhy.some((x) => x.znacka.toLowerCase() === n.znacka.toLowerCase())) continue;
    const overenie = await overOdkaz(n.odkaz);
    if (!overenie) {
      console.warn(`Preskakujem ${n.znacka} ${n.model}: odkaz nefunguje.`);
      continue;
    }
    navrhy.push({
      znacka: n.znacka,
      krajina: n.krajina,
      model: n.model,
      styl: n.styl,
      priemer: n.priemer ?? null,
      pohon: n.pohon ?? null,
      cena: n.cena ?? null,
      cenaPovodna: n.cenaPovodna ?? null,
      odkaz: n.odkaz,
      obrazok: overenie.obrazok,
      preco: bezPomlciek(n.preco),
    });
  }
  if (navrhy.length === 0) throw new Error('Žiadny návrh neprešiel overením, vkus.json nemením.');

  const novy = {
    analyza: new Date().toISOString().slice(0, 10),
    skratka: bezPomlciek(vysledok.skratka) || vkus.skratka,
    zhrnutie: bezPomlciek(vysledok.zhrnutie) || vkus.zhrnutie,
    navrhy,
    historiaNavrhov: [...historia, ...navrhy.map((n) => `${n.znacka} ${n.model}`)].slice(-200),
  };
  await writeFile(SUBOR_VKUSU, JSON.stringify(novy, null, 2) + '\n');
  console.log(`Uložených ${navrhy.length} návrhov: ${navrhy.map((n) => `${n.znacka} ${n.model}`).join(', ')}`);
  console.log(`Tokeny: ${odpoved.usage.input_tokens} vstup, ${odpoved.usage.output_tokens} výstup.`);
}

main().catch((e) => {
  if (e instanceof Anthropic.APIError) console.error(`Chyba Claude API ${e.status}: ${e.message}`);
  else console.error(e);
  process.exit(1);
});
