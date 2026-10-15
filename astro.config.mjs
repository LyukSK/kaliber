import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kaliber.kucerka.sk',
  // Štýly priamo v stránke: stránka z medzipamäte prehliadača tak nikdy
  // neodkazuje na CSS súbor, ktorý po novom nasadení už neexistuje.
  build: { inlineStylesheets: 'always' },
});
