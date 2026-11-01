# AudioCal Hear V2 — alternativa independiente

**Rama**: `feat/hear-v2-user-first-20261101`. **Estado**: experimento en PR de borrador, no fusionar en main hasta completar validación funcional y auditiva real.

## El contrato de producto (no negociable)

1. El usuario elige su dispositivo y un **ecualizador real**: formatos habituales de 2 a 31 bandas o frecuencias propias. Los formatos genéricos son orientativos y requieren coincidencia con las frecuencias del equipo.
2. Realiza un **test auditivo obligatorio por frecuencia**. Se conserva la búsqueda adaptativa de umbral, las respuestas, la confianza y el progreso.
3. Recibe una tabla por frecuencia: umbral observado (dBFS), incertidumbre y **recomendación de EQ** (dB y posición cuando la equivalencia esté verificada). El resultado neutral es válido si la evidencia no respalda una corrección.
4. Los controles físicos pueden ser de −6 a +6 posiciones u otros rangos compatibles. Las equivalencias de 1, 2, 3 y 4 dB por paso **deben ser declaradas**, no inferidas del número de bandas. En ausencia de equivalencia se muestra «sin conversión fiable».
5. La música A/B es **opcional** y posterior al resultado.
6. En auto y parlantes, el micrófono del celular puede aportar evidencia complementaria. No reemplaza el oído, no mide SPL calibrados y todavía **no genera correcciones automáticas**.

## Riesgos conocidos y pruebas faltantes

- Se debe probar en hardware real el enrutamiento de audio Bluetooth, la procedencia del micrófono, la latencia y el DSP de teléfonos. Un pico espectral puede resultar de otras fuentes y no certifica la respuesta del equipo.
- El test de umbral digital no mide por sí solo la sensibilidad auditiva clínica ni determina una ecualización perceptualmente óptima.
- La preferencia por las recomendaciones, la respuesta con EQ real y la tasa de satisfacción deben verificarse mediante pruebas controladas; no se reportan porcentajes sin evidencia.
- El reconocimiento automático de modelos y lectura de fotografías de ecualizadores **todavía no está implementado**. Los formatos de ejemplo permiten selección manual.
- Las rutas de validación iOS, Android y escritorio deben pasar antes de presentar la alternativa como lista.

## Arquitectura

Se reutilizan la base v1.10.0, perfiles locales, lógica de umbrales y recomendaciones conservadoras, reproductor A/B, transferencia guiada, exportación y tarjeta horizontal. Las nuevas mejoras modifican módulos fuente `src/js`, se recompilan a `index.html` y se comprueban con GitHub Actions.

`main` y GitHub Pages oficial permanecen sin cambios por esta rama.

## Protección de datos de la versión oficial

La rama V2 escribe en el espacio local independiente `audiocal-hear-v2-profiles-preview`. Si está vacío puede leer una copia de perfiles de `audiocal-hear-profiles-v1`, pero **nunca escribe sobre esa clave oficial**. El importador y exportador JSON se conservan. La rama no se despliega ni fusiona automáticamente con `main`.

## Integración de sonoridad en una sola pasada

En perfiles V2 nuevos, tras el umbral digital de cada banda Hear reproduce **una pareja de tonos** (1 kHz y la frecuencia actual), con un solo toque y nivel digital acotado. El usuario elige el primero, el segundo o ambos parecidos; Hear hace hasta **tres comparaciones** cortas con ajustes internos, sin modificar el volumen físico ni pedir dBFS. La frecuencia de referencia no necesita compararse consigo misma. La falta de audibilidad o de margen seguro se guarda como «no concluyente» y no detiene el test. Cada respuesta queda asociada a `frecuencia|canal|pasada`, incluso tras recargar la página.

Las nuevas observaciones se guardan en `inlineLoudness`, separadas de umbrales, de datos históricos opcionales y de los controles del ecualizador. La tabla del resultado muestra el estado por banda. **No se interpretan automáticamente como ganancia EQ**, porque no son una medición acústica calibrada ni una desviación demostrada respecto a la sonoridad natural. La sección independiente «Igualación de sonoridad» desaparece de la interfaz.

Las observaciones antiguas no se pierden ni se reescriben. La continuación de perfiles antiguos no obliga a rehacer todo el test.
