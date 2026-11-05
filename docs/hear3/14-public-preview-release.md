# Hear 3.0 — Publicación de vista previa experimental (05/11/2026)

**Fuente de alcance:** [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30), decisiones D-001–D-063 aprobadas. Este incremento publica únicamente pilotos técnicos ya integrados en `main`; **no** altera la condición de lanzamiento estable D-063=C.

## Destinos web

- **Principal:** `https://poldkent.github.io/AudioCal-Hear/` — sigue siendo Hear 2.0, con datos V2 intactos.
- **Vista previa:** `https://poldkent.github.io/AudioCal-Hear/hear3-preview/` — índice público independiente con enlaces a pilotos.
- **Pilotos:** `tests/fixtures/hear3-audio-pilot.html`, `hear3-sweep-pilot.html`, `hear3-catalog-pilot.html` y `hear3-legacy-v2-pilot.html`. Los módulos están en `src/hear3/` y las rutas son relativas al repositorio publicado en GitHub Pages.

## Qué queda publicado

1. **Tono individual:** tono de prueba, respuestas, detención y checkpoints sin reproducción automática en recuperación; sin acreditación de nivel físico.
2. **Barrido continuo:** ejemplo subjetivo de barrido con controles de inicio y parada; no produce umbrales/EQ.
3. **Catálogo V3:** resumen de perfiles y resultados, respaldos locales, importación consentida y lector del último resultado por perfil. No es interfaz completa de perfiles.
4. **Historial V2:** auditoría y respaldo exacto de los datos históricos en modo solo lectura, sin transformarlos en mediciones V3.

La web principal únicamente incorpora un anuncio y enlace. El código y la experiencia oficial de Hear 2.0 se conservan. Los pilotos están etiquetados como experimentales, no certificados.

## Protección de datos y límites

- No es una audiometría clínica ni un calibrador acústico. `dBFS` no equivale a `dB SPL`; no se acredita seguridad de auriculares o Bluetooth.
- Ningún sonido se reproduce desde el índice de vista previa ni automáticamente al abrir los pilotos. En los pilotos sonoros debe mantenerse el volumen físico bajo, cómodo y fijo, y detener ante molestias.
- Los archivos JSON de respaldo no están autenticados ni cifrados. El almacenamiento local puede ser eliminado por el navegador; los pilotos no incorporan sincronización cloud.
- La consulta del legado no borra datos; la migración opt-in del catálogo V3 solo admite metadatos compatibles y no convierte pruebas antiguas a umbrales auditivos.
- La vista previa y Hear 2.0 comparten origen del sitio; sus claves de almacenamiento son diferentes y el visitante debe confirmar operaciones de importación. La navegación nunca borra ni migra perfiles por sí misma.
- La publicación del índice no valida hardware, accesibilidad completa, offline, algoritmo EQ definitivo, políticas de privacidad integral ni el criterio de publicación estable D-063.

## Calidad y rollback

- Validar `npm run verify`, contratos V3, paquete beta V2, el HTML generado (`index.html` idéntico a fuente) y Playwright en Android Chromium 9×21, iPhone WebKit, escritorio 4:3 y 21:9.
- Nuevas pruebas de UI: presencia de enlace oficial, rutas de los cuatro pilotos, ausencia de inicio involuntario de audio y no alteración de datos V2 por navegación.
- Tras fusionar el PR, confirmar que **GitHub Pages** ejecutó `pages build and deployment` en `success` para ese commit, y revisar las rutas servidas si se dispone de consulta HTTP.
- **Reversión:** retirar el anuncio y el directorio `hear3-preview/` en un PR de rollback, sin tocar `src/js`, el catálogo local ni los perfiles V2; verificar regreso de la ruta principal y su CI. Los datos locales del usuario no se eliminan por despublicar el índice.
- Criterio de salida estable: **NO CUMPLIDO**. El enlace de vista previa no es un release 3.0 estable.
