# Hear 3.0 — P0, primer orquestador integrado barrido → tonos discretos

**Fecha:** 2026-11-05. **Estado:** piloto experimental, no motor auditivo validado para producción.

## Decisiones trazadas

D-003, D-004, D-006=A, D-008, D-021, D-028–D-034, D-037, D-038, D-054–D-057 y D-063 del [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Implementación y alcance

- `src/hear3/adaptive-discrete-exam.mjs` recibe un plan procedente del barrido y el controlador Web Audio existente. Recorre las bandas reales en orden inicialmente ascendente y exige una acción explícita antes de reproducir cada tono del piloto.
- Todas las transiciones de audio, las respuestas y el silenciamiento se delegan al controlador verificado `createHear3AudioSession`. No se aceptan respuestas de sonido que todavía no ha empezado, quedó suspendido o fue interrumpido. Un tono sin respuesta no se convierte automáticamente en «no oído».
- Después de cada respuesta, se planea el siguiente nivel digital **dentro del rango autorizado**. El prototipo empieza en `-60 dBFS`, utiliza una búsqueda de paso de `6 dB` y un límite de `7` intentos por banda. Estos son parámetros **experimentales** explícitos, no el algoritmo ni la política acústica definitivos.
- Cuando existen observaciones coherentes «no lo oí» a un nivel inferior y «lo oí» a uno superior, se conserva un **intervalo de informes subjetivos**, no un número de umbral. Si el intervalo se estrecha se pide una verificación selectiva en el nivel audible. Si contradice un registro, la repetición exige confirmación; si se rechaza, la banda queda inconclusa.
- Al alcanzar el límite digital autorizado sin detectar un tono, la banda queda **inconclusa**. No existe ampliación de límite, cambios de volumen físico, recomendaciones EQ ni inferencias de SPL.
- `tests/fixtures/hear3-integrated-exam-pilot.html` incluye barrido experimental de 125 a 2.000 Hz (20 s máximo, `-60 dBFS`), respuesta durante el barrido, activación solo al finalizar, navegación de tonos, interrupción/reanudación manual, confirmación explícita de contradicciones y resumen de evidencia. Una visita no inicia audio.
- La web `hear3-preview/` incorpora el quinto piloto como una función **experimental**; Hear 2.0 permanece intacto.

## Evidencia y pruebas

- Node: orden, rangos, progreso, registro confirmado, ajuste digital, intervalo subjetivo, repetición selectiva, contradicciones, rechazo de reproducción suspendida, pausas y asincronía, límites físicos no acreditados y resultado inconcluso.
- Playwright: ningún audio sin pulsar el botón, finalización del barrido antes del examen, flujo simulado de audio sin salida física, interrupción que impide continuar y preservación de perfiles V2.
- GitHub Actions: `npm run verify`, contratos V3, paquete beta V2 y regresión Android Chromium 9×21, iPhone WebKit, desktop 4:3 y 21:9. No aceptar PR con checks fallidos/pendientes.

## Pendientes que no se deben dar por completados

- Integración de los checkpoints del controlador con el examen adaptativo y restauración de su estado de planificación; reanudar nunca debe iniciar sonido automáticamente.
- Método D-036 de comparaciones perceptivas consecutivas cuando se necesiten y UX final D-021/D-031 con seguimiento visual exacto del tiempo y frecuencia, botones adaptados, volver atrás y accesibilidad WCAG.
- D-039–D-041 y D-047: investigación reproducible de algoritmos EQ y magnitudes; no ofrecer ganancia a partir del barrido o de intervalos incompletos sin validación. Ningún EQ se calcula en este piloto.
- Perfil real y dispositivo, canales L/R verificados, rutas, límites digitales por categoría, hardware y calibración física. La versión pública no debe declarar seguridad acústica en SPL por utilizar topes dBFS.
- Compatibilidad con datos y migración V2, gestión de concurrencia de perfiles, borrado global y privacidad D-059, offline completo D-060 y D-063.

**Estado de publicación:** beta técnica visible, no Hear 3.0 estable. D-063=C permanece como puerta de lanzamiento. Conservar todas las decisiones D-001 a D-063.

## Reversión

Revertir el PR retira el orquestador, el quinto piloto y su enlace, sin modificar el comportamiento de Hear 2.0 ni borrar perfiles o datos V2/V3. Comprobar retorno de las rutas anteriores, `npm run verify` y pruebas móviles.
