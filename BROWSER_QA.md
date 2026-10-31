# Browser quality assurance / Calidad de interfaz

**English** | [Español](#español)

## English

AudioCal Hear is a self-contained web application. Its **browser-level** regression suite now checks real Chromium and WebKit browser engines under the following viewport/device emulations:

| Playwright project | Browser engine | Viewport / device |
| --- | --- | --- |
| android-9x21-chromium | Chromium, Android mobile emulation | 360 × 840 |
| iphone-webkit | WebKit, iPhone 13 emulation | iPhone 13 preset |
| desktop-4x3 | Chromium desktop | 1024 × 768 |
| desktop-21x9 | Chromium desktop | 2560 × 1080 |

The scenarios test device and EQ preset selection, estimated trial count, language changes (eight UI languages), profile creation/persistence, the three preparation screens, explicit heard/not-heard controls, the EQ editor, JSON export, page navigation, layout overflow and the microphone being optional.

### Running locally

Node.js 20+ is required. Playwright is a **development-only** test tool; visitors to AudioCal Hear don't need it.

```sh
npm run verify
npm install --no-save --ignore-scripts @playwright/test@1.56.1
npx playwright install chromium webkit
npm run test:browser
```

GitHub Actions runs the suite automatically when relevant code changes. It uploads traces/screenshots on failure.

- [Browser test workflow](https://github.com/PoldKent/AudioCal-Hear/actions/workflows/browser-ui.yml)
- [Source and behavioral tests](https://github.com/PoldKent/AudioCal-Hear/actions/workflows/source-tests.yml)
- [Manual real-device validation checklist](https://github.com/PoldKent/AudioCal-Hear/issues/1)

**Limitations:** Browser device emulation **is not testing a physical Android or iPhone**. It does not prove actual Bluetooth routing, left/right headphone output, absolute sound pressure, acoustic threshold accuracy or user comfort. The app remains a nonclinical listening assistant. Any test failures must be resolved rather than silently skipped.

## Español

Las pruebas de interfaz utilizan motores reales de Chromium y WebKit con tamaños simulados de Android 9:21, iPhone 13 y escritorios 4:3 y 21:9.

Se comprueban selección de equipos y ecualizadores, cálculo de pruebas, ocho idiomas, creación y persistencia de perfiles, preparación guiada, respuestas **«Sí lo escucho» / «Ya no lo escucho»**, editor de EQ, exportación JSON, navegación, desbordamientos y uso **opcional** del micrófono.

Para ejecutar las comprobaciones de forma local se necesita Node.js 20+ y el Playwright indicado arriba. La aplicación pública **no depende** de Playwright ni incorpora librerías adicionales para funcionar.

Los resultados se publican en [GitHub Actions](https://github.com/PoldKent/AudioCal-Hear/actions/workflows/browser-ui.yml). Ante un fallo, se conservan capturas y trazas para diagnosticarlo.

**Importante:** la emulación de navegadores no sustituye la comprobación en celulares físicos, auriculares Bluetooth ni instrumentos acústicos calibrados. Las tareas con hardware real permanecen en [la lista de validación](https://github.com/PoldKent/AudioCal-Hear/issues/1).
