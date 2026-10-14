# Kaliber

Osobný archív mikroznačiek hodiniek na [kaliber.kucerka.sk](https://kaliber.kucerka.sk). Statický web v Astro, hostovaný na GitHub Pages.

## Ako pridať hodinky

Najjednoduchšie: pošli Claudovi odkaz na hodinky. Claude založí súbory, doplní údaje a text o značke a zmenu nahrá na GitHub. Web sa do pár minút prebuduje sám.

Ručne: nový súbor v `src/content/hodinky/` podľa vzoru existujúcich. Ak značka ešte neexistuje, pridaj aj súbor do `src/content/znacky/`. Názov súboru značky je jej identifikátor, ktorý sa píše do poľa `znacka`.

Povinné polia hodiniek: `znacka`, `model`, `stav` (`inspiracia`, `chcem` alebo `mam`), `styl`, `pridane`. Všetky ostatné sú nepovinné a prázdne sa na webe nezobrazia. Technické údaje sa píšu ako čísla bez jednotiek (mm, m, h, €).

Fotky: ulož do `public/fotky/` a v hodinkách uveď `fotky: ["/fotky/nazov.jpg"]`. Kým fotka nie je, zobrazí sa ilustrácia ciferníka vo farbe z poľa `farba`.

## Novinky

Každé ráno GitHub Actions spustí `scripts/novinky.mjs`: stiahne RSS zo zdrojov v `scripts/zdroje.json` (a z polí `rss` pri značkách), nové články nechá zhrnúť po slovensky cez Claude API a výsledok uloží do `src/data/novinky.json`. Potrebuje secret `ANTHROPIC_API_KEY` v nastaveniach repozitára. Model sa dá zmeniť premennou `KALIBER_MODEL`.

Skúška bez Claude API: `npm run novinky -- --skuska`

## Môj vkus

Štatistiky sa počítajú pri každom zostavení zo zbierky. Slovné zhrnutie, skratku a návrhy nových značiek dopĺňa Claude do `src/data/vkus.json`.

## Lokálne

```bash
npm install
npm run dev
```
