# Hear 3.0 — D-061 P0: diagnóstico técnico local y exportación revisable

**Fecha:** 2026-11-05. **Estado:** piloto experimental. Decisiones D-055, D-057, D-059, D-060, D-061, D-062 y D-063 del [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Alcance

- `src/hear3/local-diagnostics.mjs` reúne **solo capacidades técnicas booleanas** del navegador: origen seguro, disponibilidad de Web Audio, creación potencial de nodos, paneo estéreo, almacenamiento local y de pestaña (sin leer sus claves/valores), Service Worker, Cache Storage, portapapeles y generación de archivos. No construye ni inicia un `AudioContext`; comprobar una API no valida salida acústica ni identidad del dispositivo.
- Los errores disponibles son códigos **predefinidos** y seleccionados por el usuario (por ejemplo, `audio-interrupted`, `storage-blocked` o `offline-cache-unverified`). No se copia el texto libre de excepciones, tokens, rutas, direcciones IP, UA, identificadores, perfiles, audio escuchado, fotografías o respuestas de pruebas. Si una lectura de capacidades lanza una excepción se reduce a `false`, nunca se revela su mensaje.
- En la página nueva `hear3-diagnostics/`, el usuario configura qué incluir, selecciona opcionalmente un código y genera una **vista previa local JSON**. Al cambiar el alcance se invalida la autorización anterior. Solo tras leer y aprobar la vista previa puede copiarla al portapapeles o descargar un JSON local.
- **Sin telemetría ni envío automático**. No integra Gmail/GitHub/informes remotos ni captura de consola. Descargar no significa compartir: para remitir el archivo a un destinatario tendrá que realizar una acción externa e informada.
- No altera el motor Hear 2.0, sus perfiles, los resultados V3, los checksums ni las funciones audio/sonido.

## Pruebas

- Node `tests/hear3-local-diagnostics.test.mjs`: permitir solo indicadores y códigos acotados, no iniciar Web Audio, no leer perfiles, comprobar exportación explícita y exclusión, invalidez de vista previa tras cambios, sin red, y proteger ante excepciones con datos sensibles.
- Playwright `tests/browser/hear3-local-diagnostics.spec.cjs`: no audio al visitar, no poder descargar sin revisar, selección/revocación, exportación local JSON y conservación de perfiles V2. Ejecutar en Android Chromium, iPhone WebKit y escritorio antes de publicar.

## Pendientes

D-061 no está plenamente cerrado. El diagnóstico actual es **solo un formulario de capacidades técnicas y códigos informados**: no identifica automáticamente todas las interrupciones, no prueba el estado físico del equipo, no ejecuta auditorías de accesibilidad ni registra el motivo completo del error. La remisión específica a un destinatario con autorización y limpieza de metadatos externos también sigue sujeta a un diseño y prueba de privacidad.

Desde la ampliación D-060 de la caché optativa, la página y el módulo de diagnóstico aparecen en el manifiesto estático de Hear 3.0. Solo quedan disponibles offline **después** de que el usuario active o actualice voluntariamente los recursos y se verifique la caché; no se registra un worker ni se descarga código automáticamente por abrir el diagnóstico. Safari/iOS físico y cuotas permanecen sin validar.

**D-063=C permanece pendiente** y el diagnóstico no debe describirse como validación de seguridad acústica ni prueba clínica.

## Rollback

Revertir el PR retira la página, enlace y módulo, y no borra ni envía informes externos que el usuario haya decidido descargar. Confirmar funcionamiento de Hear 2.0, integridad de la vista previa y resultados de CI por SHA tras una reversión.
