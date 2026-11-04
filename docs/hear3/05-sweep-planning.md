# Hear 3.0 · Fase 2A — planificador preliminar del barrido

**Estado:** desarrollo experimental en rama independiente; no integrado al examen público, no calibrado y sin algoritmo final de EQ. Contrato: [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30), D-008, D-028–D-034, D-038, D-043 y D-063.

## Qué hace

- `src/hear3/sweep-planner.mjs` calcula posiciones de frecuencia para un barrido logarítmico, en un rango/tiempo validado, con control de Nyquist cuando se conoce la frecuencia de muestreo.
- Registra respuestas **explícitas** «lo escucho/no lo escucho», asociándolas a una frecuencia *estimada desde el tiempo del barrido*, sin tratarlas como umbrales auditivos.
- Detecta intervalos entre respuestas opuestas, sin inventar el instante ni la frecuencia exactos en que ocurrió el cambio.
- Mantiene inicialmente todas las frecuencias gráficas reales (2–31 bandas) en orden ascendente; propone candidatos posteriores para revisión adaptativa de intervalos cambiantes.
- Conserva las bandas fuera del barrido para comprobación discreta; **nunca** convierte observaciones del barrido en ganancia EQ, dB SPL o calibración del dispositivo.

## Limitaciones y seguridad

- El módulo **no reproduce audio**: la integración posterior debe usar un motor de tonos revisado con parada efectiva, límites digitales autorizados, trazabilidad e interrupciones seguras (D-006=A, D-037, D-054–D-057).
- Ni una observación subjetiva ni una fotografía del EQ prueban comportamiento físico del transductor; no se crean diagnósticos clínicos.
- El barrido orienta el orden y la planificación de tonos discretos; **no** los sustituye. D-004 exige consentimiento previo para repetición ante contradicciones.
- Duración y progresión logarítmica son propuestas técnicas **provisionales**; faltan pruebas comparativas y validación perceptiva.
- El diseño excluye música A/B, prueba adicional manual de sonoridad y generación automática PEQ.

## Comprobaciones

`node --test tests/hear3-sweep-planner.test.mjs` verifica orden, rangos y Nyquist, procedencia de respuestas, ausencia de umbrales inventados, límites de 2–31 bandas y datos faltantes.

La integración con audio real, las pruebas de navegador/hardware y la aceptación de los criterios P0 siguen pendientes de D-063.
