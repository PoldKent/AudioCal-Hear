# Hear 3.0 — D-035/D-055 P0: comprobación subjetiva de canales de auriculares

**Fecha:** 05/11/2026. **Estado:** prototipo aislado, sin autorización de examen por oído ni certificación acústica. Referencia [issue maestro #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Objetivo e implementación

El usuario aprobó que para **auriculares** pueda existir un examen individual por oído solo después de comprobar canal izquierdo y derecho; en **altavoces y automóvil** debe mantenerse el modo apropiado al equipo, normalmente conjunto. Ante fallo o imposibilidad de comprobar separación se debe ofrecer repetir o continuar en modo conjunto. Esto no estaba representado por un procedimiento práctico en el piloto.

Se incorporan:

- `src/hear3/manual-channel-verification.mjs`: controlador aislado que genera un tono individual **solo tras una acción explícita por canal**, con confirmación del volumen físico bajo y de la salida elegida en **cada** etapa. Niveles digitales fijos de prototipo: 500 Hz, −60 dBFS y 1,25 s, sin ampliar el límite máximo autorizado de −42 dBFS. El primer tono utiliza el paneo digital izquierdo; el segundo necesita otro clic y utiliza paneo derecho. Sin control de paneo compatible, el intento falla sin afirmar que hubo verificación.
- `tests/fixtures/hear3-channel-check-pilot.html`: pantalla accesible desde la vista previa para elegir tipo de equipo, comprobar los dos canales en auriculares, indicar dónde se percibió cada tono, detener e iniciar de nuevo. En automóvil y altavoces el botón de prueba por oído queda deshabilitado y se explica **modo conjunto**. Ningún tono se reproduce por abrir, volver o recargar la página.
- El controlador solo registra respuestas **subjetivas en memoria**. Si ambas coinciden con el lado digital solicitado, muestra una **candidatura para revisión posterior** pero declara `physicalRouteValidated:false`, `perEarExamEnabled:false` y `acousticCalibration:not-established`. Esta comprobación NO activa automáticamente el examen individual por oído ni mueve resultados al catálogo. El examen integrado continúa trabajando en modo conjunto.
- Si una respuesta es incorrecta, «ambos», «ninguno» o «no sé», queda en modo conjunto y permite repetir manualmente. La interrupción durante cualquier tono invalida los datos parciales y obliga a volver a comprobar. No hay identificación universal de hardware ni reconocimiento de una llamada Bluetooth no expuesta por el navegador.
- Las instrucciones hablan siempre de dBFS digital, no dB SPL, audición clínica ni seguridad demostrada. La comprobación de volumen físico depende de la confirmación expresa del usuario y es necesaria antes de cada tono.

## Pruebas

`tests/hear3-manual-channel-verification.test.mjs` incluye pruebas de consentimiento explícito, rango digital, respuesta solo después de terminar el tono, reproducción manual de cada canal, ausencia de autoplay, fallback conjunto en auto/parlantes/incertidumbre, interrupciones y limpieza, cambio de equipo, datos no clínicos y cierre.

`tests/browser/hear3-headphone-channel-check.spec.cjs` usa Web Audio simulado en Android/iPhone/escritorio para verificar el flujo visual, ausencia de audio espontáneo, permisos visuales/consentimiento, paneo opcional, respuesta incierta e interrupción. **Estas pruebas no confirman que el canal digital llegue únicamente al oído real esperado**.

## P0 todavía pendiente

- D-035 sigue **parcial**: construir una verificación perceptiva y de hardware real fiable, considerar auriculares mono, balance del sistema, Bluetooth y adaptadores, y activar por oído solo después de una decisión técnica y validación de ruta. La función del piloto nunca cambia la configuración del examen principal automáticamente.
- D-055/D-056: comprobar cambios reales de salida, permisos, suspensión, llamadas y volumen; implementar reanudación conservadora si la ruta cambia.
- D-058: prueba real con lector de pantalla, teclado, contraste, zoom y movimiento reducido, objetivo WCAG 2.2 AA aún no acreditado.
- D-063=C: antes de declarar una versión estable se requieren las 60 P0 aceptadas, 13 auditorías físicas y un plan de reversión probado.

## Offline y rollback

El piloto de verificación por canales **no forma parte todavía del manifiesto optativo offline**; se abre con conexión. Los demás prototipos y la app oficial Hear 2.0 no cambian.

Para revertir, retirar el enlace, el controlador y la página de prueba. No existen registros V2/V3 que migrar porque esta comprobación solo utiliza memoria temporal.
