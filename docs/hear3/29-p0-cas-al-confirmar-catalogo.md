# Hear 3.0 — D-051/D-059 P0: control optimista en el instante de guardar el catálogo

**Fecha:** 05/11/2026. **Alcance:** garantía incremental contra pérdida de datos por una carrera entre vista previa y escritura. No equivale a transacción atómica entre pestañas ni a bloqueo exclusivo de la base.

## Riesgo corregido

Los flujos de importación de respaldos V3, borrado selectivo y migración de metadatos V2 comprobaban que la vista previa no estuviera obsoleta leyendo `store.load()`. Sin embargo, antes de este incremento llamaban a `store.save(catalog)` **sin** el parámetro `expectedRevision`. Si otra acción escribía una revisión nueva después de esa comprobación y antes de la escritura, la operación podía sobrescribir el catálogo actualizado sin rechazar el conflicto.

Ahora los tres flujos guardan la revisión exacta de la vista previa y llaman a `store.save(catalog,{expectedRevision:...})`:

- `createHear3CatalogBackupTransfer` para merge/replace.
- `createHear3CatalogDeletion` para borrado individual o cascada previamente autorizada.
- `createHear2MigrationTransfer` para importación de **metadatos** de V2, conservando el archivo de origen y sin convertir resultados históricos.

La comprobación previa de integridad y contenido sigue vigente, **y el store vuelve a comparar la revisión justo antes de guardar**. Una colisión rechazada no modifica el nuevo catálogo. Las vistas previas siguen consumiéndose antes de intentar persistir cuando corresponde; volver a revisar y confirmar es responsabilidad del usuario.

## Evidencia automática

`tests/hear3-catalog-commit-time-cas.test.mjs` crea un store simulado que, en la lectura de confirmación, devuelve la revisión que coincidía con la vista previa pero **escribe inmediatamente una nueva revisión antes de que el flujo ejecute `save`**. El store real debe rechazar el intento stale `expectedRevision` de:

1. Restaurar un respaldo V3 mediante reemplazo.
2. Eliminar una entidad V3.
3. Migrar metadatos V2 con su copia intacta.

Una cuarta prueba verifica el flujo normal sin conflicto y la continuidad de revisiones. Se deben mantener en verde todas las pruebas existentes de catálogo, migración, borrado y navegador, además de la beta V2.

## Alcance restante

El mecanismo sigue siendo optimista y **no atómico entre contextos o pestañas**: dos llamadas concurrentes al almacenamiento pueden intercalarse entre la comparación interna y `setItem`; `localStorage` no aporta compare-and-swap transaccional. La solución final deberá evaluar bloqueo real (si compatible), serialización por contexto, persistencia de logs y fallos/recuperación probados. Los perfiles históricos, JSON externos, fotos, salida acústica, EQ definitivo y D-063=C no son parte de este PR.

**Rollback:** revertir el PR recupera la ruta anterior de guardado pero no borra datos. Para operaciones conflictivas, exportar un respaldo válido, reabrir la vista previa y verificar la revisión actual antes de reintentar; nunca forzar una sobrescritura silenciosa para resolver un error de concurrencia.
