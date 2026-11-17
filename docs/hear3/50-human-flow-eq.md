# Hear 3 · examen → un único EQ útil (17/11/2026)

## Qué se entrega en el recorrido público
1. `/`: primera visita con acceso directo; una visita posterior identifica un perfil y dispositivo locales existentes y ofrece abrir el último EQ, sin reproducir audio ni leer datos de servidores.
2. `/hear3-exam/`: categoría de equipo, presets nominales 4/5/7/10/15/31 y personalización 2–31; dos configuraciones de referencia verificables por el usuario:
   - automóvil: 64, 160, 400, 1000, 2500, 6250 y 15625 Hz;
   - auriculares: 30, 60, 120, 250, 500, 1000, 2000, 4000, 8000 y 16000 Hz.
   Estas listas documentan referencias reales aportadas, **no son detección o calibración de dispositivos**.
3. Visual de frecuencia programada durante barrido y tonos. Gráfica ilustrativa, sin acceso al micrófono ni inferencia acústica; frecuencia, nivel digital y progreso siguen explícitos en texto.
4. Al finalizar la sesión validada por el motor, una única curva gráfica orientativa. Edición manual por banda en pasos de 0,5 dB, dentro del límite matemático de categoría, sin alterar registros de tonos.
5. Copiar y exportar la **curva actualmente visible** como TXT, CSV o PNG directamente, aunque todavía no esté guardada. La copia contiene advertencia de falta de calibración; el PNG no afirma SPL ni aplicación automática.
6. Para persistir cambios, primero archivar voluntariamente las respuestas y el EQ, con confirmaciones separadas; después `Guardar mis cambios al EQ` hace una edición revisionada con consentimiento explícito y control contra concurrencia mediante el editor del catálogo. Nunca reescribe el EQ original o evidencias. Los cambios sin archivar son solo temporales en esa pantalla.
7. El editor `/hear3-eq-editor/` puede abrir el resultado específico mediante `?result=` con identificador validado y presente en el catálogo. Regresar a Inicio muestra el equipo y último resultado disponible.

## Condiciones que no se deben romper
- Sin autoplay, captura de micrófono ni aplicación automática al DSP/equipo.
- Sin convertir dBFS en presión sonora ni prometer que un boost sea seguro.
- No sobrescribir `audiocal-hear-profiles-v1`, ni importar o crear datos sin consentimiento.
- Los controles de dispositivo son informativos salvo equivalencias documentadas; ninguna web estática controla Spotify, automóvil o hardware arbitrario.
- Los módulos de visualización están en caché estática offline solo si el usuario activa esa opción. Sin datos de mediciones en dicha caché.
- `stableReleaseClaim:false` no cambia por mejorar la presentación.

## Evidencia automatizada
- `tests/hear3-immediate-eq-result.test.mjs`: correspondencia de ganancias/CSV/TXT, rechazo de curva alterada y datos inconclusos honestos.
- `tests/hear3-digital-tone-visualizer.test.mjs`: waveform ilustrativo para distintas frecuencias y rechazo de datos imposibles.
- `tests/browser/hear3-primary-journey.spec.cjs`: flujo completo, copia de archivos sin archivar, edición posterior con confirmación y acceso por enlace profundo, preservando registros anteriores.
- Matriz WebKit/iPhone, Chromium/Android y pantallas de escritorio; **no prueba SPL, headroom físico ni altavoces reales**.

## Requisitos importantes que siguen abiertos
Reconocimiento fotográfico de EQ interoperable, localización completa a ocho idiomas, accesibilidad física con tecnología asistiva, algoritmo EQ físicamente validado, medidas reales SPL/headroom/rutas Bluetooth, migración histórica integral a un único modelo y D-063. Esta mejora es funcional en la experiencia de usuario, pero no constituye certificación del hardware ni conclusión de todos los P0.
