# Hear 3.0 — D-039/D-040/D-045/D-046: modelado DSP real de filtros y margen digital limitado

**Fecha:** 05/11/2026. **Estado:** etapa de DSP matemático **implementada y automatizada**; NO validación acústica, dispositivo, control físico, mejora perceptiva ni disponibilidad de producción. Refuerza [el motor EQ híbrido v1](34-p0-motor-eq-hibrido-acotado.md) y las decisiones D-039/D-040/D-041/D-045/D-046/D-063 del [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Qué resuelve este incremento

Antes de este PR solo se calculaban ganancias nominales, sin un modelo real de filtros. Se agrega `src/hear3/eq-digital-transfer-model.mjs` que requiere una salida verificable en esquema del motor experimental y construye una **cascada de biquads peaking de la receta digital RBJ**, con normalización de coeficientes e inspección de estabilidad. Es un modelo explícito del **DSP digital ideal** que se puede procesar y contrastar, no la función real de un EQ físico concreto.

- **Topología elegida para referencia:** `peaking-biquad` RBJ, Q=1 fijo, frecuencia central exacta por banda, ganancia fuente original de hasta ±2/±3 dB. Las bandas con 0 dB son identidad exacta.
- **Muestreo de referencia:** 44,1 / 48 / 88,2 / 96 / 176,4 / 192 kHz según el parámetro suministrado. En la vista previa se utiliza explícitamente **48 kHz asumidos**. No se detecta ni se certifica la frecuencia real de salida; bandas demasiado cercanas a Nyquist se rechazan sin intentar aplicar nada.
- **Respuesta compleja:** se evalúa el numerador y denominador de la transferencia de cada etapa en cada frecuencia, incluyendo magnitud y fase. El motor examina **4096 intervalos de frecuencia entre DC y Nyquist**, añade centros de banda y registra pico de ganancia, frecuencia del pico y muestras de la respuesta en frecuencias fijas. Esto detecta interacciones de filtros en la cuadrícula, no equivale a un máximo analítico riguroso en todas las frecuencias.
- **Respuesta al impulso y preamplificación:** simula con estados iniciales en cero **8192 muestras** del sistema ideal y calcula \(L_1=\sum_{n=0}^{8191}|h[n]|\). Para una señal digital con \(|x[n]|\le 1\), y estado inicialmente nulo, la amplitud de las primeras 8192 muestras está acotada por la norma parcial de respuesta al impulso multiplicada por la amplitud de la entrada. El modelo selecciona atenuación negativa cuantizada a 0,25 dB, incluyendo **1 dB adicional de margen de referencia**, según el mayor de los picos de frecuencia observados y \(20\log_{10}(L_1)\).
- **Presupuesto de viabilidad:** si esa atenuación superaría **−24 dB** en el modelo, el resultado es inviable y **no se emite preamplificación sugerida**. Se conserva el EQ numérico anterior con origen y se solicita revisión; jamás se eleva un límite digital ni se sustituye una salida de riesgo por un «preset seguro».
- **Simulación temporal:** `simulateHear3DigitalEqSamples` ejecuta los biquads reales en *Direct Form II transposed* sobre muestras sintéticas explícitas y devuelve pico de muestra y si el modelo observó sobrepasar |1|. Rechaza inputs >0 dBFS lineal, duración mayor al horizonte y salidas numéricas inválidas. No procesa micrófonos ni música del usuario.

### Lo que estos cálculos NO certifican

**La cota L1 parcial tiene un alcance formal deliberadamente estrecho:** muestras en el horizonte acotado, entrada limitada y **estado inicial cero**, con la cascada **ideal específica** descrita. NO acota automáticamente colas IIR tras 8192 muestras, estados heredados, diferencias entre implementaciones de filtros reales, cambios de muestreo, clipping entre muestras, no linealidad, saturación de los convertidores o altavoces, o presión sonora dB SPL.

Por tanto el modelo conserva:

`sampleRateAssumed:true`, `filterQAssumed:true`, `impulseTailBeyondHorizonCertified:false`, `intersamplePeaksVerified:false`, `realDeviceFiltersVerified:false`, `physicalHeadroomVerified:false`, `physicalClippingVerified:false`, `validatedForProduction:false`, `autoApplyAllowed:false` y `devicePresetExportAllowed:false`.

La salida `suggestedReferencePreampDb` es **un número técnico para el modelo**, NO un ajuste autorizado para un teléfono, auriculares, automóvil o aplicación. Al no conocer el ecualizador real del usuario, no afirmamos que su Q, fase o topología corresponda a esta simulación. La etapa no cambia los límites de exposición, no reproduce nada, no solicita nuevos permisos y no aplica EQ a Web Audio.

## Integración y compatibilidad

El [piloto integrado](../../tests/fixtures/hear3-integrated-exam-pilot.html) calcula el modelo después de un examen expresamente terminado y muestra, debajo de las ganancias de cada banda, la topología/Q, 48 kHz asumidos, pico de respuesta compleja, norma L1 parcial, atenuación de **referencia digital** o bloqueo por presupuesto. El JSON descargado voluntariamente conserva los campos originales del EQ y añade `digitalReferenceModel` (o `digitalReferenceModelError`). No se crea un archivo de preset aplicable al dispositivo.

**El resultado clínico/archivado sigue siendo inconcluso**; no se guarda EQ como validado en catálogo V3 y el código Hear 2.0 oficial no cambia. El nuevo módulo se expone exclusivamente en el servidor de pruebas y se incluye en el manifiesto offline **optativo** de Hear 3.0.

## QA y ejemplos

`tests/hear3-eq-digital-transfer-model.test.mjs` verifica identidad neutra, ganancia nominal peaking en el centro, estabilidad, amplitud/fase de la cascada, muestra de respuesta en diferentes tasas, atenuación referencial, estrés digital con impulso, alternancia, seno, onda cuadrada y ruido determinista, rechazo por presupuesto excesivo, falsos estados clínicos, IDs/restricciones corruptos y señales no acotadas.

`tests/browser/hear3-eq-dsp-reference.spec.cjs` valida el módulo en Chromium/WebKit, modelos con 44,1/48/96 kHz, ausencia de habilitación automática y rechazo de señales fuera de límites. La regresión existente del examen se amplía para comprobar que el resumen describe de forma explícita el modelado digital y que la preamplificación física continúa **sin verificar**. Toda ejecución utiliza datos sintéticos o Web Audio emulado. La aprobación de CI no sustituye mediciones físicas.

## Pendientes imprescindibles para considerar EQ definitivo de producción

1. Identificar los **filtros exactos del dispositivo** (tipo de banda, Q, agrupación, ganancia/interacción, escala, pasos y sample rate real) o desarrollar una aplicación DSP propia autorizada; las transferencias a Spotify/otros reproductores o mandos de un coche no son controlables automáticamente solo desde esta página.
2. Certificar colas IIR y picos **entre muestras**, con pruebas de señales de duración real, resampling, formatos PCM y hardware. Medir clipping/THD y margen real mediante instrumentos; seleccionar límites por categoría de equipo según D-037/D-040.
3. Comparar esta política con alternativas usando evidencia de resultados perceptivos consentidos y dispositivos reales; verificar mejoría/utilidad y fallos antes de llamarla «definitiva».
4. Validar ruta L/R/Bluetooth, accesibilidad, adaptación a 2–31 controles, conversión a posiciones D-045/D-046 y undo/rollback con trazabilidad. Cumplir todas las auditorías y P0 pendientes D-063=C.

El backlog [#26](https://github.com/PoldKent/AudioCal-Hear/issues/26) mantiene el QA físico como responsabilidad técnica **sin exigir más pruebas del usuario**.

## Reversión

Revertir el PR elimina la simulación DSP y las menciones de headroom de referencia; la curva EQ subjetiva v1 sigue disponible para revisión con su JSON original. No hay datos V2/V3 afectados ni ajustes de volumen/dispositivos que revertir. La app oficial Hear 2.0 permanece sin modificaciones.
