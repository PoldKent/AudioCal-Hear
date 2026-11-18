# Hear 3 · Ayuda contextual de errores (D-027) — 18/11/2026

## Entrega
Cuando una acción de la prueba falla, Hear conserva el mensaje de error original y ofrece un bloque desplegable «Ayuda para resolver este problema». No aparece durante una prueba normal y no tapa frecuencia, nivel digital ni los botones de interrupción.

Un clasificador puro y local reconoce problemas de ruta/volumen, reproducción Web Audio, copias de seguridad y distribución de bandas; ofrece pasos concretos y una opción general cuando no reconoce el problema. Las sugerencias nunca elevan el volumen físico, inician tonos, eluden el consentimiento de reanudación, reescriben un checkpoint, borran datos o hacen solicitudes de red. Las cadenas de error arbitrarias no se insertan en la guía. Los pasos se crean con `textContent`, no con HTML interpolado.

El código se mantiene idéntico entre la prueba integrada usada en QA y el examen oficial, evitando crear otro motor o una vista paralela. El recurso nuevo está en la allowlist del servidor QA y el modo offline opt-in v9.

## Validación de software
- pruebas Node sobre clasificación, inmutabilidad y ausencia de filtrado de nombres/IDs de excepción;
- Playwright en la pantalla pública: introducir frecuencias inválidas abre la ayuda solo tras fallo y sin iniciar sonidos;
- matriz completa de navegador y verificación de offline y archivos locales antes de merge.

## Limitaciones
La ayuda escrita es inicial y principalmente en español, al igual que otros formularios técnicos: no representa localización integral en ocho idiomas. No sustituye pruebas físicas, diagnóstico médico, dB SPL, guía de hardware con verificación de fabricante ni auditoría de accesibilidad con tecnologías asistivas. `stableReleaseClaim:false` permanece. Una guía no debe interpretarse como reparación automática del dispositivo.
