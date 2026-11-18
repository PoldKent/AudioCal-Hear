# Hear 3 · Primera aplicación de auditoría de UX premium (18/11/2026)

## Alcance aplicado en esta rama

Este lote implementa **la primera fase no destructiva** de la auditoría visual y de arquitectura de experiencia. Es una propuesta revisable; no declara completo el requisito D-063 de publicación estable.

- **Diseño compartido:** paleta clara/oscura de mayor consistencia, superficies, tarjetas, tipografía, jerarquía y estados de foco/hover, sin nuevas librerías ni fuentes externas. Mantiene reducción de movimiento y scroll horizontal para 2–31 bandas.
- **Móvil:** navegación superior en una fila desplazable, selector de idioma independiente y tamaños táctiles mantenidos; no se ocultan rutas.
- **Inicio:** instrucciones de tres etapas en un desplegable, sin eliminar contenido. Ajustes agrupados por apariencia, uso sin conexión, privacidad, respaldos, restauración y diagnósticos. No desaparecen el selector de tema ni los botones offline.
- **Examen:** la prohibición de interpretar el examen como audiometría, volumen físico bajo y aviso dBFS ≠ SPL permanecen visibles. La explicación ampliada queda en un desplegable. Se preservan el botón de detener, respuestas, etapas, scripts y el atajo Escape.
- **Ecualizador:** los formatos de exportación están en un menú plegable, **abierto por defecto** para conservar compatibilidad con pruebas y accesibilidad del flujo actual. Todos los controles y formatos continúan en el DOM. La estilización del EQ es transversal, sin alterar valores ni datos.
- **Idiomas:** ocho nuevas etiquetas de navegación contextual disponibles en las ocho traducciones principales; NO se afirma que todos los formularios técnicos estén traducidos.
- **Offline voluntario:** versión de caché estática v7 coherente en cliente y service worker, para actualizar recursos de diseño sin tocar resultados o fotos.
- **Pruebas estáticas nuevas:** conservación de rutas, controles, advertencias visibles, igualdad exacta de entrada y fuente, localización y responsive/reduced-motion.

## Invariantes explícitos

1. No modificar el motor Web Audio, algoritmos perceptivos, modelo matemático EQ ni aceptación de respuestas.
2. No reproducir automáticamente ningún sonido ni inferir niveles físicos seguros a partir de dBFS.
3. No mutar perfiles, checkpoints, resultados o claves de datos de Hear 2/3 durante navegación/tema/idioma.
4. Mantener importaciones, respaldos, borrado confirmado, edición reversible y exportación de curva visible.
5. No crear apps paralelas ni activar publicación estable: `stableReleaseClaim:false` sigue vigente.
6. No afirmar conformidad WCAG, seguridad acústica ni fluidez medida sin pruebas físicas y métricas.

## Validación requerida antes de fusionar

- `npm run check:build` (incluye igualdad de `src/hear3-entry.html` e `index.html`).
- `npm test` incluyendo `tests/hear3-premium-ux.test.mjs`.
- Playwright en Android Chromium, iPhone WebKit simulado, escritorio 4:3 y panorámico.
- Revisión visual en modo claro/oscuro, 320–390 px y anchuras mayores.
- Comprobar que la caché v7 es opt-in y no toca registros de usuario.
- Probar con teclado la navegación de menús `details` y el foco de controles.
- Validar restauración/descargas, interrupción y reanudación de examen sin cambiar su evidencia.

## Fuera de alcance / brechas pendientes

Esta PR **no** implementa retroceso selectivo a una frecuencia, síntesis de evidencia L/R verificada, validación del algoritmo EQ con corpus real, identificación fiable de equipos mediante foto, traducción técnica integral, auditoría WCAG 2.2 AA con tecnologías asistivas ni mediciones físicas de SPL/headroom. Se mantienen las brechas de `docs/hear3/56-product-gap-audit.md` y el gate D-063.

El objetivo es mejorar la experiencia sin confundir un pulido estético con validación acústica, ni ocultar funciones cuya seguridad o fidelidad todavía debe comprobarse.
