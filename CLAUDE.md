# Kaliber

Osobný archív hodiniek (mikroznačky) na https://kaliber.kucerka.sk. Statický web v Astro, nasadzovaný cez GitHub Actions na GitHub Pages pri každom pushi do `main`. Všetok text na webe je po slovensky.

## Pridanie hodiniek z odkazu

Najčastejšia úloha: používateľ pošle odkaz (e-shop, Kickstarter, článok) a prípadne stav. Postup:

1. Načítaj stránku a vytiahni technické údaje. Zapisuj iba to, čo je na stránke alebo v dôveryhodnom zdroji. Čo nevieš overiť, vynechaj, nedomýšľaj si.
2. Ak značka nemá súbor v `src/content/znacky/`, vytvor ho. Fakty o značke (zakladateľ, rok, mesto) over vyhľadávaním. Ak sa zdroje rozchádzajú, údaj vynechaj.
3. Vytvor súbor v `src/content/hodinky/` podľa schémy v `src/content.config.ts` a vzoru existujúcich súborov.
4. Spusti `npm run build`, aby si overil, že schéma sedí.
5. Commitni a pushni do `main`. Web sa nasadí sám do pár minút.

Stav: `chcem` (zoznam prianí), `inspiracia`, `mam` (vlastním). Ak používateľ stav nepovie, použi `chcem`.

### Pridanie z návrhov

Pokyn „Pridaj z návrhov do zoznamu prianí: <značka> <model> <odkaz>“ pochádza z tlačidla na stránke Môj vkus. Spracuj ho rovnako ako pridanie z odkazu, so stavom `chcem`. Údaje z `src/data/vkus.json` (cena, fotka, krajina) použi ako východisko, ale technické údaje over na stránke. Potom ten návrh z `navrhy` vo `vkus.json` odstráň, aby sa na stránke neukazoval dvakrát (v `historiaNavrhov` ho nechaj).

### Polia hodiniek

- Čísla bez jednotiek: `priemer`, `hrubka`, `lugToLug`, `sirkaTahu` v mm, `vodotesnost` v m, `rezervaChodu` v h, `cena` vždy v eurách (cca, pri inej mene prepočítaj aktuálnym kurzom; pôvodnú cenu daj do `cenaPovodna`, napríklad `$950` alebo `£525`). Na webe sa ceny ukazujú vždy v eurách.
- `styl`: Diver, Field, Chronograf, GMT, Dress, Športové, Pilotné, Integrovaný náramok, Iné.
- `pohon`: automat, ručný nátah, kremeň, mechakvarc, solár.
- Kde kúpiť: `odkaz`, `obchod` (doména obchodu), `dostupnost` (skladom, vypredané, predobjednávka, čoskoro, kickstarter) a `overene` (dátum overenia). Pri Shopify obchodoch zistíš dostupnosť z `<url produktu>.js`, pole `available`.
- `fotky`: URL hlavnej fotky z obchodu (bez query parametrov s verziou), alebo vlastná fotka v `public/fotky/` ako `/fotky/nazov.jpg`.
- `farba` (a pri diveroch `luneta`): hex farba ciferníka pre ilustráciu, keď fotka chýba.
- Telo súboru je osobná poznámka používateľa. Nechaj prázdne, ak ju nepovedal.

### Text o značke

Tri odseky: kto a odkiaľ, čím je značka známa, a sekcia `## Prečo stojí za pozornosť`. Vecne, s nadšením, bez reklamných fráz.

## Typografia

- Nepoužívaj pomlčky (– ani —), iba spojovník, ak je nutný.
- Jednotky a percentá bez medzery: 39mm, 200m, 42h, 20%.
- Bez emoji.

## Ďalšie

- `src/data/vkus.json`: slovné zhrnutie vkusu, skratka a 6 návrhov konkrétnych hodiniek. Každý pondelok ho prepíše `scripts/navrhy.mjs` (GitHub Actions, Claude API s web search, prednostne európske značky). Ručne ho uprav iba na požiadanie.
- `src/data/novinky.json` generuje každé ráno `scripts/novinky.mjs` (GitHub Actions, Claude API). Ručne ho needituj.
- Na webe iba natívne systémové fonty, žiadne externé fonty.
