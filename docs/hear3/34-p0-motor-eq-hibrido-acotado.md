# Hear 3.0 — D-039/D-040/D-041/D-047: motor EQ acotado de contraste subjetivo v1

**05/11/2026 — Implementación algorítmica funcional y experimental, NO validación acústica de producción.** [Decisiones D-039 a D-041 del issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30). Esta política da salida numérica inmediatamente al terminar el examen; no depende de comparar canciones, usar micrófonos ni realizar pruebas físicas adicionales por parte del usuario.

## Política seleccionada para el piloto

`src/hear3/bounded-eq-engine.mjs` implementa y selecciona una única hipótesis `bounded-hybrid-subjective-contrast-v1` a partir de la investigación de mediana global, vecindad logarítmica y métodos híbridos previos. Este es un **compromiso de ingeniería reproducible**, no el ganador clínico/perceptivo demostrado por el benchmark sintético. Los criterios de selección práctica son: preservar datos insuficientes como neutros, no extrapolar niveles extremos, limitar sensibilidad a errores de respuestas individuales, conservar la fuente de cada banda y evitar cualquier aplicación automática sin conocer el equipo real.

Entrada obligatoria: **examen adaptativo completo**, sesión Web Audio de ese mismo perfil en estado `completed`, ningún tono activo, canal conjunto, intervalo de autorización digital idéntico y exactamente las mismas observaciones verificadas en ambas estructuras. Se vuelven a validar IDs únicos, frecuencias ascendentes (2–31 bandas de 20–20.000 Hz), canales, niveles digitales, respuestas explícitas, procedencia y coherencia del intervalo con las respuestas originales. Cualquier alteración o dato corrupto bloquea el cálculo; no se transforma automáticamente evidencia antigua V2 ni observaciones L/R sin la verificación física de D-035.

**Cálculo por banda con intervalo válido (amplitud ≤12 dBFS):**

- Calcular punto medio digital del intervalo entre `not-heard` y `heard` como **representación matemática de la respuesta**, nunca como umbral calibrado.
- Tomar la **mediana de puntos medios observados** para referencia relativa (no se calcula EQ si hay menos de dos).
- Calcular contraste global `midpoint - median` y, si existen vecinos observados suficientemente cercanos, un contraste local respecto a la interpolación logarítmica entre ellos. En extremos o separaciones de más de tres octavas, el contraste local utiliza la mediana, **sin extrapolar frecuencias**.
- Hipótesis híbrida `0.4 × (0.65 × contrasteGlobal + 0.35 × contrasteLocal)`, atenuada según ancho de intervalo (≤4: 1; ≤8: 0,75; ≤12: 0,5) y cantidad de respuestas (confianza media: 1; baja: 0,8). Estos coeficientes son **parámetros explícitos de investigación**, no amplitudes perceptivas calibradas ni equivalencia entre sensibilidad auditiva y curva de corrección.
- Redondeo a pasos de 0,5 dB. Topes matemáticos conservadores **de este piloto**, no límites de seguridad física validados: auriculares/aplicaciones/interfaces ±3 dB; altavoces y automóvil ±2 dB. El usuario no necesita configurar intensidad durante el examen.
- Con un intervalo inconcluso/contradictorio o demasiado ancho, ganancia **0 dB** y motivo explícito. Solo se permite una estimación pequeña (≤±1 dB, amortiguación ×0,5) para **una banda sin ninguna observación** entre vecinas inmediatas de confianza media, intervalos ≤6 dBFS, frecuencia derecha/izquierda ≤2,5 y diferencia de puntos medios ≤8 dBFS. De otro modo permanece neutra; la estimación nunca se presenta como observación real.
- Se emite **una sola curva conjunta** D-047 con trazabilidad, etiquetas de origen, datos observados vs estimados, conteo de bandas elegibles, topes, gains `originalEq`/`currentEq` iguales (aún no guardados en el catálogo) y advertencias por canal y equipo. No activa dos EQ por separado.

## Preamplificación, clipping y transferencia

