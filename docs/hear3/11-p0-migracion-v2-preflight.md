# Hear 3.0 — P0 D-051: previsualización no destructiva de datos Hear 2.0

**Fuente aprobada:** [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30), especialmente D-043, D-047=A, D-051=D/C, D-059=D/C, D-060=D/C y D-063=D/C.

## Contexto del código real

Hear 2.0 guarda perfiles en `audiocal-hear-profiles-v1` y el identificador activo en `audiocal-hear-active-v1`. Su función `normalizedProfile` de `src/js/01-core.js` tiene un esquema antiguo con bandas, observaciones `measures` por frecuencia/canal, niveles digitales, datos exploratorios, historial/condiciones, controles, correcciones manuales, preferencias y evidencia de diversas procedencias.

El contrato de resultados de Hear 3.0 **no coincide** con los datos V2. Una migración automática de sus mediciones a «resultados auditivos verificados» o ganancias actuales sería engañosa. Este incremento separa una **copia exacta del legado** de una conversión conservadora de metadatos.

## Alcance implementado

`src/hear3/legacy-v2-migration.mjs` ofrece:

1. **`preview()` de solo lectura:** comprueba JSON, límites y estructura de perfiles V2, frecuencias reales estrictamente ordenadas de 2–31 bandas y referencias/ID de perfiles sin duplicados. Informa cuántos registros de medición permanecen sin convertir.
2. **Archivo exacto y separado:** `exportLegacyArchive()` genera `hear3-preserved-legacy-v2-archive-v1`, que conserva como texto completo **el JSON V2 original sin normalización ni recortes**, el ID activo y los nombres de las claves originales de almacenamiento. Incorpora checksum FNV-1a para detectar daño accidental, pero **no autentica** archivos ni los cifra.
3. **Propuesta V3 conservadora:** crea un dispositivo y perfil V3 por perfil legado, conserva el nombre, clase de equipo y frecuencias concretas, marcando cada banda `provisional/unverified`. El resultado histórico convertido es **cero**: se preserva la fuente V2 íntegra en el archivo y el almacenamiento antiguo sin inventar resultados, EQ conjuntos, equivalencias dB ni umbrales.
4. **`commit()` protegido:** exige una acción del usuario, confirmación independiente de que solicitó/guardó su respaldo V2, que la fuente V2 no haya cambiado desde la vista previa y que la revisión del catálogo V3 tampoco haya cambiado. Rechaza colisiones antes de escribir; no toca ni elimina `audiocal-hear-profiles-v1` ni `audiocal-hear-active-v1`.
5. **Persistencia honesta:** se utiliza el almacén local V3 existente y su degradación `device-local → tab-session → volatile`; nunca se afirma que una copia volátil quedó guardada.

El piloto de desarrollo `tests/fixtures/hear3-catalog-pilot.html` añade «Revisar perfiles Hear 2.0», «Exportar archivo original V2» e «Importar solo metadatos compatibles», además de una advertencia clara. Pulsar «Exportar» solicita la descarga, pero la app **no puede comprobar que el usuario guardó el archivo**: se requiere confirmación expresa adicional y debe explicarse ese límite.

## Pruebas incluidas

- `tests/hear3-legacy-v2-migration.test.mjs`: **12 pruebas Node** sobre preservación exacta del JSON (incluidas observaciones y preferencias), no alteración del legado, ausencia de resultados inventados, confirmación, fuentes o destinos cambiados, datos malformados, bandas no válidas, duplicados, perfiles múltiples, colisiones e indisponibilidad del almacenamiento V3.
- `tests/browser/hear3-catalog-pilot.spec.cjs`: **4 casos adicionales Playwright** de previsualización, confirmación, bloqueo de bandas inválidas y detección de fuente modificada.

## Pendientes antes de completar el P0

- Este incremento **no es la migración integral de datos históricos** de D-051. Falta una correspondencia semántica validada que preserve medidas, su confianza, perfiles/condiciones, ajustes y resultados originales sin recalcularlos ni inventar EQ; es necesaria una extensión del esquema V3 y pruebas con respaldos históricos representativos.
- Cualquier exportación de archivo V2 puede contener información del usuario (incluidos datos exploratorios); debe conservarse de forma privada. No se envía a servidor. La copia local V2 no se elimina.
- La protección entre pestañas compara estados pero no es una transacción atómica. No se prometen importaciones seguras con dos pestañas escribiendo simultáneamente.
- El piloto es **interno** y no cambia el examen de producción. Faltan revisión técnica, CI completo, pruebas del almacenamiento en navegadores reales, accesibilidad de la interfaz final y rollback.

**Puerta D-063=C:** no publicar Hear 3.0 estable mientras existan requisitos P0 sin implementar o validar. La aprobación y fusión de un PR no equivalen a cumplimiento total de D-051.