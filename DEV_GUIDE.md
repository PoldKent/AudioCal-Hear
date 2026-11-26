# AudioCal Hear — Developer guide / Guía de desarrollo

[English](#english) · [Español](#español)

## English

The current website is **Hear 3**, a static modular application on [GitHub Pages](https://poldkent.github.io/AudioCal-Hear/), with no runtime package installation or application backend. Use Node.js 22, the CI baseline.

| Path | Purpose |
|---|---|
| `src/hear3-entry.html` | Public entry source, copied byte for byte to `index.html` |
| `src/hear3/` | Browser ES modules, audio, EQ, data, translations, CSS |
| `hear3-*/index.html` | Secondary routes, privacy, history, exam and restore |
| `hear3-offline-manifest.json`, `hear3-offline-sw.js` | Explicitly enabled static offline cache |
| `src/index.template.html`, `src/js/`, `src/styles.css`, `src/translations.json` | Historical Hear 2 source, built into `hear2/index.html` for recovery |
| `tools/build.mjs`, `tools/audit-hear3.mjs` | Deterministic build and static repository audit |
| `tests/`, `tests/browser/` | Unit, contract and Playwright regression tests |

```sh
npm run build
npm run verify
npm run beta
```

Use the URL printed by the server. For Playwright install the pinned development runner (`npm install --no-save --ignore-scripts @playwright/test@1.56.1`) and matching browsers, then run `npm run test:browser`. CI uses the matching container. Keep source/generated HTML identical, increment offline cache versions together for public changes and preserve safety consent, original observations and scoped local storage. Never commit private records, photos, credentials or backups.

## Español

La web actual es **Hear 3**, aplicación estática modular en [GitHub Pages](https://poldkent.github.io/AudioCal-Hear/), sin instalación de dependencias en ejecución ni backend propio. Usa Node.js 22, referencia de CI.

| Ruta | Propósito |
|---|---|
| `src/hear3-entry.html` | Fuente pública, copiada byte a byte a `index.html` |
| `src/hear3/` | Módulos ES, audio, EQ, datos, traducciones y CSS |
| `hear3-*/index.html` | Rutas secundarias, privacidad, historial, examen y restauración |
| `hear3-offline-manifest.json`, `hear3-offline-sw.js` | Caché estática sin conexión de activación expresa |
| `src/index.template.html`, `src/js/`, `src/styles.css`, `src/translations.json` | Fuentes históricas de Hear 2, generadas en `hear2/index.html` para recuperación |
| `tools/build.mjs`, `tools/audit-hear3.mjs` | Compilación reproducible y auditoría estática |
| `tests/`, `tests/browser/` | Pruebas unitarias, contratos y regresiones Playwright |

```sh
npm run build
npm run verify
npm run beta
```

Usa la URL impresa por el servidor. Para Playwright instala la versión de desarrollo fijada (`npm install --no-save --ignore-scripts @playwright/test@1.56.1`) y navegadores correspondientes, luego ejecuta `npm run test:browser`. CI utiliza el contenedor correspondiente. Mantén la igualdad fuente/HTML generado, actualiza juntas las versiones de caché en cambios públicos y conserva el consentimiento, observaciones originales y almacenamiento delimitado. No subas perfiles, fotos privadas, credenciales ni respaldos.

[Audit / Auditoría](AUDIT.md) · [CI](https://github.com/PoldKent/AudioCal-Hear/actions) · [Contribution policy / Colaboración](CONTRIBUTING.es.md). CI does not establish physical calibration or complete accessibility / CI no establece calibración física ni accesibilidad integral.
