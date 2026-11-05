# Hear 3.0 — D-054/D-055/D-056: interrupción conservadora ante cambio de dispositivos de audio

**05/11/2026. Estado: protección de software con eventos del navegador, sin verificación física de ruta o volumen.** Issue maestro [#30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Cambio

El adaptador `createWebAudioToneAdapter` se suscribe, cuando está disponible, a `navigator.mediaDevices.devicechange`. Un cambio de lista de dispositivos de audio **no identifica necesariamente qué salida física cambió**: el navegador puede anunciar también un micrófono. Por seguridad se interrumpe el tono actual, se cancela cualquier reanudación Web Audio pendiente y se notifica `routeMayHaveChanged:true`.

El controlador `createHear3AudioSession` trata `devicechange`, `context-suspended` y `pagehide` como señales de ruta física potencialmente alterada. Una sesión `ready`, `playing` o `paused` vuelve a pausa y **obliga a reconfirmar salida y volumen antes de reanudar**. Una observación anterior, ya contestada y coherente, se conserva; un tono sin respuesta se invalida y no se transforma en «no escuchado». La reanudación no reproduce por sí sola nuevos tonos.

Los listener se retiran al disponer el adaptador. Cuando el navegador carece de `mediaDevices` o no emite `devicechange`, las protecciones ya existentes de visibilidad, `pagehide` y `AudioContext.statechange` siguen vigentes, **pero no se afirma detectar todos los cambios físicos**.

## Pruebas

- `tests/hear3-web-audio-adapter.test.mjs`: interrupción digital en `devicechange`, limpieza y cancelación de `context.resume()` pendiente, sin autoplay.
- `tests/hear3-audio-session-controller.test.mjs`: pérdida de confianza de ruta tras evento en estado `ready`, preservación de respuestas previas, reconfirmación manual y suspensión de contexto.
- `tests/browser/hear3-audio-pilot.spec.cjs`: evento simulado de dispositivos en navegador, tono silenciado, botón de reanudación bloqueado y necesidad de confirmar salida antes de continuar.
- Suites Node, contratos, beta Hear 2.0, Android Chromium, iPhone WebKit y escritorios 4:3 / 21:9.

## Pendientes físicos

Es imprescindible validar hardware real: rutas Bluetooth, reconexión y latencia, llamadas y mezcladores del sistema, auriculares mono/estéreo, cambios que no disparan `devicechange`, volumen físico antes y después de la reconexión, separación L/R y respuesta de audio. El evento del navegador es una **sospecha de cambio**, no medición de cuál canal real llega al oído. Las 13 auditorías D-063 siguen abiertas y el backlog #26 indica no exigir nuevas pruebas al usuario.

## Rollback

Revertir el PR vuelve al tratamiento previo de visibilidad/suspensión sin detector `devicechange` y sin la nueva exigencia automática de confirmación tras suspensión. No altera datos, EQ, Hear 2.0 ni niveles digitales.
