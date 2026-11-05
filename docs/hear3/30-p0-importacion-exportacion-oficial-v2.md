# Hear 3.0 — D-051 P0: importación conservadora de metadatos desde exportación oficial V2

**Fecha:** 2026-11-05. **Estado:** piloto de migración, no transferencia clínica ni migración íntegra de historial. Referencia: [issue maestro #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Cambio

Hasta esta iteración, el auditor de Hear 3.0 podía leer un archivo oficial `{app:"AudioCal Hear",version:1,profiles:[...]}` y preservar su texto, pero el importador de metadatos V3 únicamente aceptaba una matriz JSON proveniente de `localStorage`. Esta diferencia obligaba a volver al navegador anterior para importar perfiles.

`src/hear3/legacy-v2-migration.mjs` ahora utiliza el **mismo reconocimiento de formatos** ya aprobado en `legacy-v2-migration-audit.mjs`. Admite tanto la matriz guardada por Hear 2.0 como el JSON de **exportación oficial versión 1**; otros wrappers, versiones, tipos o datos mal formados fallan antes de escribir. El formato de origen figura en la vista previa, y todo el texto original queda dentro del respaldo exacto con comprobación FNV-1a para descubrir alteraciones accidentales (no autenticidad ni cifrado).

En `tests/fixtures/hear3-catalog-pilot.html` se selecciona explícitamente si los datos vienen del navegador o de un **archivo V2**. Para archivos, la lectura local no modifica las claves V2 de este navegador. Un cambio de archivo o de origen descarta la vista previa, el estado de exportación y la autorización previa. La operación solo importa nombre, categoría y frecuencias de bandas provisionales; **no** convierte las mediciones, balances, ajustes manuales, resultados o umbrales V2 en resultados, correcciones EQ o dispositivos validados V3.

## Aceptación y pruebas

- **5 regresiones Node**: exportación oficial preservada byte por byte en el archivo de respaldo, rechazo de wrappers/versiones/frecuencias/duplicados no compatibles, conservación de V2 y catálogo V3 existente, invalidación de revisión ante cambios y continuidad de la matriz local previa.
- **4 regresiones Playwright**: selector archivo/navegador, previsualización sin mutación, descarga real de respaldo con texto original idéntico, doble confirmación de importación, ninguna medición convertida, invalidación tras cambio de archivo y rechazo de formato no compatible. Ejecutar Android Chromium, iPhone WebKit y escritorio en CI.
- El archivo original y la salida de respaldo pueden contener información personal de perfiles y mediciones. No hay sincronización, envío ni telemetría; los archivos JSON descargados **no están cifrados** y no se eliminan desde la aplicación. Guardar una copia de forma responsable antes de importar es responsabilidad informada del usuario.

## Pendientes para completar D-051/D-059/D-060

El importador del archivo oficial sigue siendo **solo de metadatos**. La migración integral del historial requiere mapear cada campo histórico a un contrato V3 explícito, conservar la distinción entre pruebas subjetivas V2 y evidencia V3, revisar casos corruptos y crear un rollback/restauración comprobados sobre dispositivos reales. Un archivo de respaldo íntegro es una copia de preservación, no prueba de recuperación ni garantía de que el navegador conserva versiones antiguas.

La protección contra revisiones obsoletas sigue siendo **optimista**; no es una transacción multi-pestaña. La prueba de audición y EQ física siguen pendientes; no puede declararse Hear 3.0 estable bajo D-063=C.

## Rollback

Revertir el PR devuelve el importador a la matriz local anterior y retira el selector de archivos. No toca perfiles V2, historial ni el catálogo V3 ya guardado. No elimina archivos descargados. Se puede recuperar información solo desde copias verificadas y con consentimiento explícito.
