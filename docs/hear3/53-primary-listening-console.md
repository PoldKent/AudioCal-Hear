# Hear 3 · Panel principal de escucha

## La experiencia pública

El examen oficial mantiene **una sola aplicación** en `/hear3-exam/`. Al principio se presenta un panel claro con frecuencia, nivel digital, una acción principal contextual y dos respuestas de gran tamaño cuando hay un tono o barrido en reproducción.

El panel se adapta al estado real de los controles del motor original:

- Preparación: revisar y confirmar bandas, luego «Iniciar exploración».
- Barrido: marcar zonas percibidas o no percibidas y detener el sonido.
- Tonos: «Continuar con los tonos», «Reproducir el siguiente tono» y, al sonar, «Lo escucho» / «No lo escucho».
- Respuestas contradictorias: pedir comparar dos tonos; mostrar las cinco respuestas existentes sin falsas inferencias.
- Pausa y recuperación: reutilizar controles de reanudación y recuperación que ya comprueban el equipo y volumen físico.
- Fin del examen: «Terminar y ver mi EQ», seguido de «Ver mi ecualizador».

La señal de frecuencia y nivel está expresada como programa digital; **no** mide SPL, nivel real de un dispositivo ni seguridad acústica. La curva final sigue siendo una hipótesis provisional de uso manual.

## Ingeniería y privacidad

El panel `src/hear3/primary-listening-console.mjs` **no contiene AudioContext** ni reproduce sonido por sí mismo. Sus botones delegan acciones *solo cuando son pulsados* a los botones habilitados del motor de examen existente, sin omitir preflight, límites, consentimiento de comparación, protección de interrupción o comprobación de recuperación. Ninguna reacción del DOM o evento de estado dispara sonido ni escribe respuestas.

Los controles de la sección original permanecen accesibles como fallback para tecnologías asistivas y diagnósticos. El panel no persiste datos ni crea perfiles. La etapa visual «Mi EQ» ahora refleja una curva calculada real.

Para las visitas sin conexión se añade el módulo al manifiesto de recursos estáticos y se cambia la caché opt-in de v3 a v4. Ningún registro personal entra al caché.

## Validación

- `tests/hear3-primary-listening-console.test.mjs`: lógica pura de etapas, precedencias, confirmaciones y no autoplay.
- `tests/browser/hear3-primary-listening-console.spec.cjs`: recorrido de extremo a extremo de barrido, 20 respuestas, resultado y foco final mediante el panel real, sin escrituras de perfiles.
- `tests/hear3-guided-journey.test.mjs`: «Mi EQ» requiere una curva real.
- Suites y regresión de navegadores ya existentes permanecen obligatorias.

## Pendientes reales

No sustituye las pruebas acústicas físicas, límites SPL/headroom, rutas Bluetooth, validación de lectores de pantalla físicos, traducción de toda la interfaz ni D-063. El gate `stableReleaseClaim:false` permanece.
