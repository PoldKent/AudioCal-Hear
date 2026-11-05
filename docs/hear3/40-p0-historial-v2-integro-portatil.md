# Hear 3.0 — D-051/D-059/D-060 · Conservación íntegra del historial de Hear 2.0

**Fecha:** 05/11/2026. **Estado:** transferencia íntegra del origen histórico, portátil y reversible, **sin reinterpretación clínica**. Se incorpora un archivo histórico V2 **separado** del catálogo nativo V3, preservando todos los campos incluso los desconocidos. No afirma migración semántica de mediciones y ecualizadores a los contratos clínicos V3 ni una auditoría física.

## Motivo y política

El importador V2 anterior importaba dispositivos, perfiles y frecuencias de bandas solamente. Guardaba mediciones y correcciones antiguas en un respaldo completo, pero no mantenía ese historial íntegro accesible como una copia local independiente después de migrar de navegador.

`src/hear3/legacy-v2-history-vault.mjs` permite guardar el **texto JSON V2 original intacto** con metadatos de origen (exportación oficial o matriz de `localStorage`), ID de perfil activo cuando existe, checksum FNV1a32 y versión de esquema. El archivo portable `hear3-lossless-v2-history-vault-v1` puede exportarse e importarse en otro navegador, sin modificar el origen V2 y sin almacenar los registros como resultados auditivos nuevos V3. El checksum detecta corrupción accidental, **no autentica** ni cifra un documento recibido.

La copia completa incluye todas las estructuras originales: `measures`, `history`, `manual`, `balance`, `sweepRecords`, condiciones, configuraciones, valores desconocidos y contenido no clasificado. La aplicación conserva las mediciones V2 **opacas** y ofrece su resumen de solo lectura, sin equipararlas con intervalos subjetivos V3, validación acústica, dB SPL ni recomendaciones EQ. No elimina registros originales ni convierte `timeout` en `not-heard`.

## Flujo

En el piloto de catálogo V3, el usuario puede elegir los datos V2 locales, un archivo oficial exportado o un archivo portable de historial V2 y pulsar **Revisar perfiles Hear 2.0**. Esto genera una **vista previa sin escrituras**. La nueva sección **Conservar íntegro el historial V2** ofrece:

1. Descargar separadamente la copia portátil íntegra **antes** de autorizar el almacenamiento.
2. Confirmar explícitamente que se desea guardar el archivo histórico aparte de V3. Cuando exista un historial anterior, se exige una **segunda confirmación** específica del reemplazo.
3. Revisar el estado de persistencia local y volver a descargar el archivo íntegro posteriormente, incluso tras recargar, o importarlo desde otro navegador. Si la escritura falla por cuota o seguridad, se indica que la copia está en memoria temporal y debe descargarse.
4. En paralelo, el botón de migración conservadora existente **solo añade metadatos de dispositivos y bandas** al catálogo V3; se mantiene independiente del archivo de historial completo y no interpreta clínicamente los datos históricos.

El almacén usa dos slots versionados `hear3:v2-history:v1:0/1`, comprobaciones de integridad y revisión de estado previo. No sobrescribe slots corruptos si queda uno sano, no borra archivos anteriores a escondidas y valida la revisión inmediatamente antes de guardar. La escritura a través de la interfaz del catálogo participa en la coordinación exclusiva de Web Locks del PR #67. **No garantiza atomicidad multi-pestaña frente a escritores antiguos o que no cooperan.**

**Respaldo completo:** el JSON de respaldo del **catálogo V3** y el respaldo portátil del **historial V2 conservado** son **dos archivos distintos**. Para mover una instalación con ambos tipos de datos hay que exportar y restaurar ambos; nunca afirmar que el backup V3 por sí solo los contiene.

## Privacidad y borrado

Se actualiza `src/hear3/scoped-storage-cleanup.mjs` para que «Solo V3» también inspeccione y permita borrar los dos slots de **copia histórica V2 importada en Hear3**, sin borrar las claves originales `audiocal-hear-profiles-v1` y `audiocal-hear-active-v1`. El alcance «Todos los datos conocidos» elimina ambos orígenes mediante confirmación. El borrado es **best effort**, no atómico entre distintas claves ni capaz de borrar archivos descargados. La privacidad de fotos y cachés sigue separada.

## QA

- `tests/hear3-lossless-v2-history-vault.test.mjs`: preservación byte a byte de JSON, campos desconocidos y medidas por oído, importación portátil, rechazo de corrupción, control de versiones, sobrescritura con confirmación, cuota bloqueada, slots dañados y relectura tras nueva instancia.
- `tests/browser/hear3-v2-lossless-history-vault.spec.cjs`: vista previa, descarga íntegra, confirmación, persistencia y reexportación después de recarga, importe portable en un **segundo contexto de navegador**, rechazo de paquete alterado y borrado «Solo V3» que no toca V2 original.
- `tests/hear3-scoped-storage-cleanup.test.mjs`: dos regresiones adicionales sobre alcance del borrado.
- Node + contratos + beta Hear2 + navegadores Android Chromium / iPhone WebKit / escritorio 4:3 y 21:9. El Web Audio simulado y los tests automáticos **no verifican migración física ni contenido de todas las versiones históricas posibles de la app real**.

## Pendientes para aceptar D-051/D-063=C

Esto completa la **preservación portable del historial original V2**; **no** establece una conversión semántica completa de sus registros al esquema V3, cuyos campos de evidencia, audio, dispositivos y calibración son distintos. Sigue pendiente contrastar con una colección amplia de respaldos reales anonimizados, posibles versiones antiguas y daños, decidir cómo representar todos los tipos de medición sin falsa equivalencia, recuperación bajo cortes de energía, Safari/iOS reales y confirmación de integridad externa autenticada.

**Rollback:** revertir este PR retira la UI y el módulo; no toca las claves originales V2 ni el catálogo principal V3. Antes de revertir, descargar la copia portátil V2 desde el piloto o directamente desde el backup original. El formato portable permite recuperación de datos, no sonido automático. Hear 2.0 estable permanece inalterado.

[Decisiones maestras #30](https://github.com/PoldKent/AudioCal-Hear/issues/30) · [QA físico #26](https://github.com/PoldKent/AudioCal-Hear/issues/26).
