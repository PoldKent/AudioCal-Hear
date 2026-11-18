# Hear 3 — corrección selectiva de frecuencia y depuración del motor (18/11/2026)

## Alcance implementado

- **D-021 (alcance controlado):** tras completar una banda, y **antes de contestar la siguiente**, el usuario puede elegir «Corregir la frecuencia anterior» en el examen o en la consola principal. La acción requiere una confirmación y no reproduce audio automáticamente.
- Las respuestas anteriores **no se eliminan ni se reescriben**; pasan a `audioSession.invalidatedToneIds` y se conservan con su procedencia original. En la revisión solo cuentan las nuevas observaciones.
- La búsqueda adaptativa y el EQ matemático descartan esas respuestas anuladas para calcular intervalos, confianza, límites de ensayos y ganancia; ambas fuentes verifican el historial original completo.
- La revisión está limitada a **una vez por banda**, solo en silencio, con sesión lista, sin cambios de ruta pendientes y sin respuestas ya tomadas en la siguiente frecuencia. Los límites digitales autorizados no cambian.
- Se impide volver a utilizar IDs de tonos antiguos o interrumpidos, incluso tras restauración, para evitar colisiones con callbacks de audio.
- Los checkpoints del examen que registran una corrección se recuperan **en silencio**, con confirmación de salida/volumen antes de reanudar. Se acepta el formato V1 de checkpoints sin marca `reviewedOnce`.
- Pruebas Node: estado puro, recuperación, conservación de evidencia y equivalencia del EQ corregido frente a datos sin revisiones; Playwright con Web Audio simulado y confirmación explícita.

## Restricciones y pendientes

Esta entrega **no** implementa revisión arbitraria de cualquier frecuencia histórica si ya se han respondido tonos de bandas posteriores. Para hacerlo con seguridad se necesitaría un modelo de revisiones no secuenciales y una auditoría de orden, concurrencia y persistencia más amplias. La opción se oculta cuando no es segura.

Tampoco resuelve la validez perceptiva/acústica del EQ, integración física L/R, OCR garantizado por modelo de dispositivo, calibración SPL, headroom, clipping entre muestras, auditoría WCAG 2.2 AA en dispositivos reales ni la puerta de publicación D-063. `stableReleaseClaim:false` se conserva.

## QA requerida para fusionar

`npm run verify`, `npm run test:browser` en las cuatro configuraciones, control de fuente/fixture idéntico, recuperación tras corrección, EQ limitado y sin autoplay, pruebas de regresión offline, importación/respaldos, contexto suspendido/Bluetooth simulado. No promover a estable con CI de navegador solamente.
