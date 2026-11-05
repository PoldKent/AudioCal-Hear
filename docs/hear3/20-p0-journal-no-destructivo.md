# Hear 3.0 — P0: protección del journal de progreso adaptativo dañado

**Fecha:** 05/11/2026. **Alcance:** D-051, D-054, D-059 y la puerta D-063 del [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

En `src/hear3/adaptive-progress-store.mjs`, cada slot de persistencia del examen adaptativo se lee y valida antes de guardarse una nueva revisión. Cuando el checksum o el formato de un slot no pasa la validación, el sistema **conserva sus bytes sin sobrescribirlos silenciosamente**.

Si el otro slot sigue íntegro, las revisiones futuras pueden guardarse ahí, con una advertencia de redundancia reducida y recomendación de exportar respaldo. Si los dos slots de un ámbito están corruptos, el guardado cambia a otro ámbito válido o se mantiene solo en memoria temporal, comunicando la ausencia de confirmación persistente. La eliminación de los slots corruptos requiere confirmación explícita mediante el control de borrado de checkpoint.

**Pruebas de regresión:** `tests/hear3-adaptive-journal-corruption.test.mjs` cubre copia dañada + copia íntegra, ambas dañadas, eliminación manual y rotación normal. El comportamiento de recuperación sin reproducción automática del PR #47 y la conservación de perfiles V2 no cambian.

**Límites:** FNV-1a es solo detección de corrupción accidental. Este refuerzo no autentica archivos, no cifra, no garantiza transacciones entre pestañas y no recupera bytes inválidos por arte de magia. Si no existe copia íntegra, la interfaz debe indicar que el respaldo persistente no es recuperable, pero no borrar ni reemplazar el archivo sin consentirlo. Las decisiones D-001–D-063 y la prohibición de marcar Hear 3.0 estable antes de D-063=C continúan vigentes.

**Rollback:** revertir el PR no borra datos; mantiene las claves locales originales. Validar pruebas Node/contratos, matriz Android/iPhone/escritorio y publicación antes de considerar la reversión.
