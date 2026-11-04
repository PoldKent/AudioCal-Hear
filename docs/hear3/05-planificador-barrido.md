# Hear 3.0 — Fase 2A: planificador de barrido (borrador técnico)

**Fecha:** 2026-11-04. **Fuente aprobada:** [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30), especialmente D-008, D-028 a D-034, D-038, D-043 y D-063.

## Qué implementa este incremento

- Una planificación preliminar del barrido de frecuencia logarítmico con rango y duración finitos y comprobación Nyquist cuando se proporciona la frecuencia de muestreo.
- Registro de respuestas explícitas «se escucha/no se escucha» a instantes ordenados del barrido, cuyo valor de frecuencia se deriva del reloj del plan.
- Identificación de **intervalos entre reportes de distinta percepción**. Son puntos candidatos para organizar comprobaciones posteriores, **no** medidas de umbral ni pruebas de respuesta acústica.
- Conservación de las bandas reales de un EQ gráfico de **2 a 31 bandas**, originalmente arbitrarias o personalizadas; el primer orden de pruebas es por frecuencia. Cada banda mantiene el requisito de confirmación individual.
- Recomendaciones de atención posterior sobre bandas dentro de intervalos de transición informados, sin elevar el peso de estos reportes a una estimación auditiva.

## Qué no implementa

- No genera ni reproduce señales acústicas, no controla amplitudes dBFS, volumen físico, seguridad SPL ni ruido ambiental.
- No convierte cambios reportados en umbrales, dB de EQ ni ganancias. La selección estadística de confianza y el motor final D-039–D-040 continúan pendientes de validación.
- No reemplaza los tonos individuales ni ejecuta el flujo de examen. No modifica el archivo `index.html`, el motor operativo de Hear 2.0 ni la UI pública.
- Las frecuencias fuera del tramo barrido se mantienen en el plan de confirmación; una zona de transición no demuestra una causa física, patología ni problema de hardware.

## Pruebas y criterios de aceptación

- Ocho pruebas Node para extremos del barrido, intervalo Nyquist, tiempos, ausencia de umbrales inventados, orden de bandas reales, duplicados, eventos inválidos y 31 bandas personalizadas.
- Se incorporan al patrón existente de `node --test tests/*.test.mjs` para que los workflows de GitHub las ejecuten durante el PR.
- La seguridad real del audio y la utilidad perceptiva se comprobarán en incrementos siguientes, sobre dispositivos representativos y con criterios medibles; no reclamar validación clínica ni acústica.
- PR separado contra `main`, posterior a la fusión de #31. Toda integración futura con Web Audio requiere pruebas de duración, parada, interrupciones, reanudación y conservación de evidencia conforme a D-063.

## Dependencias siguientes

- Motor de barrido audible con temporización basada en el reloj de audio y límites de nivel digital preautorizados (D-006=A, D-037).
- Interrupciones y reanudación manual desde el controlador de sesión; en una respuesta durante el barrido, el usuario no debe recibir pistas visuales sobre percepción.
- Algoritmo de planificación adaptativa y selección de frecuencias adicionales, con investigación reproducible y reglas para declarar datos inconclusos.
