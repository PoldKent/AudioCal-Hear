# Hear 3.0 — P0: puntos de recuperación locales e integridad

**Decisiones:** [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30), D-051=D/C, D-054=D/C, D-059=D/C, D-060=D/C y D-063=D/C. **Estado:** módulo independiente para desarrollo, no integrado en la aplicación oficial.

## Implementado en esta primera iteración

- `src/hear3/local-checkpoint-store.mjs` almacena solo un punto de recuperación por ID de perfil, sin enviar información a ningún servidor.
- Guarda **dos copias alternas** y verifica la escritura por lectura de vuelta. Una suma de comprobación FNV-1a detecta alteraciones accidentales de un registro, **no es criptografía, cifrado, autenticación ni defensa contra manipulación maliciosa**.
- Un registro de examen en reproducción siempre se restaura como **pausado**, con el tono inacabado invalidado y comprobación de salida obligatoria; no reanuda sonidos automáticamente.
- Conserva observaciones directas verificables con `heard/not-heard` dentro de límites digitales; descarta por diseño fotos, imágenes y metadatos no incluidos en el esquema.
- Prioriza almacenamiento local del navegador; si falla, intenta `sessionStorage` cuando se permita. Si ninguna escritura puede verificarse, solo conserva una copia **volátil en memoria**, con advertencia y opción de exportar JSON.
- Si las copias persistidas están dañadas y ninguna se valida, **no las sobrescribe silenciosamente**. Permite seguir temporalmente con una nueva copia en memoria y exportarla.
- Permite borrar **solo** las claves de checkpoint del perfil seleccionado tras confirmación explícita, informa si alguna eliminación falla y no toca otros perfiles.

## Diferencias de durabilidad que deben aparecer en la UI futura

- `device-local`: escritura verificada en el navegador/dispositivo, no es almacenamiento permanente garantizado. El navegador puede borrar los datos.
- `tab-session`: escritura verificada en almacenamiento de sesión, pero puede perderse al cerrar; se debe recomendar exportación.
- `volatile`: solamente memoria de la aplicación; **no mostrar «guardado»** ni prometer recuperación tras cerrar.
- `none`: sin checkpoint reconocido.

## Pruebas automáticas

`node --test tests/hear3-local-checkpoint-store.test.mjs` cubre recuperación de copias válidas, daño intencional de la versión reciente, cuota de almacenamiento, privacidad, exportación temporal, falta de persistencia, exclusión de metadatos privados, eliminación selectiva y bloqueo de evidencia falsa.

## Lo que NO queda validado/completo

- No hay todavía integración del módulo en la UI ni una migración de resultados previos. No reemplaza el almacenamiento existente de Hear 2.0.
- No es un respaldo integral de dispositivos, perfiles ni historial D-051; exporta un checkpoint individual, **sin importación** todavía.
- No ofrece en esta fase un mecanismo transaccional entre pestañas simultáneas, sincronización en la nube, cifrado ni recuperación de datos manipulados maliciosamente.
- No implementa por sí solo offline ni garantiza que un navegador conserve datos. No activa telemetría ni procesamiento remoto.
- Pendientes: pruebas con cuotas y modo privado en navegadores reales, fallos de cierre forzado, recuperación multidispositivo, esquema de evolución, restauración completa, control de referencias compartidas y eliminación global.
- **D-063 sigue bloqueando la publicación estable** mientras falten P0 implementados y comprobados, pruebas reales, limitaciones y rollback.

La implementación del guardado local se habilitará para el flujo de Hear 3.0 solo después de completar las pruebas y revisar la integración segura.
