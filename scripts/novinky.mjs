// Ranné spracovanie noviniek: stiahne RSS zo zdrojov, nové články nechá
// zhrnúť po slovensky cez Claude API a uloží ich do src/data/novinky.json.
//
//   npm run novinky              spracuje a uloží (potrebuje ANTHROPIC_API_KEY)
//   npm run novinky -- --skuska  iba stiahne zdroje a vypíše, čo by spracoval

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';
import Anthropic from '@anthropic-ai/sdk';

const KOREN = new URL('../', import.meta.url);
const SUBOR_NOVINIEK = new URL('src/data/novinky.json', KOREN);
const MODEL = process.env.KALIBER_MODEL ?? 'claude-opus-5-5';
const MAX_VEK_DNI = 3;
const MAX_ZO_ZDROJA = 8;
const MAX_NOVYCH = 40;
const DRZAT_DNI = 30;
const SKUSKA = process.argv.includes('--skuska');

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const text = (v) => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return text(v[0]);
  return text(v['#text'] ?? '');
};
const zoznam = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function bezHtml(s) {
  return s
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;|&mdash;|[–—]/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function obrazok(polozka, html) {
  const kandidati = [
    ...zoznam(polozka['media:content']).map((m) => m['@_url']),
    ...zoznam(polozka['media:thumbnail']).map((m) => m['@_url']),
    ...zoznam(polozka.enclosure).filter((e) => String(e['@_type'] ?? '').startsWith('image')).map((e) => e['@_url']),
    html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1],
  ];
  return kandidati.find((u) => u && /^https:\/\//.test(u)) ?? null;
}

function odkaz(polozka) {
  if (typeof polozka.link === 'string') return polozka.link.trim();
  const linky = zoznam(polozka.link);
  const alt = linky.find((l) => !l['@_rel'] || l['@_rel'] === 'alternate');
  return (alt?.['@_href'] ?? text(polozka.link)).trim();
}

async function stiahniZdroj(zdroj) {
  const odpoved = await fetch(zdroj.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KaliberBot/1.0; +https://kaliber.kucerka.sk)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!odpoved.ok) throw new Error(`HTTP ${odpoved.status}`);
  const xml = parser.parse(await odpoved.text());
  const polozky = zoznam(xml.rss?.channel?.item ?? xml.feed?.entry ?? xml['rdf:RDF']?.item);
  return polozky.map((p) => {
    const html = text(p['content:encoded'] ?? p.content ?? p.description ?? p.summary);
    return {
      zdroj: zdroj.nazov,
      odkaz: odkaz(p),
      povodnyTitulok: bezHtml(text(p.title)),
      popis: bezHtml(html).slice(0, 700),
      datum: new Date(text(p.pubDate ?? p.published ?? p.updated ?? p['dc:date'])).toISOString(),
      obrazok: obrazok(p, html),
    };
  });
}

// Značky, ktoré majú v súbore uvedený vlastný RSS, sa sledujú automaticky.
async function zdrojeZnaciek() {
  const priecinok = new URL('src/content/znacky/', KOREN);
  const subory = (await readdir(priecinok)).filter((s) => s.endsWith('.md'));
  const vysledok = [];
  for (const s of subory) {
    const obsah = await readFile(new URL(s, priecinok), 'utf8');
    const rss = obsah.match(/^rss:\s*(\S+)/m)?.[1];
    const nazov = obsah.match(/^nazov:\s*(.+)$/m)?.[1]?.trim();
    if (rss && nazov) vysledok.push({ nazov, url: rss });
  }
  return vysledok;
}

// Stručný opis zbierky a vkusu, podľa ktorého Claude označí, čo sedí.
async function profilVkusu() {
  const vkus = JSON.parse(await readFile(new URL('src/data/vkus.json', KOREN), 'utf8'));
  const priecinok = new URL('src/content/hodinky/', KOREN);
  const subory = (await readdir(priecinok)).filter((s) => s.endsWith('.md'));
  const riadky = [];
  for (const s of subory) {
    const obsah = await readFile(new URL(s, priecinok), 'utf8');
    const pole = (k) => obsah.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.trim();
    riadky.push([pole('znacka'), pole('model'), pole('styl'), pole('priemer') && pole('priemer') + 'mm', pole('stav')].filter(Boolean).join(', '));
  }
  return [
    vkus.zhrnutie ? `Zhrnutie vkusu: ${vkus.zhrnutie}` : 'Zhrnutie vkusu zatiaľ nie je, odvoď ho zo zbierky.',
    'Hodinky v zbierke (značka, model, štýl, priemer, stav):',
    ...riadky.map((r) => `- ${r}`),
  ].join('\n');
}

const SCHEMA = {
  type: 'object',
  properties: {
    clanky: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          duplikat: { type: 'boolean' },
          titulok: { type: 'string' },
          zhrnutie: { type: 'string' },
          stitok: { type: 'string', enum: ['novinka', 'recenzia', 'mikroznačky', 'trh', 'história', 'rozhovor', 'iné'] },
          mikroznacka: { type: 'boolean' },
          sediKVkusu: { type: 'boolean' },
          preco: { type: 'string' },
        },
        required: ['id', 'duplikat', 'titulok', 'zhrnutie', 'stitok', 'mikroznacka', 'sediKVkusu', 'preco'],
        additionalProperties: false,
      },
    },
  },
  required: ['clanky'],
  additionalProperties: false,
};

