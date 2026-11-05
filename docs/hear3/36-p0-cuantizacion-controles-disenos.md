# Hear 3.0 — D-043/D-045/D-046: conversión exacta a escalas de EQ declaradas

**05/11/2026. Estado:** algoritmo de representación digital y previsualización de transferencia, **no** preset certificado, conexión directa al equipo ni mejora acústica demostrada. Complementa [el motor de ganancias](34-p0-motor-eq-hibrido-acotado.md) y [el modelado DSP de referencia](35-p0-dsp-biquad-margen-digital.md). Issue [#30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Problema resuelto

Una curva objetivo con ganancias expresadas en dB no se puede copiar sin más a controles con pasos y límites propios. Además, una posición `3` de un EQ físico **no equivale necesariamente a +3 dB**. Si solo se conoce cuántas posiciones tiene una perilla, ni siquiera se puede inferir dónde está su cero.

`src/hear3/eq-control-quantization.mjs` implementa `previewHear3EqControlTransfer({eqDraft,graphicEqProfile})`, una función pura que:

1. Exige la **curva conjunta, acotada e inequívocamente experimental** que genera el motor v1. Los valores `originalEq/currentEq` deben ser idénticos y coherentes con las bandas; no se permite afirmar datos clínicos, L/R sin validar ni ganancias fuera del límite de la categoría.
2. Valida el perfil mediante `validateGraphicEqProfile()` (2–31 bandas, identidad de equipo declarada, origen de frecuencia, verificación, controles). **Todas las frecuencias deben coincidir exactamente y en el mismo orden**; nunca se remapea por proximidad ni se inventan bandas.
3. Para una escala **explícita en dB** con `min/max/step` conocidos, construye la malla exacta `min + n × step` con `n` entero desde 0 hasta `floor((max−min)/step)`. Elige la posición que minimiza el error cuadrático de la ganancia objetivo dentro de esa malla; ante empate, prefiere el menor valor absoluto para evitar realces innecesarios. Esto es el óptimo global de la **función separable** de error cuadrático cuando los controles se consideran independientes. No pretende modelar la interacción física entre bandas.
4. Conserva por separado `targetGainDb`, `attainableDb`, `residualDb`, `roundedToStep`, `clampedToRange` y el origen de la escala (`declared-documented-not-hardware-verified`, `user-confirmed-not-acoustically-verified` o `provisional-unverified-scale`). Se reportan conteos de controles sin mapeo, error RMS y error RMS ponderado por el tipo de evidencia.
5. Cuando solo existe `physical-step` o no se dispone de una escala en dB, **no inventa una posición**. Incluso si existe un `dbPerStep` declarado como documentado, el contrato no registra dónde está el **cero físico del control**: sin ese dato no se puede convertir un objetivo de +2 dB a un índice absoluto. El resultado permanece `unresolved-no-documentable-zero-reference-position`.
6. Nunca emite valores superiores/inferiores a la malla representable, no toca un equipo, no sube volumen, no inicia Web Audio y no almacena datos. `autoApplyAllowed:false`, `devicePresetExportAllowed:false`, `controlMappingExternallyVerified:false`, `filterResponseVerified:false` y `validatedForProduction:false` permanecen explícitos.

## Flujo de revisión en la vista previa

Tras terminar el examen, en la sección **«Revisar conversión a controles del equipo»** se puede seleccionar voluntariamente un archivo JSON local con `{deviceId,type:"graphic",bands:[...]}` o un objeto con propiedad `graphicEq` con esa estructura. El archivo se lee en el navegador **solo después de pulsar Revisar**. Límite de entrada: 128 KiB. Cambiar el archivo invalida el informe anterior. La revisión muestra target, valor alcanzable, error, saturación, redondeo y controles no resueltos. Se puede descargar un **informe** JSON opcional cuyo nombre declara que no es un preset aplicable.

**Ejemplo mínimo de entrada:** la cantidad y las frecuencias de `bands` deben coincidir exactamente con las del examen terminado:

```json
{
  "deviceId": "example-device",
  "type": "graphic",
  "bands": [
    {"id": "control-125", "frequencyHz": 125, "source": "manual", "verification": "user-confirmed",
     "control": {"unit": "dB", "min": -6, "max": 6, "step": 1}},
    {"id": "control-250", "frequencyHz": 250, "source": "manual", "verification": "user-confirmed",
     "control": {"unit": "dB", "min": -6, "max": 6, "step": 1}}
  ]
}
```

Ese ejemplo de dos controles sirve únicamente con un resultado de dos bandas a 125/250 Hz. **No presupone que esos controles existan ni que sus especificaciones sean auténticas**. Los usuarios que aún no tengan una fuente fiable no necesitan cargar un archivo: su curva EQ y archivo de evidencia continúan disponibles sin esta etapa.

## Pruebas

- `tests/hear3-eq-control-quantization.test.mjs`: 10 tests Node sobre representabilidad dB, desempate conservador, saturación, escalas parciales, posición cero desconocida, validación de bandas, controles corruptos, efectos laterales y mallas de 2–31 bandas.
- `tests/browser/hear3-eq-control-transfer.spec.cjs`: prueba real de UI con examen completo simulado, selección local de archivo, redondeo/resultado, descarga voluntaria, bloqueo de posiciones físicas sin cero, rechazo de frecuencias distintas e invalidación de selección.
- Se ejecutan las pruebas Node, contratos Hear 3.0, beta Hear 2.0 y matrices Android Chromium/iPhone WebKit/escritorio. La Web Audio emulada y las escalas introducidas manualmente **no prueban** que los controles físicos sean válidos.

## Limitaciones antes de EQ de producción

Este módulo **completa la parte de cuantización declarativa**, no la certificación de un dispositivo real ni la política general de Q/fase/ganancias. Faltan equivalencias documentadas para controles físicos y su cero, perfiles/dispositivos reales, respuesta de filtros y clipping medidos, prueba perceptiva y autorización segura para un preset aplicable. No convertimos suposiciones de un usuario en seguridad acústica. Por la misma razón el EQ aún no es definitivo de producción conforme a D-063=C.

**Rollback:** revertir este PR elimina la pantalla de revisión, cuantizador y tests asociados; la curva EQ experimental, sus datos V3 y Hear 2.0 no se modifican ni se borran. No hay ajustes aplicados que deshacer.
