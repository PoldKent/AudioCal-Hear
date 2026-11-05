# Hear 3.0 — D-057 P0: control previo de compatibilidad Web Audio y fallback sin sonido

**Fecha:** 05/11/2026. **Estado:** piloto de seguridad por detección de funciones; no certificación de hardware ni validación de navegador completo. [Issue maestro #30](https://github.com/PoldKent/AudioCal-Hear/issues/30), decisiones D-003/D-006/D-035/D-037/D-054–D-058/D-062/D-063.

## Alcance

El módulo `src/hear3/audio-capability-preflight.mjs` verifica **sin construir un contexto Web Audio ni iniciar sonido** que el navegador tiene un constructor `AudioContext` (o `webkitAudioContext`) y expone las funciones necesarias para crear un oscilador y controlar digitalmente la ganancia. También registra por separado la disponibilidad opcional de `resume()` y `createStereoPanner()`. La selección de hardware, separación L/R, nivel físico y validación acústica permanecen expresamente **no verificadas**. La presencia estática de estos métodos no garantiza que funcionen al invocarlos, que haya salida audible ni que existan dispositivos conectados; el runner existente revalida el estado y protege los límites de dBFS al iniciar.

En el piloto integrado `tests/fixtures/hear3-integrated-exam-pilot.html` la falta de funciones **esenciales**:

- Deshabilita iniciar el barrido, emitir el siguiente tono individual, iniciar una comparación contextual o reanudar un examen pausado hasta disponer de las capacidades necesarias.
- Explica en texto y `role=status` qué función técnica falta; no identifica por nombre de navegador ni inventa una salida de audio.
- Mantiene accesibles, cuando existan, el historial, la lectura de un checkpoint, la exportación/gestión de datos y el catálogo V3 a través de su página independiente. El botón para detener cualquier audio observado **no** se bloquea por el preflight.
- No crea un oscilador por restaurar, cargar, inspeccionar o mostrar el error. El audio sigue requiriendo una acción explícita y los límites digitales de la sesión permanecen sin alteraciones.

Se añade el módulo al manifiesto **optativo** offline (33 recursos estáticos V3) y al servidor de pruebas; no se instala nada automáticamente ni se tocan datos V2.

## Pruebas

- `tests/hear3-audio-capability-preflight.test.mjs`: constructor ausente, ganancia/oscilar ausentes, rutas digitales independientes como capacidad *opcional*, errores de acceso a métodos que no revelan mensajes privados, fallback WebKit, no reproducción ni instanciación de Web Audio.
- `tests/browser/hear3-audio-feature-gate.spec.cjs`: ausencia total de Web Audio, oscilador sin control de ganancia, detección permitida sin autoplay y explicación accesible, preservando consulta de catálogo sin audio. Suite Android Chromium, iPhone WebKit y escritorios.
- Regresiones previas del examen, barrido y recuperación deben continuar pasando; detectar APIs no basta para afirmar audio correctamente emitido.

## Lo que queda pendiente

La política D-057 aún requiere pruebas funcionales reales y alternativas por salida/ruta efectiva; D-035 separación de canales L/R y confirmación perceptiva; D-054–D-056 suspensión y cambios Bluetooth; D-058 WCAG con lectores reales; D-062 rendimiento en equipos modestos. Un navegador puede exponer la API y aun así fallar por permisos, estados de suspensión, rutas o hardware, por lo que se detiene y comunica error durante reproducción. Nunca inferir dB SPL a partir de dBFS.

**D-063=C permanece abierto.**

## Reversión

Revertir el PR retira la indicación y el preflight, conservando los módulos de Web Audio con comprobaciones al momento de reproducir y los datos de las sesiones V3. No altera Hear 2.0 ni las copias guardadas.
