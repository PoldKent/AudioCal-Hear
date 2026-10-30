# Historial de cambios

[English](CHANGELOG.md) | **Español**

## v1.4 — 2026-10-30

- Tres rondas opcionales de preferencias musicales A/B (graves, voces y agudos), guardadas por separado del examen auditivo.
- Aviso de frecuencias sin umbral utilizable y opción de repetir solo esas bandas.
- Los cambios manuales de EQ ya no reinician la reproducción de música.
- Aviso del rango ±6 dB exclusivamente para el ecualizador original de automóvil de 7 bandas.
- Advertencias más claras sobre el uso de volumen cómodo y los límites de precisión.

## v1.3 — 2026-10-30

- Nueva prueba adaptativa: saltos de hasta 6 dB al principio y ajustes de 1 dB al final, con 3 segundos de escucha por nivel.
- Máximo de 42 segundos en la primera pasada; la verificación opcional añade hasta 15 segundos: **57 segundos por frecuencia y oído**.
- Una pasada por defecto y actualización de los avisos de duración y las indicaciones del examen.
- Si no se encuentra el umbral, se registra como no determinado, sin inventar un resultado.
- Se conservan los perfiles guardados anteriormente.

## v1.2 — 2026-10-30

- Aviso de duración estimada en Configuración, actualizado al elegir bandas, canales, repeticiones o frecuencias propias.
- Máximo del barrido calculado a partir de 41 niveles × 3 segundos × número de muestras.
- Tiempo pendiente visible en el examen; estimación personalizada a partir de dos umbrales medidos, cuando existan.
- Se registra el tiempo de cada prueba, manteniendo la compatibilidad con perfiles anteriores.
- Sin cambios en el motor de generación de tonos ni en el algoritmo de EQ.

## v1.1 — 2026-10-30

- 3 segundos por nivel, descenso de 1 dB y visualización de la cuenta regresiva.

## v1.0 — 2026-10-30

- Examen auditivo con tonos descendentes, perfiles y resultados en dB.
- Perfiles de ecualizadores de 7 y 10 bandas, estándares adicionales y personalizado.
- Escucha A/B con archivo de audio local, exportación e importación.