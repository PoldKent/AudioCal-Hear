# Hear 3.0 · P0 D-051 — auditoría y archivo íntegro de datos Hear 2.0

**Estado:** auditoría/archivo **de solo lectura**, sin migración automática; el cambio no modifica `index.html` ni la versión pública. **Fuente aprobada:** [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30), especialmente D-051, D-059, D-060 y D-063.

## Inventario del origen V2

El código operativo de Hear 2.0 utiliza las claves de almacenamiento local:
- `audiocal-hear-profiles-v1`: array de perfiles con nombres, categoría de equipo, frecuencias y campos históricos de mediciones (`measures`), barridos (`sweepRecords`), escucha relativa (`loudness`), ediciones manuales (`manual`), controles y balance, contextos, modos/prioridades e historial temporal.
- `audiocal-hear-active-v1`: identificador del perfil activo.

El perfil antiguo no constituye por sí solo un dispositivo V3 verificado, y las estructuras de mediciones no son intercambiables con observaciones V3 autenticadas. Transformar automáticamente `measures` o `manual` en resultados de EQ V3 implicaría inventar equivalencias, confianza o procedencia.

## Implementación de este PR

- `src/hear3/legacy-v2-migration-audit.mjs`: analiza como JSON **sin leer ni escribir almacenamiento por sí mismo**; rechaza perfiles con IDs duplicados, bandas desordenadas, cantidades inválidas, tipos desconocidos y estructuras que requerirían una revisión manual.
- Genera una **propuesta no aplicable automáticamente** con dispositivo/perfil por registro V2, lista de frecuencias exactas y procedencia `provisional/unverified`, sin crear resultados, ganancias ni afirmar acústica validada.
- Enumera por perfil todos los campos que solo se conservan en el archivo original, incluyendo mediciones, preferencias, contexto, balance y datos desconocidos.
- `exportUnmodifiedLegacyV2Archive` guarda el texto fuente V2 **exacto**, la clave de origen y la selección activa dentro de un JSON con verificación FNV-1a para corrupción accidental. `verifyLegacyV2Archive` permite recuperar exactamente el texto fuente original.
- Piloto de navegador interno `tests/fixtures/hear3-legacy-v2-pilot.html` permite revisar perfiles V2 ya existentes o seleccionar un JSON de origen, listar la cobertura y descargar una copia exacta. La página no muestra ningún botón de escritura o importación en el catálogo. No se modifica ni `audiocal-hear-profiles-v1` ni `hear3:catalog:v1`.
- Pruebas Node y Playwright que comprueban conservación de datos, rechazo de errores, registros históricos no convertidos y ausencia de escritura.

## Puerta para migración V2→V3 completa

1. Hacer un inventario exhaustivo de **cada campo V2** con mapeo explícito a V3 o almacén de archivo histórico; ninguna observación debe convertirse en umbral clínico ni EQ «validado» por analogía.
2. Confirmar que todas las mediciones, configuraciones y cambios originales sean reversibles y conserven relaciones. Si no hay equivalencia fiable, incorporar una vista histórica **identificada como legado** y el archivo fuente íntegro, sin transformarlo en evidencia V3.
3. Diseñar migración transaccional/multi-pestaña y manejo de fallos a mitad de operación, con vista previa y consentimiento antes de importar, **sin borrar** originales ni suponer que existe respaldo externo.
4. Ejecutar pruebas sobre archivos V2 reales anonimizados, navegadores/modos privados y escenarios de fallos, sin exigir diagnósticos técnicos a los usuarios.
5. Mantener D-063 como puerta: todas las pruebas críticas, limitaciones y plan de reversión antes de release estable.

**Declaración de alcance:** este PR crea la inspección y el archivo exacto de origen que preceden una migración, **no implementa aún la migración del historial de Hear 2.0** ni permite declarar D-051 completado. Los checksums NO son autenticación, cifrado ni garantía frente a manipulación maliciosa.
