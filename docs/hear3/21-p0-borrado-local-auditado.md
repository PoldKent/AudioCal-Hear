# Hear 3.0 — D-059 P0: limpieza comprobable y acotada de claves locales

**Fecha:** 2026-11-05. **Estado:** herramienta experimental de privacidad. Decisiones D-051, D-059, D-060, D-063 del [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30). No es una limpieza de toda la cuenta, de todos los servidores, ni de todos los almacenamientos del navegador.

## Alcance implementado

- Nueva página `hear3-privacy/index.html`, accesible desde `hear3-preview/`, sin inicio de audio ni telemetría; ofrece dos elecciones **explícitas**:
  1. **Solo V3**: las dos copias de catálogo `hear3:catalog:v1:0/1`, los checkpoints por perfil `hear3:exam-checkpoint:<perfil>:0/1` y `hear3:adaptive-progress:<perfil>:0/1`.
  2. **Todos los datos conocidos de Hear**: lo anterior y las tres claves auditadas del código actual Hear 2.0: `audiocal-hear-profiles-v1`, `audiocal-hear-active-v1`, `audiocal-language-v1`.
- Inspección solo de `localStorage` y `sessionStorage`: reporta recuento, no contenidos. Detecta alcance alterado después de la vista previa y aborta sin borrar cuando aparece o cambia una clave pertinente.
- Frase exacta de autorización: `BORRAR V3` o `BORRAR DATOS HEAR`, según el alcance; además requiere pulsar el botón y aceptar el diálogo de confirmación.
- Borrado selectivo **solo de los nombres auditados**; nunca `localStorage.clear()` ni `sessionStorage.clear()`, evitando borrar datos de otras aplicaciones del mismo origen. Verifica cada `removeItem()` con `getItem()` y, al finalizar, vuelve a inventariar las claves del alcance. Los fallos se reportan como borrado parcial/no comprobado, sin prometer atomicidad.
- Una API bloqueada o imposible de enumerar obliga a cerrar la vista previa; no se puede declarar limpieza total basándose solo en los almacenes accesibles.

## Tests

- `tests/hear3-scoped-storage-cleanup.test.mjs`: lectura sin mutación, consentimiento de ambos alcances, preservación de claves V2 al borrar solo V3, preservación de otras aplicaciones, cambios concurrentes entre vista previa/confirmación, fallos de escritura/lectura/borrado, descarte de vista previa.
- `tests/browser/hear3-privacy-cleanup.spec.cjs`: navegación real, recuentos exactos, aceptación y rechazo del diálogo, frases, bloqueos por cambio de alcance y protección de V2 y claves ajenas.
- Exigir todas las pruebas obligatorias de código/Node, beta V2, Android Chromium, iPhone WebKit, escritorios y GitHub Pages antes de describir el despliegue como actualizado.

## Límites y riesgo real

- La palabra «todos» en la interfaz se limita expresamente a **claves conocidas y auditadas en los dos almacenes**. No hay enumeración/borrado de IndexedDB, Cache Storage, service workers, fotografías fuera de estas claves, sistemas externos, descargas del usuario ni respaldos guardados previamente. Las imágenes no están implementadas como almacén de fotos en el piloto V3, y no debe fingirse su limpieza.
- Un perfil Hear abierto en otra pestaña puede volver a guardar claves recién eliminadas; se pide cerrar otras pestañas y recargar. La comprobación de revisiones es **optimista**, no transacción multi-pestaña; la eliminación secuencial puede ser parcial. No se garantiza borrado a nivel físico del dispositivo o recuperación forense.
- La migración de V2 y los perfiles que se cargaron en memoria en una pestaña antigua no se alteran por esta página hasta que vuelven a guardarse o la pestaña se recarga.
- No se borra ningún archivo de respaldo previamente descargado. El usuario debe gestionar sus copias fuera del navegador.
- El producto mantiene D-063=C: no publicar Hear 3.0 estable sin completar P0, seguridad acústica, pruebas de hardware y rollback validado.

## Reversión

Revertir el PR retira el módulo y la página, sin borrar los datos restantes del navegador. Una eliminación solicitada y completada por el usuario **no se puede revertir automáticamente**; solo puede recuperarse desde copias de seguridad exportadas y válidas. La reversión del sitio no puede garantizar que un navegador restaurará datos previamente borrados.
