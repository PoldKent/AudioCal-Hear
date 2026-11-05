# Hear 3.0 — D-039/D-040: primera comparación reproducible de EQ hipotético

**Fecha:** 2026-11-05. **Estado:** investigación interna, sin recomendaciones EQ públicas ni selección de algoritmo definitivo.

## Alcance

`src/hear3/eq-research-comparison.mjs` compara tres modelos exploratorios **solo** con intervalos subjetivos de detección digital como los que genera el prototipo de tonos. Esto no mide la respuesta acústica del equipo, el SPL en el oído ni la preferencia de sonoridad. Tampoco prueba qué ecualización será perceptible o agradable.

El formato de resultados es `hear3-hypothetical-eq-comparison-v1`, explícitamente `deployable:false`. No coincide con el esquema de EQ oficial `originalEq`/`currentEq` y no puede activarse automáticamente en la web pública. No se han fijado aún los límites finales D-040.

## Candidatos predefinidos de laboratorio

| Método | Hipótesis que compara | Pendiente / límite numérico experimental |
|---|---|---|
| `global-median` | Contraste de detección digital contra la mediana de bandas observadas | factor 0,30, tope ±2 dB |
| `local-neighbors` | Contraste frente a frecuencias observadas vecinas en escala logarítmica | factor 0,35, tope ±3 dB |
| `hybrid-prototype` | Promedio de contraste global y local | factor 0,40, tope ±4 dB |

**Ningún factor, límite o método está aprobado para producción.** El mayor cambio audible no es por sí solo prueba de mejor calidad. Los parámetros solo permiten comparar sensibilidad matemática y fallos de los modelos.

## Protección de datos y resultados

- Entrada: entre 2 y 31 bandas ordenadas, con ID único, frecuencia válida y un intervalo `notHeardAtDbfs < heardAtDbfs` procedente de respuestas. No hay importación directa de texto V2 o de estimaciones acústicas no verificadas.
- Bandas inconclusas, no observadas o con intervalos experimentales excesivamente anchos permanecen neutras. Si hay menos de dos bandas elegibles, todos los métodos devuelven cero.
- Métricas reproducibles: número de bandas neutras, no neutras, máxima ganancia hipotética, máximo realce positivo y mayor salto entre bandas contiguas.
- Rechazo de IDs duplicados, fuentes/estados no compatibles, frecuencias desordenadas e intervalos inválidos. No se mutan las observaciones originales.
- En resultados se declara expresamente `deployable:false`, sin ganador automático, sin corrección clínica ni autorización de ganancias.

## Corpus sintético de regresión

`tests/hear3-eq-research-comparison.test.mjs` revisa casos deterministas: perfil plano, banda de detección digital diferente, banda faltante, todo inconcluso, única banda observada, intervalo ancho, datos corruptos, límites y ausencia de mutación. Son **escenarios matemáticos ficticios**, no muestras de un oído ni ensayos en equipos reales.

## Antes de elegir una política D-039/D-040

1. Definir corpus adicional con evidencia controlada, incertidumbre, L/R y contradicciones, consentimiento y minimización; separar observación de simulación.
2. Comparar salidas con criterios explícitos de utilidad perceptiva, sensibilidad, clipping y headroom. Sin ensayos físicos/calibrados, **no** afirmar exactitud ni mejora audible.
3. Validar límites por dispositivo, corrección automática, preamplificación y trazabilidad D-041/D-047, y conservar bandas neutras sin evidencia.
4. Evaluar con el motor de tonos y dispositivos representativos, auditoría UX/accesibilidad y rollback antes de considerar un EQ real.

La puerta de lanzamiento estable D-063=C continúa abierta. No modifica la experiencia Hear 2.0 ni habilita un resultado Hear 3.0 clínicamente validado. Las decisiones D-001 a D-063 del [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30) conservan su prioridad y alcance.