const SYSTEM = `Pripravuješ ranný prehľad noviniek zo sveta hodiniek pre osobný slovenský web Kaliber, ktorý sa zameriava na mikroznačky.

Ku každému článku vráť:
- titulok: prirodzený slovenský titulok, nie doslovný preklad. Názvy značiek a modelov nemeň.
- zhrnutie: 2 až 3 vety po slovensky. Čo je nové, aké hodinky alebo značka, kľúčové parametre (priemer, strojček, vodotesnosť) a cena, ak sú v texte. Iba fakty z textu, nič si nedomýšľaj.
- stitok: typ článku.
- mikroznacka: true, ak ide o nezávislú malú značku (napríklad Baltic, Lorier, Furlan Marri, Studio Underd0g, Nodus, Serica), nie o veľký koncern ani zavedenú luxusnú značku.
- sediKVkusu: true iba vtedy, ak hodinky alebo značka zjavne zodpovedajú profilu vkusu nižšie. Buď prísny.
- preco: ak sediKVkusu, jedna krátka veta, prečo by to majiteľa zaujalo. Inak prázdny reťazec.
- duplikat: true, ak článok opisuje tú istú novinku ako článok s nižším id v tomto zozname.

Píš prirodzenou slovenčinou. Nepoužívaj pomlčky ani dlhé pomlčky, iba spojovník, ak je nutný. Bez emoji. Jednotky a percentá píš bez medzery (39mm, 200m, 42h, 20%). Ceny v pôvodnej mene.`;

async function main() {
  const existujuce = JSON.parse(await readFile(SUBOR_NOVINIEK, 'utf8'));
  const zname = new Set(existujuce.map((c) => c.odkaz));
  const zdroje = [...JSON.parse(await readFile(new URL('scripts/zdroje.json', KOREN), 'utf8')), ...(await zdrojeZnaciek())];
  const hranica = Date.now() - MAX_VEK_DNI * 864e5;

  const kandidati = [];
  for (const zdroj of zdroje) {
    try {
      const polozky = (await stiahniZdroj(zdroj))
        .filter((p) => p.odkaz && !zname.has(p.odkaz) && new Date(p.datum).getTime() > hranica)
        .slice(0, zdroj.max ?? MAX_ZO_ZDROJA);
      console.log(`${zdroj.nazov}: ${polozky.length} nových`);
      kandidati.push(...polozky);
    } catch (e) {
      console.warn(`${zdroj.nazov}: nepodarilo sa stiahnuť (${e.message})`);
    }
  }
  const nove = kandidati.sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, MAX_NOVYCH);

  if (SKUSKA) {
    nove.forEach((n) => console.log(`  [${n.zdroj}] ${n.povodnyTitulok}${n.obrazok ? '' : ' (bez obrázka)'}`));
    return;
  }
  if (nove.length === 0) {
    console.log('Žiadne nové články.');
    return;
  }

  const client = new Anthropic();
  const zoznamClankov = nove
    .map((n, i) => `<clanok id="${i}">\nZdroj: ${n.zdroj}\nTitulok: ${n.povodnyTitulok}\nText: ${n.popis}\n</clanok>`)
    .join('\n\n');

  const odpoved = await client.messages
    .stream({
      model: MODEL,
      max_tokens: 32000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `<profil_vkusu>\n${await profilVkusu()}\n</profil_vkusu>\n\n<clanky>\n${zoznamClankov}\n</clanky>`,
        },
      ],
    })
    .finalMessage();

  if (odpoved.stop_reason !== 'end_turn') {
    throw new Error(`Spracovanie sa nedokončilo (stop_reason: ${odpoved.stop_reason}).`);
  }
  const blok = odpoved.content.find((b) => b.type === 'text');
  const { clanky } = JSON.parse(blok.text);

  const pridane = new Date().toISOString();
  const spracovane = clanky
    .filter((c) => !c.duplikat && nove[c.id])
    .map((c) => {
      const n = nove[c.id];
      return {
        odkaz: n.odkaz,
        zdroj: n.zdroj,
        datum: n.datum,
        pridane,
        obrazok: n.obrazok,
        povodnyTitulok: n.povodnyTitulok,
        titulok: c.titulok,
        zhrnutie: c.zhrnutie,
        stitok: c.stitok,
        mikroznacka: c.mikroznacka,
        sediKVkusu: c.sediKVkusu,
        preco: c.preco || null,
      };
    });

  const drzatOd = Date.now() - DRZAT_DNI * 864e5;
  const vysledok = [...spracovane, ...existujuce]
    .filter((c) => new Date(c.datum).getTime() > drzatOd)
    .sort((a, b) => b.datum.localeCompare(a.datum))
    .slice(0, 200);

  await writeFile(SUBOR_NOVINIEK, JSON.stringify(vysledok, null, 2) + '\n');
  console.log(`Pridaných ${spracovane.length} článkov, spolu ${vysledok.length}. Tokeny: ${odpoved.usage.input_tokens} vstup, ${odpoved.usage.output_tokens} výstup.`);
}

main().catch((e) => {
  if (e instanceof Anthropic.APIError) console.error(`Chyba Claude API ${e.status}: ${e.message}`);
  else console.error(e);
  process.exit(1);
});
