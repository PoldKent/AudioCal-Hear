# Hear 3.0 — D-039/D-040: banco reproducible de sensibilidad EQ e incertidumbre

**Fecha:** 05/11/2026. **Alcance:** complemento experimental al [estudio EQ inicial](17-p0-investigacion-eq.md); requisitos D-033/D-034/D-039/D-040/D-041/D-047/D-063 del [issue maestro #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Qué se ha implementado

`src/hear3/eq-research-benchmark.mjs` usa `compareHear3HypotheticalEqModels()` (global-median, local-neighbors, hybrid-prototype) sobre un corpus **completamente sintético** y determinista de siete bandas entre 125 y 8.000 Hz, sin perfiles ni respuestas reales. Cada modelo se evalúa con un caso base, un desplazamiento uniforme +1 dBFS y perturbaciones alternantes ±1 dBFS en bandas sucesivas. Los números obtenidos son **sensibilidad matemática**, no precisión audiométrica, preferencias perceptivas ni medición del ecualizador de un dispositivo.

Ocho escenarios incluidos:

1. Intervalos digitales planos.
2. Una banda central con contraste de detección digital.
3. Bandas altas con contraste digital.
4. Falta de evidencia en la banda central.
5. Intervalo excesivamente ancho en una banda.
6. Una sola banda con evidencia elegible.
7. Todas las bandas sin evidencia.
8. Variaciones abruptas alternadas entre bandas.

Cada candidato devuelve: número de bandas neutras/activas, realce nominal máximo hipotético, salto máximo entre ganancias contiguas, sensibilidad ante desplazamiento uniforme y ante perturbación alternante, y una **pre-amplificación ilustrativa de -máximo realce**. La pre-amplificación ilustrativa **no es un valor de seguridad autorizado**; filtros superpuestos, fase, suma de bandas, picos entre muestras y el equipo físico pueden crear picos por encima de esta aproximación, que por sí sola no evita clipping.

## Condiciones de integridad

- Los datos inconclusos y los intervalos demasiado amplios siguen neutros en cada candidato.
- Dos o más bandas observadas son necesarias para hipotetizar un contraste; con cero o una no se infiere EQ.
- Se comprueban límites experimentales de magnitud (±2, ±3 y ±4 dB) **solo como restricciones de investigación**, sin confundirlos con límites definitivos D-040.
- **Sin ganador automático**: el campo `chosenMethod` es `null` y `deployable` es `false`. No se crean `originalEq`, `currentEq`, presets de usuario ni bandas de corrección reales.
- El cálculo no modifica el estado ni solicita permisos/audio, no transmite nada y es independiente de la interfaz Hear 2.0.
- `tests/hear3-eq-research-benchmark.test.mjs` verifica reproducibilidad, neutralidad con evidencia faltante, controles de contraste, exposiciones de boost/headroom, límites hipotéticos y ausencia de selección o mejoras inventadas.

## Lo que falta para completar D-039/D-040/D-041

- Corpus de audición y equipos reales **con consentimiento**, validez de ruta, incertidumbre, contexto físico y límites acústicos; comparación objetiva y perceptiva con criterios predefinidos.
- Evaluación de filtros reales sobre datos de señal: respuesta de frecuencia compleja, sumatoria de biquads, saturación, clipping intersample, preamplificación y redondeo físico, en lugar de solo las ganancias nominales.
- Decidir la política y límites finales por clase de equipo, evidencias por banda, un único resultado EQ justificado con trazabilidad y comprobaciones opcionales; no dejar que números «más audibles» se conviertan automáticamente en afirmaciones de mejora.
- Validar L/R y output físico, accesibilidad, regresiones móviles, persistencia y reversión. La liberación estable D-063=C permanece bloqueada.

## Reversión

Revertir este PR elimina únicamente el benchmark y sus pruebas/documento. No cambia el motor Web Audio, modelos anteriores, almacenamiento de perfiles V2/V3 ni EQ oficial.
