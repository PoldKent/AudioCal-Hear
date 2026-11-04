# Hear 3.0 — Puerta P0 de interrupciones y evidencia de audio

**Origen:** [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30). **Incremento:** PR #35, 4/11/2026.

## P0 que protege este cambio

- **D-006=A y D-037:** progresión digital únicamente dentro de rangos previamente autorizados; el barrido exploratorio conserva su límite **−42 dBFS**, sin convertirlo en garantía de exposición segura en dB SPL.
- **D-028–030:** el barrido sirve para **orientar** comprobaciones posteriores, sin inventar umbrales ni ganancias EQ.
- **D-054–056:** ningún tono individual ni barrido debe continuar silenciosamente ante suspensión del contexto, abandono de página o cambio de salida; la respuesta de un tono con reproducción no verificable se invalida.
- **D-057:** las APIs necesarias deben existir y funcionar; si desaparecen durante el examen, se pausa el flujo correspondiente.
- **D-063:** requisito P0 no queda verificado por el simple hecho de superar las pruebas unitarias.

## Comportamiento implementado en este incremento

1. El piloto de barrido marca explícitamente `userInitiated: true` al recibir el clic del usuario; el módulo rechaza llamadas de inicio sin esa marca. Esta comprobación de software **no demuestra por sí sola la procedencia humana del gesto**; la interfaz debe mantener el vínculo explícito.
2. El barrido escucha `AudioContext.statechange`; si el contexto deja de ejecutarse, se silencia, se invalidan operaciones pendientes y se conserva el estado interrumpido. No se permite registrar observaciones si `context.state !== "running"` o si la página está oculta.
3. El adaptador de tonos individuales también responde a suspensión del contexto con parada y aviso al controlador.
4. Ante una respuesta durante suspensión que todavía no disparó el evento `statechange`, el controlador **no registra** "heard" ni "not-heard"; silencia, invalida la medición pendiente y exige recuperación manual.
5. Los listeners de contexto se retiran durante la limpieza; los callbacks de interrupción no pueden impedir la parada del audio.

## Evidencia automatizable

- Node: `tests/hear3-sweep-audio-runner.test.mjs` (14 casos), `tests/hear3-web-audio-adapter.test.mjs` (8 casos), `tests/hear3-audio-session-controller.test.mjs` (10 casos).
- Navegador: `tests/browser/hear3-sweep-pilot.spec.cjs` y `tests/browser/hear3-audio-pilot.spec.cjs` incluyen casos de suspensión, interrupción y ausencia de respuestas inventadas.
- CI `npm run verify` y Playwright en Android emulado, iPhone WebKit y pantallas de escritorio. Registrar en GitHub las conclusiones por commit, no suponer aprobación antes de obtenerla.

## No verificado (no declarar P0 completo)

- **Latencia acústica real** de parada en auriculares cableados, Bluetooth, altavoces y automóvil.
- Cambios físicos de ruta, llamadas reales, suspensión de sistema operativo, auriculares de fabricantes distintos, volumen del hardware y mediciones de presión sonora SPL.
- Exactitud de los algoritmos de umbral y cálculo de ganancias EQ; límites de ganancia, fase de comparación y método de EQ conjunto D-047.
- Recuperación real de sesiones, almacenamiento, offline y privacidad de toda la aplicación.
- Cobertura integral WCAG 2.2 AA, matrices de compatibilidad y reversión de despliegue según D-063.

**Regla:** no fusionar estos cambios hasta CI verde; incluso con CI verde, esta puerta P0 sigue pendiente de validación acústica y de integración con el flujo definitivo de Hear 3.0.
