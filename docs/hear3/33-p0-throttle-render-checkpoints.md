# Hear 3.0 — D-062 P0: desacoplar lectura de almacenamiento del render de audio

**Fecha:** 05/11/2026. **Estado:** optimización incremental de código con pruebas en navegador simulado. No hay mediciones físicas de latencia, consumo CPU o clipping acústico. Issue maestro [#30](https://github.com/PoldKent/AudioCal-Hear/issues/30), decisiones D-054/D-057/D-058/D-060/D-062/D-063.

## Problema y solución

El piloto integrado actualiza los indicadores de frecuencia, nivel digital, tiempo y respuesta aproximadamente **cada 120 ms** para acompañar el barrido o tono. Antes de este PR, cada tick ejecutaba `progressStore.load()`: leía hasta cuatro slots de `localStorage/sessionStorage`, verificaba checksums, parseaba JSON y potencialmente volvía a construir un estado completo aunque no existiera actividad ni cambios. Además `exam.snapshot()` podía ejecutarse dos veces por tick. En equipos lentos o catálogos crecientes, este trabajo síncrono puede competir con eventos de UI y Web Audio.

La nueva función pura `src/hear3/read-throttle.mjs` conserva la última inspección de almacenamiento durante un intervalo máximo de **1 segundo** para visualización. Las llamadas a `render()` frecuentes reutilizan el mismo resultado cuando nada requiere revisar la persistencia. **Todas las acciones explícitas del usuario invalidan inmediatamente la caché en `run().finally`**, por lo que el control de recuperar/exportar y las advertencias de durabilidad reflejan el estado posterior a una acción sin esperar al siguiente segundo. Las modificaciones externas desde otra pestaña se observan en la próxima comprobación periódica, no se consideran una transacción inmediata.

Se reutiliza una sola llamada a `exam.snapshot()` por render; no se modifica el algoritmo, los niveles digitales, los tiempos de Web Audio ni las respuestas subjetivas.

## Pruebas

- `tests/hear3-read-throttle.test.mjs`: llamadas de 120 ms reutilizan cache, invalidación manual, forzar actualización, retroceso de reloj monotónico y reintento tras fallo de lectura. Ninguna lectura fallida queda marcada como verificada.
- `tests/browser/hear3-ui-storage-throttle.spec.cjs`: instrumenta `Storage.prototype.getItem` sin modificar los valores, prueba que ~9 ticks no producen ~9 inspecciones completas; verifica que la primera reproducción autorizada habilita inmediatamente la exportación del checkpoint y conserva los límites de evidencia. Web Audio es simulado, no se emite sonido físico.
- El módulo queda en allowlist local y en el **manifiesto offline optativo V3** para evitar dependencias rotas al navegar sin conexión.

## Límites pendientes

Esta mejora reduce un tipo de trabajo síncrono; no es una medición de FPS, CPU, latencia acústica, garbage collection ni jitter de scheduling. Deben medirse tiempos en Android/iOS/desktop modestos con Web Audio real y métricas predefinidas, incluyendo fondo/primer plano y saturación de almacenamiento.

La mitigación de D-062 sigue incompleta: limitar cargas visuales según evidencia de retrasos observables, pausar si se compromete la validez del audio y ensayar realmente las interrupciones físicas. La auditoría WCAG D-058 y la condición D-063=C siguen abiertas.

## Rollback

Revertir este PR restaura la lectura en cada render, sin eliminar datos ni modificar sesiones o Hear 2.0. La caché es exclusivamente en memoria de UI: no persiste ni transmite datos.
