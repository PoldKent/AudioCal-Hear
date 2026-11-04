# Hear 3.0 — Historia V2 visible sin migración destructiva (P0 D-051)

**Base:** PR #40 (auditoría del origen V2), que depende de PR #38 (catálogo V3).

Este incremento expone, **solo en piloto local de desarrollo**, una lectura conservadora de los datos históricos de Hear 2.0. No escribe los datos existentes ni fabrica equivalencias auditivas.

- `src/hear3/legacy-v2-history-view.mjs` ofrece un resumen por perfil: bandas y canales originales, número de registros guardados, tipos históricos de respuesta, controles manuales/balance registrados y cantidad de barridos. Los registros corruptos o de tipo desconocido se cuentan como **sin clasificar**; no se transforman en «no escuchado» ni se eliminan del archivo bruto.
- El formato de resumen declara `migratedV3Results: 0` y `acousticValidation: not-established`. No exporta una curva de audición ni EQ calculado. La copia de fuente V2 exacta se sigue generando mediante PR #40.
- Piloto `tests/fixtures/hear3-legacy-v2-pilot.html`: presenta el resumen sin usar `innerHTML` de origen V2. Los nombres se muestran como texto, evitando HTML/JS incrustado. No crea almacenamiento ni audio.
- `tests/hear3-legacy-v2-history-view.test.mjs`: seis pruebas de separación de canales, no inventar umbrales, ajustes históricos, registros desconocidos, perfiles múltiples y rechazo de estructura inválida.
- `tests/browser/hear3-legacy-v2-pilot.spec.cjs`: dos regresiones añadidas para protección HTML y clasificación de historia en navegador.

**Limitaciones:** Los registros no tienen equivalencias clínicas ni acústicas garantizadas, y los números de ajustes V2 no acreditan que sea seguro o correcto reproducirlos en otro equipo. No existe todavía un visor oficial de historial V3, migración real, importación de archivos V2 a catálogo, edición de historia, sincronización ni eliminación selectiva integrada.

**Puerta:** PR apilado sobre #40, sin merge mientras las dependencias o sus regresiones no estén completas. El sistema público sigue sin modificaciones. D-063 requiere validación funcional, privacidad, compatibilidad y plan de reversión antes de Hear 3.0 estable.
