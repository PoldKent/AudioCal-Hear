# Hear 3.0 — D-036 P0: comparación perceptiva contextual de dos tonos

**Fecha:** 2026-11-05. **Estado:** incremento de investigación dentro del piloto integrado, sin calibración acústica real ni EQ definitivo. Decisiones D-003, D-004, D-006, D-021, D-028–D-038, D-054–D-058 y D-063 del [issue maestro #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Implementación

- `src/hear3/contextual-tone-comparison.mjs` controla la secuencia de dos tonos individuales de una frecuencia con niveles digitales diferentes, ambos **dentro del rango previamente autorizado**. La secuencia requiere **una acción explícita** para empezar; al terminar el primero, el segundo se prepara automáticamente, con separación silenciosa breve, **solo si** el contexto sigue activo/visible, la ruta observable es consistente y el controlador no recibió una interrupción.
- El módulo no abre música A/B, no genera nuevas ganancias EQ, no calcula umbrales audiométricos, ni eleva límites digitales. Los dBFS siguen sin equivaler a dB SPL. El paso de niveles `±3 dBFS` es **de prototipo** y no está aprobado como test psicoacústico validado.
- Si el usuario detiene la secuencia, pierde visibilidad, se suspende Web Audio o falla el segundo tono, el estado termina **interrumpido, sin respuesta registrada**. No se reanuda el audio automáticamente al regresar o recuperar un checkpoint. La reproducción en dos pasos queda separada del controlador de umbrales, no convierte la preferencia en evidencia de audibilidad.
- En `tests/fixtures/hear3-integrated-exam-pilot.html`, una respuesta contradictoria habilita **«Confirmar y comparar dos tonos»**. Al pulsarlo se producen ambos sonidos de manera consecutiva y, al terminar los dos, aparece una elección contextual simple: primero más claro, segundo más claro, similares, ninguno o no estoy seguro. El usuario puede detener el audio durante la secuencia.
- La respuesta de comparación se mantiene como un registro experimental en memoria de la página, **NO** se archiva en un resultado clínico, no altera perfiles existentes ni reemplaza la evidencia `heard/not-heard`. Cuando la respuesta indica «ninguno» o «no estoy seguro», el examen conserva la banda como inconclusa. Para otras respuestas, el usuario ha confirmado una repetición explícita, pero no se deduce automáticamente un umbral.
- No se invocan comparaciones si no existe una contradicción verificable; no se agregan pasos de comparación manual ni se cambia Hear 2.0.

## Evidencia de pruebas

- `tests/hear3-contextual-tone-comparison.test.mjs`: petición explícita, validación de rangos, reproducción secuencial, orden A/B, respuesta solo al finalizar ambos, ausencia de autoplay, interrupción manual, cambio de ruta/visibilidad, bloqueo ante suspensión, reinicio explícito y neutralidad clínica/EQ.
- `tests/browser/hear3-contextual-comparison.spec.cjs`: Web Audio simulado (ninguna salida física), contradicción real de cinco respuestas, dos tonos tras **un solo click**, respuesta contextual y manejo de incertidumbre, sin audio tras recarga.
- Ejecutar la matriz Android, iPhone y escritorio y la suite completa Node antes del merge; el uso de mocks no valida calidad, amplitud acústica, latencia Bluetooth ni seguridad auditiva.

## P0 todavía pendiente

- D-036 queda **parcial**: está conectada una comparación contextual tras contradicciones en el piloto, pero sigue pendiente decidir inteligentemente otros casos de comparación, restaurar información de comparación dentro del progreso cuando aporte evidencia, protocolos sobre canales L/R reales y validación perceptiva con hardware.
- D-039–D-041: hay investigación de tres modelos EQ, **ninguno seleccionado ni integrado** con una política aprobada de ganancia/headroom y pruebas de oído/dispositivo real.
- D-054–D-056: la interrupción, salida y ruta necesitan ensayo físico, especialmente Bluetooth/llamadas/suspensión. La capacidad Web Audio no prueba identidad de salida ni SPL.
- D-058, D-060 y D-063: falta auditoría de accesibilidad WCAG con lectores reales, funcionamiento offline completo y matriz de hardware/rollback para autorizar la versión estable.

## Rollback

Revertir el PR elimina el módulo y controles de comparación del piloto. La evidencia de tonos individuales y el catálogo V3 no se cambian; no se destruyen los datos de Hear 2.0. Verificar que el flujo anterior de confirmar/omitir contradicción y la parada inmediata del audio continúen disponibles antes de retirar el experimento.
