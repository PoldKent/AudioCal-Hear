# Hear 3 · Cierre de software y optimización (25/11/2026)

## Estado comprobable

Aplicación pública: una sola experiencia de inicio → confirmación de volumen físico bajo → barrido de 20 segundos → tonos discretos → ecualizador experimental exportable. No se recuperan etapas obligatorias excluidas por la decisión de producto; no se aplica el EQ ni se altera el volumen físico del usuario.

La optimización de esta rama conserva los motores de audio, los límites digitales, el checkpoint, la selección correctiva de cualquier banda, el archivo original y los topes del EQ. Se modifica únicamente la capa de presentación y la caché estática.

### Cambios entregados en la PR

1. **Idiomas:** selectores de equipo y de frecuencias, controles de apariencia, exportaciones CSV/PNG, avisos dBFS y etiquetas accesibles traducidos directamente a los ocho idiomas declarados. Las unidades, IDs y ganancias no se traducen.
2. **Respuestas dinámicas:** los mensajes de barrido, confirmación de volumen bajo, cambios de salida, recuperación, guardado y modo offline usan el diccionario existente. La guía y el resumen del EQ se pueden actualizar tras cambiar de idioma sin recalcular los datos de audición.
3. **Accesibilidad básica verificable por navegador:** los progresos y regiones de EQ tienen nombres accesibles traducidos. El selector no cambia los valores internos de presets ni activa audio. Foco, parada inmediata y confirmación física de volumen siguen conservados.
4. **CPU/fluidez:** los repintados y lecturas completas de checkpoint durante inicio, preparación y resultados pasan de cada 250 ms a cada 1.250 ms, manteniendo cada 250 ms el seguimiento visual de barrido y tonos. No significa medición de batería o memoria sobre teléfonos físicos.
5. **Exportación:** la revocación de enlaces temporales de descarga se retrasa hasta 30 segundos para dar margen a navegadores móviles lentos.
6. **Offline:** se renueva la versión de caché estática a v16 en worker, cliente y pruebas; solo bajo consentimiento y sin datos personales.

## Criterios de aceptación por commit

- `npm run verify`: HTML principal idéntico a su fuente, tests Node e integridad del repositorio.
- `Hear 3.0 contracts`, `Static app integrity`, `AudioCal Hear 2.0 beta bundle` sin regresión.
- Cuatro matrices Playwright: Android Chromium, iPhone WebKit, escritorio 4:3 y 21:9.
- Comprobación explícita del selector de idioma de primera visita, etiquetas ARIA y confirmación de volumen antes de reproducción.
- La versión en `main` y la publicación GitHub Pages se confirman aparte después del merge.

## Pendientes reales que no es lícito declarar terminados

**Puerta D-063:** trece ensayos con equipos físicos, niveles acústicos dB SPL, separación L/R, Bluetooth, tratamiento de privacidad con muestras reales, accesibilidad WCAG 2.2 AA con lectores reales, respuesta del EQ/headroom/clipping, migración V2 real y reversión de producción.

**Software/investigación dependiente de evidencias externas:** verificación de fabricantes/modelos y escalas físicas, exactitud de curvas de EQ por oído, localización completa de todas las páginas técnicas secundarias. Los textos y errores de bajo nivel internos pueden seguir en español; esta entrega no es una traducción certificada de todo el repositorio.

**Regla de publicación:** mantener `stableReleaseClaim:false` sin falsear evidencias. La beta es utilizable como herramienta orientativa, no diagnóstico ni instrumento calibrado. Nunca pedir que alguien aumente el volumen físico para perseguir tonos inaudibles.

Referencias: [auditoría de producto #90](https://github.com/PoldKent/AudioCal-Hear/issues/90), [validación física #96](https://github.com/PoldKent/AudioCal-Hear/issues/96), [registro de decisiones #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).