Se muestra únicamente la **suma nominal de realces positivos**, un indicador matemático útil para priorizar revisión. `preamplificationDb:null`, `headroomVerified:false`, `clippingVerified:false`, `physicalRouteVerified:false`, `acousticCalibration:not-established`, `autoApplyAllowed:false`, `devicePositionConversionAllowed:false` y `validatedForProduction:false` **permanecen explícitos en el resultado**. No hay conversión física de una banda a un control del dispositivo ni se finge que el tope nominal o la suma positiva previenen intersample peaks, clipping, filtros con ganancia superpuesta o cambios de fase.

**No se aplica EQ a sonido en la web**, no se modifican presets de dispositivo y no se guarda un EQ como validado en el catálogo. El motor es ejecutable y numérico, pero su salida es una **hipótesis revisable**. La elección de una política numérica no acredita todavía el algoritmo EQ definitivo en producción conforme a D-039/D-040/D-063.

## Experiencia integrada

`tests/fixtures/hear3-integrated-exam-pilot.html` produce el resultado cuando el usuario pulsa **«Finalizar y ver resumen»** tras completar las bandas. Muestra por banda frecuencia, valor numérico y si se sustenta en intervalo subjetivo, estimación acotada o neutralidad. Permite descargar **voluntariamente** un JSON con metadatos de validación explícitos `hear3-eq-matematico-no-validado.json`. No hay descarga, envío o autoplay al terminar o recuperar el checkpoint. Cambiar tipo de equipo vuelve a calcular la política de topes y no conserva una previsualización de archivo anterior.

El guardado separado de respuestas históricas V3 existente sigue siendo `inconclusive` y conserva `originalEq:[]`, `currentEq:[]` hasta diseñar una transferencia segura y autorizada de ganancias experimentales. El origen Hear 2.0 queda intacto. Se incorpora el módulo al manifiesto offline **optativo** y al servidor de pruebas.

## QA automático

`tests/hear3-bounded-eq-engine.test.mjs` prueba constancia y ausencia de mutaciones, caso plano, contraste, cero/una banda, anchos excesivos, contradicciones, única interpolación justificada, varias familias y 2/4/5/7/10/15/31 bandas, equivalencia relativa ante desplazamiento digital y rechazo de 18 inconsistencias de identidad, estado, canal, rangos y registro Web Audio.

`tests/browser/hear3-bounded-eq-engine.spec.cjs` comprueba un examen completo simulado hasta EQ neutro, exportación explícita, ausencia de autoplay, cálculo de contraste acotado y no escritura de perfil o EQ sin autorización. Se exige además regresión completa Node, contratos, beta Hear 2.0 y navegador Android Chromium/iPhone WebKit/desktop 4:3 y 21:9. **Los mocks de Web Audio no reproducen físicamente sonido**.

## Pendiente antes de describirlo como definitivo validado

1. Calcular respuesta de filtros reales del EQ elegido, suma/fase/Q, picos entre muestras, preamp y clipping con señales reproducibles. Validar límites y distorsión por familia de dispositivo (D-040/D-045/D-046/D-062).
2. Construir un corpus de evaluación perceptiva real con incertidumbre/contradicciones y normas de selección definidas; confrontar el algoritmo con modelos alternativos y preferencias de usuarios sin exigir pruebas extra obligatorias al usuario (D-039).
3. Asegurar procedimiento por oído y salida L/R real, Bluetooth, altavoces, automóvil y variabilidad de dispositivos; completar auditorías físicas D-063.
4. Implementar persistencia auditada y reversible del EQ, conversión opcional a posiciones físicas solo con escala documentada o marcada provisional, y controles posteriores de edición original/vigente (D-041/D-045–D-050/D-051).
5. WCAG 2.2 AA y pruebas reales de privacidad, offline y recuperación. La app **no debe declararse Hear 3.0 estable** hasta cumplir D-063=C.

## Rollback

Revertir este PR retira el cálculo provisional y su sección/descarga; no borra perfiles V2, checkpoints V3 ni resultados previamente archivados. No se han producido cambios físicos ni se ha activado una salida EQ persistida. El histórico de investigación original se conserva.
