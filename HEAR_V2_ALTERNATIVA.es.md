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
