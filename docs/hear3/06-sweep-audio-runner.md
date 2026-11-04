# Hear 3.0 · Fase 2B — reproducción experimental de barrido continuo

**Estado:** implementación experimental aislada en PR. No integrada en la interfaz pública ni validada acústicamente. Relacionada con D-008, D-028–D-030, D-035, D-037, D-054–D-057 y D-063 del [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Funciones técnicas

- `src/hear3/sweep-audio-runner.mjs` programa un oscilador sinusoidal de frecuencia creciente mediante `AudioParam.exponentialRampToValueAtTime` y una envolvente de amplitud; las salidas izquierda/derecha requieren soporte real de panoramización.
- Verifica con el `AudioContext.sampleRate` activo que la frecuencia máxima sea inferior a Nyquist, en vez de confiar en un valor de ejemplo.
- Restringe las demostraciones de esta fase a un máximo **−42 dBFS y 45 segundos** por barrido, además del rango digital autorizado por el dispositivo/perfil. Estos topes son salvaguardas de desarrollo, **no equivalen a seguridad en dB SPL** ni acreditan condiciones reales de escucha.
- Exige inicio explícito; `stop()` y los eventos de invisibilidad/salida cancelan operaciones pendientes, llevan la ganancia a cero y desconectan los nodos. El silencio físico tiene latencia dependiente del sistema, navegador y salida.
- `recordResponse` registra solamente decisiones subjetivas `true/false`, con tiempo del reloj de audio y frecuencia estimada. No se convierten en umbrales, diagnóstico ni ganancias de EQ.
- La finalización del barrido guarda un estado `completed` o `interrupted`, señalando la ausencia de inferencias clínicas; la interrupción conserva únicamente observaciones informativas.

## Lo que todavía falta

- No se ha conectado al motor de examen, los perfiles reales, el controlador de sesiones o al servicio de persistencia.
- No se ha validado acústicamente en altavoces, auriculares, Bluetooth ni equipos de automóvil.
- La duración máxima fija es una restricción temporal de este **prototipo**, no la política definitiva de D-031.
- Aún faltan UX del barrido, accesibilidad, indicadores de progreso, tests reales de interrupciones y pruebas de navegadores para esta ruta específica.
- El EQ gráfico final D-047=A/C y su algoritmo D-039/D-040 siguen sin validación. No se autoriza un generador PEQ automático (D-052=A/C).

## Verificación

`node --test tests/hear3-sweep-audio-runner.test.mjs` cubre 11 pruebas de programación de audio, límites, frecuencia, datos, cancelaciones, fugas y limpieza.

Antes de su unión al flujo principal, las pruebas deberán complementarse con Playwright y dispositivos reales, evidencia de seguridad y los criterios de liberación D-063.
