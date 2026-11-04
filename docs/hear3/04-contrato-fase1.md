# Hear 3.0 — Fase 1: contratos de sesión

**Aprobación global:** 4 de noviembre de 2026, issue #30. Estado: primer incremento aislado, no integrado en la aplicación pública.

El módulo `src/hear3/session-contract.mjs` es una máquina de estados pura, sin efectos acústicos. Registra respuestas, rechaza niveles digitales fuera de los límites de entrada autorizados, marca tonos interrumpidos como pendientes de comprobación, pausa en cambios de salida y exige confirmación de ruta y reanudación manual.

**Importante:** cambiar de estado NO detiene un oscilador real. El adaptador de audio deberá silenciarlo inmediatamente en respuesta, interrupción o cambio de salida y probarlo en navegadores/equipos representativos. dBFS NO es dB SPL y los límites del contrato no acreditan seguridad acústica.

Pruebas locales aisladas: 5/5 correctas (`node --test tests/hear3-session-contract.test.mjs`). Las comprobaciones completas del repositorio (`npm run verify`, Playwright y dispositivos) siguen sin verificarse.

Siguiente fase: conectar estos contratos al motor real tras implementar y revisar el adaptador de audio, sin cambiar el comportamiento oficial hasta superar las puertas de calidad.

Se preservan las 63 decisiones del issue #30 y las prioridades originales; D-001 sigue sin prioridad individual y D-002–007 mantienen prioridad P0 global del bloque 2. La publicación estable exige D-063=C.
