# Hear 3.0 — P0: archivado voluntario de respuestas subjetivas en catálogo V3

**Fecha:** 2026-11-05. **PR:** #48. **Estado:** piloto experimental, no EQ aprobado, no lanzamiento estable. Decisiones vinculadas: D-028–D-034, D-038–D-041, D-051, D-059, D-063 del [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Alcance técnico

Se incorpora `src/hear3/adaptive-catalog-archive.mjs` y una sección de guardado en el piloto integrado:

1. Solo permite previsualizar un examen si **todas las bandas fueron revisadas** y tanto el orquestador como el controlador Web Audio constan como explícitamente terminados. Exige concordancia entre las observaciones por banda y la evidencia validada de audio; rechaza fuentes y referencias inconsistentes, valores digitales fuera de límites, IDs repetidos e intervalos incompatibles.
2. El usuario introduce **nombre y categoría del equipo**, y nombre del perfil. Se generan identificadores separados para un dispositivo, un perfil gráfico experimental y un resultado histórico. Todas las bandas se marcan `source:'provisional'` y `verification:'unverified'`; la categoría elegida no prueba la identidad física.
3. El resultado se archiva **siempre** con `status:'inconclusive'`, `provenance:'experimental-tone-test'`, `originalEq:[]`, `currentEq:[]`, `editHistory:[]`. Solo se guardan respuestas verificadas (`heard/not-heard`, frecuencia, canal y nivel digital), sin generar umbrales, diagnóstico, dB SPL ni un ecualizador clínico.
4. Primero presenta una **vista previa sin escritura** con cantidad de respuestas/bandas, sin EQ y con advertencia. Solo guarda después de confirmación explícita y vuelve a verificar que el examen y el catálogo no cambiaron. El método `catalogStore.save(catalog,{expectedRevision})` rechaza revisiones obsoletas conocidas; **no es una transacción atómica entre pestañas**.
5. Nunca modifica perfiles originales Hear 2.0 ni resultados anteriores del catálogo V3. No vincula respuestas a una supuesta fotografía/escala física validada. Si la escritura no se confirma en almacenamiento del dispositivo muestra la falta de durabilidad para que el usuario exporte un respaldo.

## Pruebas

- Node: examen incompleto, archivado sin EQ, preservación V2, rechazo de confirmación ausente, previsualización no mutante, IDs y categoría, colisiones y revisión obsoleta, evidencia modificada, archivo que cae a memoria volátil, integridad de registros previos.
- Playwright: controles de guardado inactivos antes de terminar el recorrido, examen completo con Web Audio **simulado**, previsualización de respuestas, cancelación, confirmación, resultado `inconclusive` guardado, ganancias EQ vacías, conservación de V2 y consulta posterior en el catálogo V3.
- Exigir `npm run verify`, contratos V3, beta V2 y matrices de Android 9×21 Chromium, iPhone WebKit y escritorio 4:3 / 21:9 en verde en el **último HEAD** antes del merge.

## Límites y trabajo pendiente

- Archivar observaciones NO constituye un resultado audiométrico validado ni garantiza mejora auditiva; el resultado sigue siendo «inconcluso», incluso si algunos intervalos subjetivos fueron coherentes. No se ha elegido algoritmo D-039/D-040 ni límites de corrección final; D-041 y D-047 requieren validación.
- La interfaz actual crea un **nuevo** equipo y perfil para el piloto; no implementa todavía asociación segura a perfiles V3 preexistentes, deduplicación entre sesiones, edición completa, sincronización ni concurrencia transaccional.
- El catálogo conserva la lista básica de observaciones, pero no todos los detalles del progreso adaptativo, como la confirmación y su presupuesto de intentos; el checkpoint experimental sigue siendo la referencia de sesión. No se trasladan automáticamente registros antiguos de Hear 2.0.
- No existe verificación acústica real de auriculares, coche, Bluetooth o altavoces. Los niveles dBFS no indican el SPL del oído ni garantizan seguridad. No hay medición de latencia física ni certificación clínica.
- Persistencia del catálogo continúa con dos slots locales, checksum no autenticado y fallback a pestaña/memoria temporal. Control optimista de revisiones no resuelve carreras simultáneas; el borrado global de datos/photos, política offline y P0 restante siguen abiertos.
- El motor oficial Hear 2.0 no cambia. **D-063=C permanece incumplido** y los 63 acuerdos originales siguen aprobados.

## Reversión

Revertir este PR elimina el botón de archivado y su módulo, sin modificar perfiles V2 ni borrar resultados V3 almacenados. El catálogo V3 sigue accesible desde el piloto anterior. Comprobar resultados existentes, `npm run verify`, pruebas de navegador, publicación GitHub Pages y no reproducción automática antes de considerar rollback completado.
