# Hear 3.0 — D-051/D-059/D-060: serialización de escrituras entre pestañas

**Fecha: 05/11/2026.** Esta implementación protege los flujos de catálogo V3 **que participan en el protocolo Web Locks**. No constituye una transacción ACID global, sincronización de todas las pestañas, autenticación ni persistencia garantizada en disco.

## Cambio

`createHear3CatalogWriteCoordinator` utiliza `navigator.locks.request('hear3:catalog:v1:write',{mode:'exclusive'},callback)`. Solo una pestaña cooperante puede ejecutar simultáneamente un callback de mutación bajo ese nombre para el mismo origen. La implementación vuelve a cargar la revisión al obtener el bloqueo y, cuando se proporciona `expectedRevision`, rechaza una propuesta obsoleta. Los módulos originales de importación, borrado y archivo siguen validando su propia vista previa y guardan con `expectedRevision`; el bloqueo protege el intervalo de lectura y escritura entre pestañas que usan ese protocolo.

Los pilotos ahora envuelven en el coordinador las siguientes operaciones mutadoras:

- Importación de respaldo V3 (agregar/reemplazar).
- Borrado selectivo de equipos, perfiles o resultados V3.
- Importación conservadora de metadatos Hear 2.0.
- Archivo de observaciones del examen adaptativo V3.

**Ausencia de Web Locks:** no se ejecuta la mutación y se presenta el motivo. Se puede descargar un respaldo; la disponibilidad depende de navegador/origen seguro. La lectura del catálogo y del historial continúa funcionando.

**Límites reales:** scripts antiguos que usen `store.save` directamente no obedecen el bloqueo, y Web Locks no transforma `localStorage` en una base transaccional con rollback atómico. El almacenamiento puede fallar o quedar solo en memoria. Cada resultado conserva indicadores explícitos `atomicAcrossUncooperativeWriters:false`, `transactionallyDurable:false`, y sigue siendo obligatorio verificar `persistedOnDevice`. Una comprobación física de pérdida de energía, recarga entre pestañas, navegación privada y exportación/restauración sigue pendiente.

## Pruebas

- `tests/hear3-coordinated-catalog-writer.test.mjs`: simulación de 2 pestañas en cola, primera gana y segunda rechaza revisión obsoleta; el bloqueo se libera al fallar; sin Web Locks se rechaza la mutación; rechazo de un falso bloqueo.
- `tests/browser/hear3-cross-tab-catalog.spec.cjs`: pestañas reales del mismo contexto que compiten por importar desde el mismo estado; una sola puede confirmar, la otra recibe error de revisión obsoleta; callback asíncrono mantiene la exclusión; ausencia simulada de Web Locks rechaza toda escritura.
- Regresión completa de Node, contratos, beta Hear 2.0, Android Chromium, iPhone WebKit y escritorios 4:3 y 21:9 en PR.

## Publicación y aceptación

Esta es una mitigación P0 **parcial de concurrencia**, no prueba de atomicidad ante escritores que no cooperan. La condición D-063=C sigue bloqueada por auditorías físicas y recuperación real, así como verificación acústica y de privacidad. Las pruebas anteriores usan navegador emulado y no verifican recuperación ante apagado de un teléfono real.

## Reversión

Revertir el PR quita el protocolo de escrituras coordinadas y devuelve los flujos de importación/borrado/archivo al chequeo optimista anterior. No altera esquemas V2/V3, perfiles, archivos descargados ni la experiencia oficial Hear 2.0.
