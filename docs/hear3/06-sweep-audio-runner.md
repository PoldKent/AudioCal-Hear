# Hear 3.0 · Fase 2B — reproducción experimental de barrido continuo

**Estado:** implementación experimental existente en el repositorio; incremento P0 de endurecimiento en PR separado. No integrada en la interfaz pública ni validada acústicamente. Relacionada con D-008, D-028–D-030, D-035, D-037, D-054–D-057 y D-063 del [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Funciones técnicas

- `src/hear3/sweep-audio-runner.mjs` programa un oscilador sinusoidal de frecuencia creciente mediante `AudioParam.exponentialRampToValueAtTime` y una envolvente de amplitud; las salidas izquierda/derecha requieren soporte real de panoramización.
- Verifica con el `AudioContext.sampleRate` activo que la frecuencia máxima sea inferior a Nyquist, en vez de confiar en un valor de ejemplo.
- Restringe las demostraciones de esta fase a un máximo **−42 dBFS y 45 segundos** por barrido, además del rango digital autorizado por el dispositivo/perfil. Estos topes son salvaguardas de desarrollo, **no equivalen a seguridad en dB SPL** ni acreditan condiciones reales de escucha.
- Exige `userInitiated: true` en cada inicio, ligado a una acción explícita del usuario en el piloto; `stop()` y los eventos de invisibilidad/salida cancelan operaciones pendientes, llevan la ganancia a cero y desconectan los nodos. Una bandera de software no demuestra por sí sola una activación humana del navegador: debe mantenerse el vínculo con el botón de la UI. El silencio físico tiene latencia dependiente del sistema, navegador y salida.
- El estado `AudioContext.statechange` interrumpe la reproducción si el contexto abandona `running`. Si el navegador suspende la salida antes de notificarlo, `recordResponse` rechaza la respuesta y silencia el barrido, evitando evidencia ficticia.
- `recordResponse` registra solamente decisiones subjetivas `true/false`, con tiempo del reloj de audio y frecuencia estimada. No se convierten en umbrales, diagnóstico ni ganancias de EQ.
- La finalización del barrido guarda un estado `completed` o `interrupted`, señalando la ausencia de inferencias clínicas; la interrupción conserva únicamente observaciones informativas.

## Lo que todavía falta

- No se ha conectado al motor de examen, los perfiles reales, el controlador de sesiones o al servicio de persistencia.
- No se ha validado acústicamente en altavoces, auriculares, Bluetooth ni equipos de automóvil.
- La duración máxima fija es una restricción temporal de este **prototipo**, no la política definitiva de D-031.
- Aún faltan integrar la UX completa del barrido, accesibilidad verificada, indicadores de progreso, interrupciones en hardware real y una auditoría de rendimiento por dispositivo. El piloto interno y las regresiones de navegador son pruebas técnicas parciales, no validación física.
- El EQ gráfico final D-047=A/C y su algoritmo D-039/D-040 siguen sin validación. No se autoriza un generador PEQ automático (D-052=A/C).

## Verificación

`node --test tests/hear3-sweep-audio-runner.test.mjs` cubre **14 pruebas unitarias** de programación de audio, límites, frecuencia, datos, cancelaciones, suspensión del contexto y limpieza. Playwright agrega un caso de suspensión que comprueba la pausa y ausencia de observaciones falsas.

Antes de su unión al flujo principal, las pruebas deberán complementarse con Playwright y dispositivos reales, evidencia de seguridad y los criterios de liberación D-063.
