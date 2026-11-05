# Hear 3.0 — D-021/D-022/D-058: indicación en vivo de barrido con reloj Web Audio

**Fecha:** 05/11/2026. **Estado:** piloto experimental; **no** prueba de calibración, presión sonora ni test validado. Referencia: [issue maestro D-021, D-022 y D-058](https://github.com/PoldKent/AudioCal-Hear/issues/30).

En `tests/fixtures/hear3-integrated-exam-pilot.html`, la exploración por barrido muestra ahora de manera destacada:

- **Frecuencia programada del barrido** en Hz, calculada con `frequencyAtSweepTime(plan, audioElapsedSeconds)` y la progresión logarítmica existente, no a partir de un cronómetro visual independiente. La frecuencia corresponde al plan de Web Audio, no a una medición de salida física.
- **Nivel de señal digital** en dBFS según la autorización y señal efectivamente pedidas al runner. Nunca se etiqueta como volumen acústico, dB SPL ni dosis de exposición.
- **Tiempo restante orientativo** y barra de avance, derivados de las marcas temporales del contexto Web Audio. Los marcadores se actualizan sin animaciones de alto costo ni nuevas fuentes de sonido.
- Indicadores repetidamente actualizados con `aria-live=off`, evitando anuncios excesivos del lector de pantalla cada 120 ms. El estado de reproducción por separado sigue disponible con semántica `role=status`; los números permanecen en texto y hay reglas `prefers-reduced-motion`.
- Al detener/interrumpir el barrido, los indicadores regresan a un estado «—» y no se habilita el examen de tonos. No se hace autoplay ni se registra respuesta ficticia.

`tests/browser/hear3-sweep-live-readout.spec.cjs` utiliza Web Audio simulado con tiempo controlado: verifica 125 Hz al inicio, 500 Hz al llegar a 10 segundos del barrido logarítmico de 125–2.000 Hz y 10 s restantes, parada sin examen, ausencia de audio espontáneo y presentación con movimiento reducido. Son regresiones de navegador, **no** ensayos físicos.

**Pendiente D-021:** accesibilidad final, posibilidad de volver a la pantalla anterior sin corromper respuestas, control de paradas y progreso en dispositivos reales y mediciones de latencia; también faltan controles contextuales de rutas L/R, revisión WCAG 2.2 AA y ensayo real de reducción de movimiento/tecnologías asistivas.

**Rollback:** revertir este PR restaura las etiquetas anteriores del barrido, sin cambiar el runner, niveles digitales, modelos EQ ni perfiles V2/V3. D-063=C continúa bloqueado hasta aceptar P0 y pruebas reales.
