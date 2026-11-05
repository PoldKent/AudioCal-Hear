# Hear 3.0 — P0 D-051/D-059/D-060: catálogo V3 con guardado no destructivo ante corrupción

**Fecha:** 05/11/2026. **Estado:** refuerzo de integridad local; no certifica transacciones entre pestañas ni recupera copias irrecuperables.

El catálogo V3 `src/hear3/catalog-backup-store.mjs` ya disponía de dos slots con detección de corrupción por checksum FNV-1a, pero al haber un slot válido y otro corrupto, la siguiente revisión podía reutilizar el slot corrupto y destruir sus bytes. Este PR lo corrige:

- La lectura por slot separa errores de acceso a almacenamiento de datos que pudieron leerse pero fallaron validación de esquema o checksum.
- Si el slot está corrupto, los próximos guardados lo **preservan exactamente** y utilizan el slot sano. Informa que hay redundancia reducida y sugiere exportar respaldo. El catálogo visible continúa con la revisión íntegra más reciente.
- Si los dos slots del almacenamiento persistente están dañados y existe una copia íntegra en la sesión de pestaña, **se guarda solo en la pestaña**, sin pisar el almacenamiento corrupto. Si ya no existe ninguna copia válida, conserva el fallback en memoria temporal, con advertencia.
- Si `getItem` falla por permisos o la API no funciona, **no intenta escribir a ciegas en ese almacenamiento**, aunque `setItem` aparentemente esté disponible. Evita destruir copias que no se pudieron inspeccionar. Se conservan opciones de sesión/volátil con señales honestas.
- La eliminación de slots sigue exigiendo `clear({confirmed:true})`. No hay borrado silencioso ni cambios al legado Hear 2.0.

`tests/hear3-catalog-corrupt-slot-preservation.test.mjs` cubre los cuatro casos (slot dañado con hermano sano, ambos dañados con fallback verificable, almacenamiento ilegible con escritura permisiva y borrado explícito). La suite preexistente de catálogo, checkpoints, migración y exportación debe seguir verde.

**Limitaciones:** FNV-1a solo sirve para descubrir alteraciones accidentales, no autenticidad. El guardado sigue sin ser transacción atómica multi-pestaña ni una operación transaccional del sistema de archivos. Los respaldos descargados pueden seguir existiendo. La eliminación de archivos exportados, imágenes externas y cachés offline se maneja aparte. No hay evidencia de garantía física de persistencia o recuperación postfallo del dispositivo real.

**Rollback:** revertir el PR restaura el algoritmo de selección anterior, sin borrar claves. No revertir ni eliminar copias corruptas antes de intentar exportar/respaldar y revisar su causa. D-063=C sigue bloqueado hasta pruebas reales y cumplimiento de todos los P0.
