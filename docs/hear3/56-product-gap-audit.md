# Hear 3 · Auditoría de brechas frente a decisiones originales
**Fecha:** 18/11/2026. Contraste con [decisiones de producto #30](https://github.com/PoldKent/AudioCal-Hear/issues/30). Ningún requisito físico se marca «verificado» por una regresión de navegador.

## Correcciones implementadas en esta PR

| Decisión | Brecha comprobada en la aplicación pública | Corrección | Verificación |
| --- | --- | --- | --- |
| D-021 / D-022 / D-058 | La consola principal tenía lectura de frecuencia/nivel, respuestas y parada, pero el dibujo de frecuencia y el tiempo restante se encontraban separados de los controles principales, más abajo en el documento. | El mismo panel principal ahora muestra la onda digital orientativa, progreso y tiempo restante leyendo **los elementos temporales ya gestionados por el motor**, no un temporizador independiente. Se oculta cuando no hay reproducción; reducción de movimiento sigue respetada. No hay respuesta visual que revele si el usuario oye un tono. | Playwright simula el reloj de Web Audio y compara el panel con la lectura existente, el progreso y la interrupción. |
| D-050 | El EQ inmediatamente calculado solo permitía editar numéricamente y restaurar toda la curva: faltaban deshacer, rehacer y restauración puntual. | Historial local reversible y limitado en memoria, restauración de una banda desde su ganancia original y del conjunto completo, sin modificar umbrales ni almacenar sin confirmación. | Node para reversibilidad, originales inmutables y validaciones; navegador para edición y guía de banda. |
| D-050 / D-051 | El editor de EQ guardado tampoco permitía deshacer/rehacer cambios previos a confirmar. | Misma mecánica de historial visible en editor guardado. Mantiene la previsualización, revisión explícita y control de concurrencia ya existentes para guardar. | Playwright con resultado local real; evidencia almacenada permanece idéntica antes de confirmar. |
| D-049 / D-050 | El editor de perfiles permitía editar valores, pero sus exports TXT/CSV/JSON/PNG y copiar seguían sacando la **última curva guardada**, no lo que mostraba el gráfico en pantalla. | Todas las salidas usan ganancias actuales validadas en el gráfico; avisos de «cambios sin guardar» cuando corresponde; datos originales y catálogo persistente sin mutación. Las exportaciones de valores inválidos se bloquean, no silenciosamente se sustituyen por resultados antiguos. | Node compara borrador exportado y registro persistido; Playwright verifica descarga TXT/JSON con cambios visibles, undo y reset por banda. |
| D-060 | El recurso JavaScript nuevo no estaba en la copia sin conexión opt-in. | Actualización del manifiesto estático y caché de v5 a v6, sin datos personales ni fotos. | Pruebas del manifiesto, instalación voluntaria y navegación offline. |

## Gaps que siguen abiertos — no declarar versión 100 % terminada

| Requisito | Estado y razón |
| --- | --- |
| D-035 / D-047: mediciones L/R y síntesis conjunta | Existe verificación manual de canales y un único EQ conjunto desde las observaciones conjuntas. La integración completa de evidencia por ambos oídos al modelo conjunto, con compatibilidad real de cada ruta y seguridad física, requiere diseño y medición adicional; no atribuir datos de oído sin separación verificada. |
| D-039 / D-040 / D-041: precisión de ganancias | Hay un modelo acotado reproducible, pero no un modelo comparativamente demostrado con un corpus acústico/perceptivo real. Mantener un único EQ orientativo; no alterar coeficientes únicamente para simular mayor corrección. |
| D-044 / D-045 / D-048: reconocimiento y transferencia física | La foto local y la guía manual existen, pero reconocimiento OCR depende del navegador; falta correspondencia verificable por fabricante/modelo y conversión específica de escalas no documentadas. Nunca inventar posiciones físicas. |
| D-026 / D-058: ocho idiomas, accesibilidad | La navegación y el flujo principal tienen ocho idiomas. Formularios, diagnósticos y textos técnicos siguen parcialmente en español, con aviso público. WCAG 2.2 AA es un objetivo sin auditoría física completa ni pruebas asistivas exhaustivas. |
| D-021: volver a frecuencia anterior | Hay regreso seguro entre etapas y recuperación, pero no una acción del motor que elimine selectivamente un error de una sola frecuencia preservando rigurosamente todas las otras observaciones. Aún pendiente; no sustituirla por un botón que solo desplaza pantalla. |
| D-063: hardware/seguridad acústica | Faltan pruebas con equipos reales, rutas Bluetooth y auriculares, SPL, filtros, headroom e intersample clipping. Una prueba automatizada de Web Audio no mide la exposición física. `stableReleaseClaim:false` debe mantenerse. |

## Garantías de no regresión
Un solo sitio público, sin demos ni selector de versiones. Test integrado de barrido + tonos, sin A/B musical, sin micrófono ni segunda prueba obligatorios, 2–31 bandas, resultados y perfiles locales, exportación voluntaria, tono audible solo tras acción de usuario, botón Escape para detener y confirmación obligatoria de reanudación. No se reescribe el registro histórico de Hear 2 ni se envían datos por red.
