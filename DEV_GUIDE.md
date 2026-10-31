# AudioCal Hear — Developer guide / Guía de desarrollo

**English** · [Español](#español)

## English

The checked-in root `index.html` is the actual **standalone** site served by GitHub Pages. It still works without a build tool in the user's browser; no runtime dependency or remote analytics was added.

Development sources were extracted without altering that HTML, verified as a byte-for-byte identical round trip:

| Location | Role |
| --- | --- |
| `src/index.template.html` | HTML skeleton with three injection markers |
| `src/styles.css` | All styles and responsive layouts |
| `src/translations.json` | Seven translated dictionaries (Spanish originals are in UI source) |
| `src/js/01-core.js` | Application state, locale setup, profile normalization and adaptive threshold search |
| `src/js/02-setup.js` | Devices, preset selection and configuration |
| `src/js/03-hearing-test.js` | Guided hearing-test UI, playback and listening interactions |
| `src/js/04-equalization.js` | Calculations, results, EQ settings and profile views |
| `src/js/05-audio-player.js` | Music playback, filters and clipping-headroom estimates |
| `src/js/06-interactions.js` | Event handling, import/export and initialization |
| `tools/build.mjs` | Deterministic dependency-free HTML generator |
| `tests/adaptive.test.mjs` | Node unit tests run on every relevant PR/push |

The ordered JS files are **source modules in one shared closure**, not separately imported browser ES modules. This deliberately retains all pre-existing lexical bindings and avoids introducing untested module-loading changes in a single-file offline app.

### Local commands

Requires Node.js 20 or later. No `npm install` is needed.

```sh
npm run build         # regenerate index.html from sources
npm run check:build   # fail if index.html doesn't match generated output
npm test              # run behavioral unit tests
npm run verify        # run both checks above
```

Edit the source files; then commit both your edits and the regenerated `index.html`. **Do not edit the generated HTML by hand.** GitHub Actions checks source/HTML consistency and regression cases on pushes and pull requests.

### Verified by the new tests

- Adaptive threshold search resolves a 1 dB boundary.
- Still-audible at the digital floor is not silently converted to an EQ cut.
- An inaudible starting tone or contradictory verification does not invent a threshold.
- Custom digital floors are respected.
- All eight UI language choices and the original 7/10-band hardware presets remain present.
- A music-filter boost produces an estimated positive peak (headroom protection).
- The committed standalone HTML matches source output exactly.

These checks **do not establish medical/acoustic precision, real Bluetooth routing, Android/iOS compatibility, or full screen-reader accessibility**; those need separate physical tests.

## Español

El archivo `index.html` de la raíz es la **aplicación independiente** servida por GitHub Pages. El usuario puede abrirla desde su navegador sin herramientas de compilación y sin dependencias adicionales.

Se han separado las fuentes sin modificar el HTML final. Las partes de JavaScript se concatenan dentro de **la misma función envolvente**, por lo que conservan las referencias compartidas. Son módulos organizativos de desarrollo, **no módulos ES cargados por separado**.

El código está organizado en `src/`: plantilla, CSS, traducciones y seis módulos JS (núcleo, configuración, prueba auditiva, ecualización, reproductor y eventos). La reconstrucción la realiza `tools/build.mjs`.

**Comandos, con Node.js 20+ (sin instalar paquetes):**

```sh
npm run build
npm run verify
```

Al modificar fuentes, se debe regenerar y subir también `index.html`. GitHub Actions comprueba automáticamente que el archivo publicado coincide exactamente con las fuentes y ejecuta pruebas funcionales de la búsqueda de umbral, respuestas dudosas, límites digitales, idiomas y protección de audio.

**Límites:** las pruebas automatizadas no garantizan resultados auditivos correctos, seguridad de un nivel acústico real, comportamiento Bluetooth ni accesibilidad completa. Se requiere validación en dispositivos reales.

El proyecto continúa siendo de carácter propietario; revisa [LICENSE.md](LICENSE.md) y los documentos de uso.
