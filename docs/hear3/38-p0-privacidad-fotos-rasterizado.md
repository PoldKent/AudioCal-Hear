# Hear 3.0 — D-044/D-059: fotografías privadas con recodificación explícita

**05/11/2026 · Estado: piloto aislado de procesamiento local, NO reconocimiento automático de EQ ni auditoría física de todos los dispositivos.** Issue maestro [#30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Protección aplicada

Se incorporó `src/hear3/private-photo-sanitizer.mjs` y la página opcional `/hear3-photo-privacy/`, accesible desde la vista previa de Hear3. El usuario **elige** un JPEG/PNG/WebP y pulsa **Procesar localmente**; no existen procesos al cargar la página, telemetría, subida de archivos, cuentas ni escritura en `localStorage`, `sessionStorage`, IndexedDB o catálogo. La selección valida tamaño máximo 8 MiB, firma binaria del formato, límite de 12 millones de píxeles al decodificar y máximo de 1600 píxeles por lado en la salida. SVG/GIF y archivos disfrazados por su extensión/MIME se rechazan antes de decodificar.

El motor decodifica a píxeles mediante `createImageBitmap`, dibuja de nuevo sobre un canvas **opaco y nuevo** y produce un PNG distinto con `canvas.toBlob('image/png')`. De este modo no copia deliberadamente los **bytes originales** ni los segmentos de metadatos EXIF, etiquetas GPS, cámara o texto embebido en el archivo origen. El navegador puede incluir metadatos normales de PNG generado (p. ej. dimensiones, espacio de color, resolución); esto **no supone que no quede información personal en la propia escena fotografiada**. Una etiqueta o dirección que aparece visualmente en los píxeles sigue apareciendo.

La vista previa utiliza una URL `blob:` creada **solo del PNG saneado**. Al cambiar/descartar archivo, salir de la página o cambiar la selección durante decodificación, la sesión invalida el resultado y revoca las URL temporales. El botón de descarga exige un nuevo clic explícito. No se almacena ninguna foto automáticamente ni se genera identificación de dispositivo, banda, Q, filtro, dB o calibración desde la imagen.

**Fallback:** si el navegador no expone decodificación o canvas PNG fiable, el proceso falla y explica el error; jamás sube la imagen a un servicio externo para compensarlo. El propio navegador puede mantener cachés o datos temporales del sistema fuera del control de la página; no se afirma borrado de almacenamiento del dispositivo ni de archivos originales.

## Accesibilidad

Pantalla con `main`, único `h1`, `label` asociada al archivo, botones nativos compatibles con teclado, estados legibles con `role=status`, errores con `role=alert`, indicación de foco `:focus-visible`, imagen con texto alternativo y respeto de `prefers-reduced-motion`. Es un incremento accesible por diseño, **no una certificación WCAG 2.2 AA con lectores de pantalla reales**.

## Pruebas

- `tests/hear3-private-photo-sanitizer.test.mjs`: inicio solo con consentimiento; firma falsa; tamaño y dimensiones excesivas; raster sin origen; invalidación concurrente durante decode; liberación y descarte.
- `tests/browser/hear3-photo-privacy.spec.cjs`: archivo PNG de prueba que contiene deliberadamente etiquetas de texto `PRIVATE_GPS_TOKEN...` y `PRIVATE_CAMERA...`; verifica que el PNG nuevo descargado no contenga esas etiquetas y que no se produzcan peticiones de subida. También comprueba controles nativos, descarte, revocación de estado y rechazo de SVG y contenido falsificado.
- Regresión general Android Chromium, iPhone WebKit y dos formatos de escritorio, además de tests Node/contratos/beta Hear2.

## Fuera de alcance

El **reconocimiento fotográfico del EQ** aún no existe. No se infiere documentación acústica a partir de una foto. También quedan por realizar revisiones exhaustivas de imágenes grandes/maliciosas, consumo de memoria en móviles reales, resultados de cámara/EXIF más diversos, lectores de pantalla físicos, verificación acústica y pruebas de privacidad del navegador con almacenamiento temporal de imágenes.

Esta página **no está en el manifiesto de caché offline optativa**: para abrirla por primera vez se necesita conexión. La caché de los otros pilotos no contiene fotografías personales ni recursos de esta función.

## Rollback

Revertir este PR retira la página, su enlace y el módulo de saneamiento; ninguna foto ni perfil V2/V3 se habrá modificado o guardado automáticamente. El borrado de archivos descargados sigue siendo responsabilidad del usuario. D-063=C continúa sin cerrar.
